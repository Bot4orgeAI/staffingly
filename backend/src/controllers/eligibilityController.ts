import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import prisma from "../lib/prisma.js";
import { CoverageStatus } from "@prisma/client";
import {
  buildGatewayPatientId,
  normalizeEligibilityGatewayResponse,
  sendEligibilityVerification,
} from "../services/masterGatewayService.js";

interface CheckEligibilityBody {
  patientName?: string;
  dob?: string;
  memberId: string;
  payerId: string;
  payerName?: string;
  providerNpi?: string;
  serviceTypeCode?: string;
  serviceDate?: string;
  clientId?: string;
  patientId?: string;
  submissionType?: "manual" | "ocr" | "emr" | "bulk";
  emrType?: string;
}

interface EligibilityResult {
  success: boolean;
  coverageStatus?: string;
  planName?: string;
  planType?: string;
  networkStatus?: string;
  effectiveDate?: string | null;
  terminationDate?: string | null;
  groupNumber?: string | null;
  benefitsRaw?: unknown;
  confidenceScore?: number;
  responseTimeSeconds?: number;
  channelUsed?: string;
  flags?: string[];
  requiresHumanReview?: boolean;
  rawResponse?: unknown;
  error?: string;
}

interface GetHistoryQuery {
  clientId?: string;
  subscriberId?: string;
  memberId?: string;
  limit?: string;
  offset?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface HistoryWhereClause {
  clientId?: string;
  subscriberId?: string;
  memberId?: string;
}

export async function checkEligibility(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    patientName,
    dob,
    memberId,
    payerId,
    payerName,
    providerNpi,
    serviceTypeCode,
    serviceDate,
    clientId,
    patientId,
    submissionType,
    emrType,
  } = req.body as CheckEligibilityBody;

  const gatewayPatientId = buildGatewayPatientId({
    gatewayPatientId: patientId,
    patientName,
    dob,
    memberId,
  });
  const gatewayResponse = await sendEligibilityVerification({
    gatewayPatientId,
    patientName: patientName || "",
    dob: dob || "",
    payerId,
    memberId,
    providerNpi: providerNpi || "",
    serviceDate: serviceDate || "",
    serviceTypeCode: serviceTypeCode || "30",
    submissionType,
    emrType,
  });
  const result = normalizeEligibilityGatewayResponse(gatewayResponse) as unknown as EligibilityResult & {
    rawResponse?: unknown;
  };

  const checkRecord = await prisma.eligibilityCheck.create({
    data: {
      clientId: clientId || req.user?.clientId || "",
      gatewayPatientId,
      patientName: patientName || "",
      patientDob: dob
        ? new Date(dob.includes("/") ? dob.split("/").reverse().join("-") : dob)
        : null,
      memberId,
      payerId,
      payerName,
      providerNpi,
      serviceTypeCode,
      serviceDate: serviceDate ? new Date(serviceDate) : null,
      coverageStatus: result.success && result.coverageStatus
        ? (result.coverageStatus?.toUpperCase() as CoverageStatus)
        : null,
      planName: result.planName,
      planType: result.planType,
      networkStatus: result.networkStatus,
      effectiveDate: result.effectiveDate ? new Date(result.effectiveDate) : null,
      terminationDate: result.terminationDate ? new Date(result.terminationDate) : null,
      groupNumber: result.groupNumber,
      benefitsRaw: result.benefitsRaw ? JSON.stringify(result.benefitsRaw) : null,
      confidenceScore: result.confidenceScore,
      responseTimeSeconds: result.responseTimeSeconds,
      channelUsed: result.channelUsed,
      flags: result.flags || [],
      requiresHumanReview: result.requiresHumanReview || false,
      rawResponse: result.rawResponse ? JSON.stringify(result.rawResponse) : null,
      errorMessage: result.error,
      performedById: req.user?.userId,
    },
  });

  res.json({
    ...result,
    checkId: checkRecord.id,
    check_id: checkRecord.id,
    gatewayPatientId,
    gateway_patient_id: gatewayPatientId,
  });
}

export async function getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    clientId,
    subscriberId,
    memberId,
    limit = "50",
    offset = "0",
    sortBy,
    sortOrder = "desc",
  } = req.query as GetHistoryQuery;

  const where: HistoryWhereClause = {};
  if (clientId) where.clientId = clientId;
  if (subscriberId) where.subscriberId = subscriberId;
  if (memberId) where.memberId = memberId;

  if (req.user?.role === "CLIENT_USER" && req.user?.clientId && !clientId) {
    where.clientId = req.user.clientId;
  }

  const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.eligibilityHistory.findMany({
      where,
      orderBy,
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.eligibilityHistory.count({ where }),
  ]);

  res.json({ data: items, total });
}

export async function getById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const check = await prisma.eligibilityCheck.findUnique({
    where: { id },
    include: {
      client: true,
      performedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!check) {
    res.status(404).json({ error: "Eligibility check not found" });
    return;
  }

  res.json(check);
}

export async function createHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const history = await prisma.eligibilityHistory.create({
    data: req.body,
  });

  res.status(201).json(history);
}

export async function updateHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const history = await prisma.eligibilityHistory.update({
    where: { id },
    data: req.body,
  });

  res.json(history);
}
