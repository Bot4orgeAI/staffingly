import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import prisma from "../lib/prisma.js";
import { InvoiceStatus } from "@prisma/client";
import * as stripeService from "../services/stripeService.js";
import * as invoiceService from "../services/invoiceService.js";

interface CreateCustomerBody {
  clientId: string;
  clientName: string;
  billingEmail: string;
}

interface GetCardInfoBody {
  stripeCustomerId: string;
  clientId?: string;
}

interface ChargeInvoiceBody {
  invoiceId: string;
}

interface UpdateInvoiceBody {
  status?: InvoiceStatus;
  disputeReason?: string;
  disputeStatus?: string;
  disputeOpenedAt?: string;
}

interface SendCardUpdateLinkBody {
  clientId: string;
}

interface GetInvoicesQuery {
  clientId?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

interface GetProfilesQuery {
  clientId?: string;
  limit?: string;
  offset?: string;
}

interface GetCreditsQuery {
  clientId?: string;
  limit?: string;
  offset?: string;
}

interface GetAuditLogsQuery {
  clientId?: string;
  eventType?: string;
  limit?: string;
  offset?: string;
}

export async function createCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, clientName, billingEmail } = req.body as CreateCustomerBody;

  const customer = await stripeService.createCustomer({ clientId, clientName, billingEmail });

  await prisma.billingProfile.upsert({
    where: { clientId },
    update: { stripeCustomerId: customer.id },
    create: { clientId, stripeCustomerId: customer.id, billingContactEmail: billingEmail },
  });

  await prisma.billingAuditLog.create({
    data: {
      eventType: "stripe_customer_created",
      clientId,
      clientName,
      description: `Stripe customer created: ${customer.id}`,
      performedBy: req.user?.email || "system",
    },
  });

  res.json({ customerId: customer.id });
}

export async function getCardInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { stripeCustomerId, clientId } = req.body as GetCardInfoBody;

  const cardInfo = await stripeService.getCardInfo(stripeCustomerId);

  if (clientId && cardInfo) {
    await prisma.billingProfile.update({
      where: { clientId },
      data: {
        cardBrand: cardInfo.brand,
        cardLast4: cardInfo.last4,
        cardExpMonth: cardInfo.expMonth,
        cardExpYear: cardInfo.expYear,
      },
    });
  }

  res.json({ card: cardInfo });
}

export async function chargeInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { invoiceId } = req.body as ChargeInvoiceBody;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { include: { billingProfile: true } } },
  });

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const profile = invoice.client?.billingProfile;
  if (!profile?.stripeCustomerId) {
    res.status(404).json({ error: "No Stripe customer found" });
    return;
  }

  const amountInCents = Math.round(invoice.totalAmount * 100);

  const paymentIntent = await stripeService.chargeInvoice({
    stripeCustomerId: profile.stripeCustomerId,
    amountInCents,
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    invoiceId: invoice.id,
    clientId: invoice.clientId,
  });

  const now = new Date();

  if (paymentIntent.status === "succeeded") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", stripePaymentIntentId: paymentIntent.id, paidAt: now },
    });

    await prisma.billingAuditLog.create({
      data: {
        eventType: "invoice_paid",
        clientId: invoice.clientId,
        clientName: invoice.clientName,
        invoiceId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber} charged. PI: ${paymentIntent.id}`,
        performedBy: req.user?.email || "system",
      },
    });

    res.json({ success: true, paymentIntentId: paymentIntent.id });
  } else {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAYMENT_FAILED",
        paymentFailedAt: now,
        stripeErrorCode: paymentIntent.last_payment_error?.code || "unknown",
        stripeErrorMessage: paymentIntent.last_payment_error?.message || "Payment failed",
      },
    });

    res.json({ success: false, error: "Payment failed", status: paymentIntent.status });
  }
}

export async function sendCardUpdateLink(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId } = req.body as SendCardUpdateLinkBody;

  const profile = await prisma.billingProfile.findUnique({ where: { clientId } });

  if (!profile?.stripeCustomerId) {
    res.status(404).json({ error: "No Stripe customer found for this client" });
    return;
  }

  const session = await stripeService.createBillingPortalSession(profile.stripeCustomerId);

  await prisma.billingAuditLog.create({
    data: {
      eventType: "card_update_link_sent",
      clientId,
      description: "Card update link generated",
      performedBy: req.user?.email || "system",
    },
  });

  res.json({ url: session.url });
}

export async function generateInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await invoiceService.generateWeeklyInvoices(req.user?.email || "system");
  res.json(result);
}

export async function processDisputes(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await invoiceService.processDisputeWindowCharges();
  res.json(result);
}

export async function getInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, status, limit = "50", offset = "0" } = req.query as GetInvoicesQuery;

  const where: { clientId?: string; status?: InvoiceStatus } = {};
  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }
  if (status) where.status = status.toUpperCase() as InvoiceStatus;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: { client: true },
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({ invoices, total });
}

export async function getInvoiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: id as string },
    include: { client: { include: { billingProfile: true } }, credits: true },
  });

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  if (req.user?.role === "CLIENT_USER" && invoice.clientId !== req.user.clientId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(invoice);
}

export async function updateInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.body as UpdateInvoiceBody;

  const invoice = await prisma.invoice.findUnique({
    where: { id: id as string },
  });

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  if (req.user?.role === "CLIENT_USER") {
    if (invoice.clientId !== req.user.clientId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (body.status !== "DISPUTED") {
      res.status(403).json({ error: "Clients may only dispute invoices" });
      return;
    }
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: body.status,
      disputeReason: body.disputeReason,
      disputeStatus: body.disputeStatus,
      disputeOpenedAt: body.disputeOpenedAt ? new Date(body.disputeOpenedAt) : undefined,
    },
  });

  if (body.status === "DISPUTED") {
    await prisma.billingAuditLog.create({
      data: {
        eventType: "invoice_disputed",
        clientId: invoice.clientId,
        clientName: invoice.clientName,
        invoiceId: invoice.id,
        description: body.disputeReason || "Invoice marked as disputed",
        performedBy: req.user?.email || "system",
      },
    });
  }

  res.json(updatedInvoice);
}

export async function getProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, limit = "100", offset = "0" } = req.query as GetProfilesQuery;

  const where: { clientId?: string } = {};
  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }

  const [profiles, total] = await Promise.all([
    prisma.billingProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: { client: true, pricingPackage: true },
    }),
    prisma.billingProfile.count({ where }),
  ]);

  res.json({ data: profiles, total });
}

export async function getProfileById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const profile = await prisma.billingProfile.findUnique({
    where: { id: req.params.id as string },
    include: { client: true, pricingPackage: true },
  });

  if (!profile) {
    res.status(404).json({ error: "Billing profile not found" });
    return;
  }

  if (req.user?.role === "CLIENT_USER" && profile.clientId !== req.user.clientId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(profile);
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const profile = await prisma.billingProfile.update({
    where: { id: req.params.id as string },
    data: req.body,
  });

  res.json(profile);
}

export async function getCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, limit = "100", offset = "0" } = req.query as GetCreditsQuery;

  const where: { clientId?: string } = {};
  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }

  const [credits, total] = await Promise.all([
    prisma.billingCredit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.billingCredit.count({ where }),
  ]);

  res.json({ data: credits, total });
}

export async function createCredit(req: AuthenticatedRequest, res: Response): Promise<void> {
  const credit = await prisma.billingCredit.create({
    data: req.body,
  });

  res.status(201).json(credit);
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, eventType, limit = "100", offset = "0" } = req.query as GetAuditLogsQuery;

  const where: { clientId?: string; eventType?: string } = {};
  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }
  if (eventType) where.eventType = eventType;

  const [logs, total] = await Promise.all([
    prisma.billingAuditLog.findMany({
      where,
      orderBy: { performedAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.billingAuditLog.count({ where }),
  ]);

  res.json({ data: logs, total });
}

export async function createAuditLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = await prisma.billingAuditLog.create({
    data: req.body,
  });

  res.status(201).json(log);
}
