import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import { ClientStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";

interface GetClientsQuery {
  page?: string;
  limit?: string;
  status?: ClientStatus;
  search?: string;
}

interface ClientWhereInput {
  status?: ClientStatus;
  OR?: Array<{
    name?: { contains: string; mode: "insensitive" };
    practiceName?: { contains: string; mode: "insensitive" };
    contactEmail?: { contains: string; mode: "insensitive" };
  }>;
}

interface ListBrandingQuery {
  clientId?: string;
  limit?: string;
  offset?: string;
}

interface ListNotificationsQuery {
  clientId?: string;
  read?: string;
  limit?: string;
  offset?: string;
}

interface CreateClientBody {
  name: string;
  practiceName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  npi?: string;
  taxId?: string;
  emrSystem?: string;
  cloudStorageType?: string;
  subdomain?: string;
  verificationTriggers?: string;
  escalationRules?: string;
  reportingPreferences?: string;
  status?: ClientStatus;
}

interface UpdateClientBody {
  name?: string;
  practiceName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  npi?: string;
  taxId?: string;
  emrSystem?: string;
  cloudStorageType?: string;
  subdomain?: string;
  verificationTriggers?: string;
  escalationRules?: string;
  reportingPreferences?: string;
  status?: ClientStatus;
}

export const getClients = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page = "1", limit = "20", status, search } = req.query as GetClientsQuery;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: ClientWhereInput = {};

  if (status) {
    where.status = status as ClientStatus;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { practiceName: { contains: search, mode: "insensitive" } },
      { contactEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        billingProfile: true,
        storageConfig: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
            priorAuthCases: true,
            eligibilityChecks: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where }),
  ]);

  res.json({
    success: true,
    data: clients,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const getClientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      billingProfile: {
        include: {
          pricingPackage: true,
        },
      },
      storageConfig: true,
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          priorAuthCases: true,
          eligibilityChecks: true,
          invoices: true,
        },
      },
    },
  });

  if (!client) {
    res.status(404).json({
      success: false,
      message: "Client not found",
    });
    return;
  }

  res.json({
    success: true,
    data: client,
  });
};

export const createClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = req.body as CreateClientBody;

  const client = await prisma.client.create({
    data: {
      name: data.name,
      practiceName: data.practiceName,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      npi: data.npi,
      taxId: data.taxId,
      emrSystem: data.emrSystem,
      cloudStorageType: data.cloudStorageType,
      subdomain: data.subdomain,
      verificationTriggers: data.verificationTriggers,
      escalationRules: data.escalationRules,
      reportingPreferences: data.reportingPreferences,
      status: data.status || ClientStatus.ONBOARDING,
    },
    include: {
      billingProfile: true,
      storageConfig: true,
    },
  });

  res.status(201).json({
    success: true,
    data: client,
  });
};

export const updateClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const data = req.body as UpdateClientBody;

  const client = await prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      practiceName: data.practiceName,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      npi: data.npi,
      taxId: data.taxId,
      emrSystem: data.emrSystem,
      cloudStorageType: data.cloudStorageType,
      subdomain: data.subdomain,
      verificationTriggers: data.verificationTriggers,
      escalationRules: data.escalationRules,
      reportingPreferences: data.reportingPreferences,
      status: data.status,
    },
    include: {
      billingProfile: true,
      storageConfig: true,
    },
  });

  res.json({
    success: true,
    data: client,
  });
};

export const deleteClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.$transaction(async (tx) => {
    const priorAuthCases = await tx.priorAuthCase.findMany({
      where: { clientId: id },
      select: { id: true },
    });

    const priorAuthCaseIds = priorAuthCases.map((item) => item.id);

    if (priorAuthCaseIds.length > 0) {
      await tx.priorAuthActionResult.deleteMany({
        where: { caseId: { in: priorAuthCaseIds } },
      });

      await tx.priorAuthDocument.deleteMany({
        where: { caseId: { in: priorAuthCaseIds } },
      });
    }

    await tx.insuranceCardUpload.deleteMany({
      where: { clientId: id },
    });

    await tx.patient.deleteMany({
      where: { clientId: id },
    });

    await tx.priorAuthCase.deleteMany({
      where: { clientId: id },
    });

    await tx.eligibilityCheck.deleteMany({
      where: { clientId: id },
    });

    await tx.invoice.deleteMany({
      where: { clientId: id },
    });

    await tx.billingProfile.deleteMany({
      where: { clientId: id },
    });

    await tx.clientStorageConfig.deleteMany({
      where: { clientId: id },
    });

    await tx.unmatchedDocument.deleteMany({
      where: { clientId: id },
    });

    await tx.driveSyncLog.deleteMany({
      where: { clientId: id },
    });

    await tx.clientBranding.deleteMany({
      where: { clientId: id },
    });

    await tx.provider.deleteMany({
      where: { clientId: id },
    });

    await tx.subscriber.deleteMany({
      where: { clientId: id },
    });

    await tx.knowledgeBaseEntry.deleteMany({
      where: { clientId: id },
    });

    await tx.chatbotConversation.deleteMany({
      where: { clientId: id },
    });

    await tx.eligibilityHistory.deleteMany({
      where: { clientId: id },
    });

    await tx.caseMessage.deleteMany({
      where: { clientId: id },
    });

    await tx.billingCredit.deleteMany({
      where: { clientId: id },
    });

    await tx.automationJob.updateMany({
      where: { clientId: id },
      data: { clientId: null },
    });

    await tx.notification.updateMany({
      where: { clientId: id },
      data: { clientId: null },
    });

    await tx.user.updateMany({
      where: { clientId: id },
      data: { clientId: null },
    });

    await tx.client.delete({
      where: { id },
    });
  });

  res.json({
    success: true,
    message: "Client deleted successfully",
  });
};

// Client Branding
export const listBranding = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { clientId, limit = "100", offset = "0" } = req.query as ListBrandingQuery;

  const where: { clientId?: string } = {};
  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }

  const [items, total] = await Promise.all([
    prisma.clientBranding.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.clientBranding.count({ where }),
  ]);

  res.json({ data: items, total });
};

export const getBrandingById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const branding = await prisma.clientBranding.findUnique({
    where: { id },
  });

  if (!branding) {
    res.status(404).json({ error: "Branding not found" });
    return;
  }

  res.json(branding);
};

export const createBranding = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const branding = await prisma.clientBranding.create({
    data: req.body,
  });

  res.status(201).json(branding);
};

export const updateBranding = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const branding = await prisma.clientBranding.update({
    where: { id },
    data: req.body,
  });

  res.json(branding);
};

// Client Notifications
export const listNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { clientId, read, limit = "100", offset = "0" } = req.query as ListNotificationsQuery;

  const where: { clientId?: string; read?: boolean } = {};
  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }
  if (read !== undefined) where.read = read === "true";

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.notification.count({ where }),
  ]);

  res.json({ data: items, total });
};

export const createNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const notification = await prisma.notification.create({
    data: req.body,
  });

  res.status(201).json(notification);
};

export const updateNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params as { id: string };
  const notification = await prisma.notification.update({
    where: { id },
    data: req.body,
  });

  res.json(notification);
};
