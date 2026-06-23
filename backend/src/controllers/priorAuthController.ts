import type { Response } from "express";
import { CaseUrgency, PriorAuthStatus, Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  buildGatewayPatientId,
  normalizePriorAuthGatewayResponse,
  sendPriorAuthAction,
  type PriorAuthGatewayAction,
} from "../services/masterGatewayService.js";

interface GetCasesQuery {
  page?: string;
  limit?: string;
  status?: PriorAuthStatus;
  urgency?: CaseUrgency | string;
  clientId?: string;
  assignedSpecialistId?: string;
  search?: string;
}

interface ListDocumentsQuery {
  caseId?: string;
  clientId?: string;
  limit?: string;
  offset?: string;
}

interface ListMessagesQuery {
  caseId?: string;
  clientId?: string;
  readByClient?: string;
  limit?: string;
  offset?: string;
}

interface CreateCaseBody {
  clientId?: string;
  gatewayPatientId?: string;
  eligibilityCheckId?: string;
  patientName: string;
  patientInitials?: string;
  patientDob?: string;
  insuranceId?: string;
  payerName?: string;
  payerId?: string;
  serviceType?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
  requestingProvider?: string;
  requestingProviderNpi?: string;
  urgency?: CaseUrgency | string;
  status?: PriorAuthStatus;
  assignedSpecialistId?: string;
}

interface UpdateCaseBody {
  gatewayPatientId?: string;
  patientName?: string;
  patientInitials?: string;
  patientDob?: string;
  insuranceId?: string;
  payerName?: string;
  payerId?: string;
  serviceType?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
  requestingProvider?: string;
  requestingProviderNpi?: string;
  urgency?: CaseUrgency;
  status?: PriorAuthStatus;
  assignedSpecialistId?: string;
  eligibilityVerified?: boolean;
  denialReason?: string;
  authorizationNumber?: string;
  authValidFrom?: string;
  authValidTo?: string;
  submittedAt?: string;
  approvedAt?: string;
  deniedAt?: string;
  appealSubmittedAt?: string;
  appealDeadline?: string;
  appealLetter?: string;
  denialCode?: string;
  submissionMethod?: string;
  confirmationNumber?: string;
  covermymedsReference?: string;
  aiReviewResultJson?: string;
  aiConfidenceScore?: number;
  medicalNecessitySummary?: string;
  intakeNotes?: string;
  facilityName?: string;
  facilityNpi?: string;
  isMedicationPa?: boolean;
  medicationName?: string;
  ndcCode?: string;
  daysSupply?: string;
  quantityRequested?: string;
  pharmacyNpi?: string;
  stepTherapyConfirmed?: boolean;
  p2pPhysicianName?: string;
  p2pPhysicianNpi?: string;
  p2pReviewerName?: string;
  p2pScheduledAt?: string;
  p2pContactNumber?: string;
  p2pOutcome?: string;
}

interface UploadDocumentBody {
  documentType: string;
  fileName: string;
  fileUrl: string;
  checklistItemKey?: string;
}

interface CreateMessageBody {
  caseId: string;
  clientId?: string;
  message: string;
  [key: string]: unknown;
}

interface PriorAuthGatewayActionBody {
  action: PriorAuthGatewayAction;
  gatewayPatientId?: string;
  procedureName?: string;
  icd10?: string;
  extractedDocumentText?: string;
  denialReason?: string;
  denialCode?: string;
  appealDeadline?: string;
}

async function attachPriorAuthScores<
  T extends {
    eligibilityCheckId: string | null;
    insuranceId?: string | null;
    aiConfidenceScore?: number | null;
  },
>(
  records: T[]
): Promise<Array<T & { ai_confidence_score: number | null; aiConfidenceScore: number | null }>> {
  const eligibilityCheckIds = [
    ...new Set(
      records
        .map((record) => record.eligibilityCheckId)
        .filter((eligibilityCheckId): eligibilityCheckId is string => Boolean(eligibilityCheckId))
    ),
  ];

  const eligibilityChecks = eligibilityCheckIds.length
    ? await prisma.eligibilityCheck.findMany({
        where: {
          id: {
            in: eligibilityCheckIds,
          },
        },
        select: {
          id: true,
          confidenceScore: true,
        },
      })
    : [];

  const scoreByEligibilityId = new Map(
    eligibilityChecks.map((eligibilityCheck) => [
      eligibilityCheck.id,
      eligibilityCheck.confidenceScore ?? null,
    ])
  );

  const memberIds = [
    ...new Set(
      records
        .map((record) => record.insuranceId ?? null)
        .filter((insuranceId): insuranceId is string => Boolean(insuranceId))
    ),
  ];

  const eligibilityHistory = memberIds.length
    ? await prisma.eligibilityHistory.findMany({
        where: {
          memberId: {
            in: memberIds,
          },
        },
        select: {
          memberId: true,
          confidenceScore: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];

  const scoreByMemberId = new Map<string, number | null>();
  for (const historyRecord of eligibilityHistory) {
    if (!historyRecord.memberId || scoreByMemberId.has(historyRecord.memberId)) {
      continue;
    }
    scoreByMemberId.set(historyRecord.memberId, historyRecord.confidenceScore ?? null);
  }

  return records.map((record) => {
    const eligibilityScore = record.eligibilityCheckId
      ? (scoreByEligibilityId.get(record.eligibilityCheckId) ?? null)
      : null;
    const historyScore = record.insuranceId
      ? (scoreByMemberId.get(record.insuranceId) ?? null)
      : null;
    const score = record.aiConfidenceScore ?? eligibilityScore ?? historyScore ?? null;

    return {
      ...record,
      ai_confidence_score: score,
      aiConfidenceScore: score,
    };
  });
}

async function ensureClientCaseAccess(req: AuthenticatedRequest, caseId: string): Promise<boolean> {
  if (req.user?.role !== "CLIENT_USER" || !req.user.clientId) {
    return true;
  }

  const priorAuthCase = await prisma.priorAuthCase.findUnique({
    where: { id: caseId },
    select: { clientId: true },
  });

  return Boolean(priorAuthCase && priorAuthCase.clientId === req.user.clientId);
}

export const getCases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    page = "1",
    limit = "20",
    status,
    urgency,
    clientId,
    assignedSpecialistId,
    search,
  } = req.query as GetCasesQuery;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.PriorAuthCaseWhereInput = {};

  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }

  if (status) {
    where.status = status;
  }

  if (urgency) {
    where.urgency = normalizeCaseUrgency(urgency);
  }

  if (assignedSpecialistId) {
    where.assignedSpecialistId = assignedSpecialistId;
  }

  if (search) {
    where.OR = [
      { caseNumber: { contains: search, mode: "insensitive" } },
      { patientName: { contains: search, mode: "insensitive" } },
      { payerName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [cases, total] = await Promise.all([
    prisma.priorAuthCase.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedSpecialist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            documents: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.priorAuthCase.count({ where }),
  ]);

  const casesWithScores = await attachPriorAuthScores(cases);

  res.json({
    success: true,
    data: casesWithScores,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const getCaseById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const priorAuthCase = await prisma.priorAuthCase.findUnique({
    where: { id },
    include: {
      client: true,
      assignedSpecialist: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      actionResults: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!priorAuthCase) {
    res.status(404).json({
      success: false,
      message: "Prior auth case not found",
    });
    return;
  }

  // Check access
  if (req.user?.role === "CLIENT_USER" && priorAuthCase.clientId !== req.user.clientId) {
    res.status(403).json({
      success: false,
      message: "Access denied",
    });
    return;
  }

  const [priorAuthCaseWithScore] = await attachPriorAuthScores([priorAuthCase]);

  res.json({
    success: true,
    data: priorAuthCaseWithScore,
  });
};

const VALID_STATUSES = Object.values(PriorAuthStatus);

const STATUS_LABEL_TO_ENUM: Record<string, PriorAuthStatus> = {
  New: PriorAuthStatus.INTAKE,
  "In Progress": PriorAuthStatus.INTAKE,
  "Awaiting Documents": PriorAuthStatus.PENDING_DOCUMENTS,
  "Awaiting AI Review": PriorAuthStatus.PENDING_DOCUMENTS,
  "Pending Supervisor Approval": PriorAuthStatus.READY_FOR_SUBMISSION,
  Submitted: PriorAuthStatus.SUBMITTED,
  Approved: PriorAuthStatus.APPROVED,
  Denied: PriorAuthStatus.DENIED,
  "Appeal In Progress": PriorAuthStatus.APPEAL_IN_PROGRESS,
  "Peer To Peer Requested": PriorAuthStatus.PEER_TO_PEER_REQUESTED,
  Closed: PriorAuthStatus.CLOSED,
};

function normalizePriorAuthStatus(status?: string | null): PriorAuthStatus | undefined {
  if (!status) return undefined;
  if (VALID_STATUSES.includes(status as PriorAuthStatus)) return status as PriorAuthStatus;
  return STATUS_LABEL_TO_ENUM[status];
}

function normalizeCaseUrgency(urgency?: string | null): CaseUrgency | undefined {
  if (!urgency) return undefined;
  if (urgency === "Routine") return CaseUrgency.ROUTINE;
  if (urgency === "Urgent") return CaseUrgency.URGENT;
  if (Object.values(CaseUrgency).includes(urgency as CaseUrgency)) return urgency as CaseUrgency;
  return undefined;
}

function parseOptionalDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function stringifyJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function parseJsonRecord(value?: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function buildGatewayCaseUpdates(
  action: PriorAuthGatewayAction,
  normalized: Record<string, unknown>,
  requestedDenialReason?: string
): Prisma.PriorAuthCaseUpdateInput {
  const updates: Prisma.PriorAuthCaseUpdateInput = {};
  const confirmationNumber =
    typeof normalized.confirmationNumber === "string" ? normalized.confirmationNumber : undefined;
  const appealLetter =
    typeof normalized.appealLetter === "string" ? normalized.appealLetter : undefined;
  const medicalNecessitySummary =
    typeof normalized.medicalNecessitySummary === "string"
      ? normalized.medicalNecessitySummary
      : undefined;
  const confidenceScore =
    typeof normalized.confidenceScore === "number" ? normalized.confidenceScore : undefined;

  if (action === "run_ai_review") {
    updates.aiReviewResultJson = JSON.stringify({
      checklistItems: normalized.checklistItems || [],
      missingItems: normalized.missingItems || [],
      confidenceScore: confidenceScore ?? null,
      medicalNecessitySummary: medicalNecessitySummary || null,
    });
    if (confidenceScore !== undefined) updates.aiConfidenceScore = confidenceScore;
    if (medicalNecessitySummary) updates.medicalNecessitySummary = medicalNecessitySummary;
    updates.status = PriorAuthStatus.PENDING_DOCUMENTS;
  }

  if (action === "submit_to_cmm") {
    if (confirmationNumber) updates.confirmationNumber = confirmationNumber;
    updates.submittedAt = new Date();
    updates.status = PriorAuthStatus.SUBMITTED;
  }

  if (action === "save_denial") {
    if (requestedDenialReason) updates.denialReason = requestedDenialReason;
    updates.deniedAt = new Date();
    updates.status = PriorAuthStatus.DENIED;
  }

  if (action === "draft_appeal") {
    if (appealLetter) updates.appealLetter = appealLetter;
    updates.status = PriorAuthStatus.APPEAL_IN_PROGRESS;
  }

  return updates;
}

export const createCase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = req.body as CreateCaseBody;

  // Validate clientId is provided
  const clientId = data.clientId || req.user?.clientId;
  if (!clientId) {
    res.status(400).json({ success: false, error: "clientId is required" });
    return;
  }

  // Generate case number
  const count = await prisma.priorAuthCase.count();
  const caseNumber = `PA-${String(count + 1).padStart(6, "0")}`;

  const status = normalizePriorAuthStatus(data.status) || PriorAuthStatus.INTAKE;

  let gatewayPatientId = data.gatewayPatientId;
  if (!gatewayPatientId && data.eligibilityCheckId) {
    const eligibilityCheck = await prisma.eligibilityCheck.findUnique({
      where: { id: data.eligibilityCheckId },
      select: { gatewayPatientId: true },
    });
    gatewayPatientId = eligibilityCheck?.gatewayPatientId || undefined;
  }

  if (!gatewayPatientId) {
    gatewayPatientId = buildGatewayPatientId({
      patientName: data.patientName,
      dob: data.patientDob,
      memberId: data.insuranceId,
    });
  }

  const priorAuthCase = await prisma.priorAuthCase.create({
    data: {
      caseNumber,
      clientId,
      gatewayPatientId,
      patientName: data.patientName,
      patientInitials: data.patientInitials,
      patientDob: data.patientDob ? new Date(data.patientDob) : null,
      insuranceId: data.insuranceId,
      payerName: data.payerName,
      payerId: data.payerId,
      serviceType: data.serviceType,
      diagnosisCodes: data.diagnosisCodes || [],
      procedureCodes: data.procedureCodes || [],
      requestingProvider: data.requestingProvider,
      requestingProviderNpi: data.requestingProviderNpi,
      urgency: normalizeCaseUrgency(data.urgency) || CaseUrgency.ROUTINE,
      status,
      assignedSpecialistId: data.assignedSpecialistId,
      eligibilityCheckId: data.eligibilityCheckId,
    },
    include: {
      client: true,
      assignedSpecialist: true,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      ...priorAuthCase,
      ai_confidence_score: null,
      aiConfidenceScore: null,
    },
  });
};

export const updateCase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const data = req.body as UpdateCaseBody;

  const priorAuthCase = await prisma.priorAuthCase.update({
    where: { id },
    data: {
      gatewayPatientId: data.gatewayPatientId,
      patientName: data.patientName,
      patientInitials: data.patientInitials,
      patientDob: data.patientDob ? new Date(data.patientDob) : undefined,
      insuranceId: data.insuranceId,
      payerName: data.payerName,
      payerId: data.payerId,
      serviceType: data.serviceType,
      diagnosisCodes: data.diagnosisCodes,
      procedureCodes: data.procedureCodes,
      requestingProvider: data.requestingProvider,
      requestingProviderNpi: data.requestingProviderNpi,
      urgency: normalizeCaseUrgency(data.urgency),
      status: normalizePriorAuthStatus(data.status),
      appealDeadline: parseOptionalDate(data.appealDeadline),
      appealLetter: data.appealLetter,
      denialCode: data.denialCode,
      submissionMethod: data.submissionMethod,
      confirmationNumber: data.confirmationNumber,
      covermymedsReference: data.covermymedsReference,
      aiReviewResultJson: data.aiReviewResultJson,
      aiConfidenceScore: data.aiConfidenceScore,
      medicalNecessitySummary: data.medicalNecessitySummary,
      intakeNotes: data.intakeNotes,
      facilityName: data.facilityName,
      facilityNpi: data.facilityNpi,
      isMedicationPa: data.isMedicationPa,
      medicationName: data.medicationName,
      ndcCode: data.ndcCode,
      daysSupply: data.daysSupply,
      quantityRequested: data.quantityRequested,
      pharmacyNpi: data.pharmacyNpi,
      stepTherapyConfirmed: data.stepTherapyConfirmed,
      p2pPhysicianName: data.p2pPhysicianName,
      p2pPhysicianNpi: data.p2pPhysicianNpi,
      p2pReviewerName: data.p2pReviewerName,
      p2pScheduledAt: parseOptionalDate(data.p2pScheduledAt),
      p2pContactNumber: data.p2pContactNumber,
      p2pOutcome: data.p2pOutcome,
      assignedSpecialistId: data.assignedSpecialistId,
      eligibilityVerified: data.eligibilityVerified,
      denialReason: data.denialReason,
      authorizationNumber: data.authorizationNumber,
      authValidFrom: parseOptionalDate(data.authValidFrom),
      authValidTo: parseOptionalDate(data.authValidTo),
      submittedAt: parseOptionalDate(data.submittedAt),
      approvedAt: parseOptionalDate(data.approvedAt),
      deniedAt: parseOptionalDate(data.deniedAt),
      appealSubmittedAt: parseOptionalDate(data.appealSubmittedAt),
    },
    include: {
      client: true,
      assignedSpecialist: true,
      documents: true,
    },
  });

  const [priorAuthCaseWithScore] = await attachPriorAuthScores([priorAuthCase]);

  res.json({
    success: true,
    data: priorAuthCaseWithScore,
  });
};

export const triggerGatewayAction = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params as { id: string };
  const body = req.body as PriorAuthGatewayActionBody;

  const priorAuthCase = await prisma.priorAuthCase.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          practiceName: true,
          escalationRules: true,
          reportingPreferences: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!priorAuthCase) {
    res.status(404).json({ success: false, message: "Prior auth case not found" });
    return;
  }

  if (!(await ensureClientCaseAccess(req, id))) {
    res.status(403).json({ success: false, message: "Access denied" });
    return;
  }

  const gatewayPatientId =
    body.gatewayPatientId ||
    priorAuthCase.gatewayPatientId ||
    buildGatewayPatientId({
      patientName: priorAuthCase.patientName,
      dob: priorAuthCase.patientDob?.toISOString().slice(0, 10),
      memberId: priorAuthCase.insuranceId,
    });

  const extractedDocumentText =
    body.extractedDocumentText ||
    priorAuthCase.documents
      .map((document) => `${document.documentType}: ${document.fileName}`)
      .join("\n");

  const [eligibilityCheck, payerRule] = await Promise.all([
    priorAuthCase.eligibilityCheckId
      ? prisma.eligibilityCheck.findUnique({
          where: { id: priorAuthCase.eligibilityCheckId },
          select: {
            id: true,
            coverageStatus: true,
            confidenceScore: true,
            requiresHumanReview: true,
            flags: true,
            serviceDate: true,
            serviceTypeCode: true,
            rawResponse: true,
          },
        })
      : Promise.resolve(null),
    prisma.payerRule.findFirst({
      where: {
        OR: [
          priorAuthCase.payerId ? { payerId: priorAuthCase.payerId } : undefined,
          priorAuthCase.payerName
            ? { payerName: { contains: priorAuthCase.payerName, mode: "insensitive" } }
            : undefined,
        ].filter(Boolean) as Prisma.PayerRuleWhereInput[],
      },
      orderBy: [{ payerId: "desc" }, { payerName: "asc" }],
    }),
  ]);

  const parsedEligibilityRaw = parseJsonRecord(eligibilityCheck?.rawResponse);
  const eligibilityPayload =
    parsedEligibilityRaw && typeof parsedEligibilityRaw === "object"
      ? ((parsedEligibilityRaw as Record<string, unknown>).data as Record<string, unknown>) ||
        (parsedEligibilityRaw as Record<string, unknown>)
      : null;
  const priorAuthRequired =
    typeof eligibilityPayload?.priorAuthRequired === "boolean"
      ? eligibilityPayload.priorAuthRequired
      : typeof eligibilityPayload?.prior_auth_required === "boolean"
        ? eligibilityPayload.prior_auth_required
        : null;

  const gatewayRequest = {
    gatewayPatientId,
    caseId: priorAuthCase.caseNumber || priorAuthCase.id,
    action: body.action,
    eligibilityCheckId: priorAuthCase.eligibilityCheckId,
    patientName: priorAuthCase.patientName,
    patientDob: priorAuthCase.patientDob?.toISOString().slice(0, 10),
    memberId: priorAuthCase.insuranceId,
    payerName: priorAuthCase.payerName,
    payerId: priorAuthCase.payerId,
    coverageStatus: eligibilityCheck?.coverageStatus || null,
    priorAuthRequired,
    providerNpi: priorAuthCase.requestingProviderNpi,
    requestingProvider: priorAuthCase.requestingProvider,
    requestingProviderNpi: priorAuthCase.requestingProviderNpi,
    serviceDate: eligibilityCheck?.serviceDate?.toISOString().slice(0, 10) || "",
    serviceType: priorAuthCase.serviceType,
    procedureCodes: priorAuthCase.procedureCodes || [],
    diagnosisCodes: priorAuthCase.diagnosisCodes || [],
    urgency: priorAuthCase.urgency,
    submissionMethod: priorAuthCase.submissionMethod || payerRule?.submissionMethod || "",
    payerRule: payerRule
      ? {
          id: payerRule.id,
          payerName: payerRule.payerName,
          payerId: payerRule.payerId,
          serviceType: payerRule.serviceType,
          requiresPriorAuth: payerRule.requiresPriorAuth,
          submissionMethod: payerRule.submissionMethod,
          portalUrl: payerRule.portalUrl,
          phoneNumber: payerRule.phoneNumber,
          faxNumber: payerRule.faxNumber,
          turnaroundDays: payerRule.turnaroundDays,
          requiredDocuments: payerRule.requiredDocuments,
          automationSupported: payerRule.automationSupported,
          notes: payerRule.notes,
        }
      : null,
    documents: priorAuthCase.documents.map((document) => ({
      id: document.id,
      documentType: document.documentType,
      checklistItemKey: document.checklistItemKey,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      status: document.status,
      aiClassification: document.aiClassification,
      aiExtractedData: parseJsonRecord(document.aiExtractedDataJson),
    })),
    clientContext: {
      clientId: priorAuthCase.clientId,
      clientName: priorAuthCase.client?.name || "",
      practiceName: priorAuthCase.client?.practiceName || "",
      escalationRules: priorAuthCase.client?.escalationRules || "",
      reportingPreferences: priorAuthCase.client?.reportingPreferences || "",
      eligibilityConfidenceScore: eligibilityCheck?.confidenceScore ?? null,
      eligibilityRequiresHumanReview: eligibilityCheck?.requiresHumanReview ?? false,
      eligibilityFlags: eligibilityCheck?.flags || [],
    },
    procedureName: body.procedureName || priorAuthCase.serviceType || "",
    icd10: body.icd10 || priorAuthCase.diagnosisCodes?.[0] || "",
    extractedDocumentText,
    denialReason: body.denialReason || priorAuthCase.denialReason || "",
    denialCode: body.denialCode || priorAuthCase.denialCode || "",
    appealDeadline:
      body.appealDeadline || priorAuthCase.appealDeadline?.toISOString().slice(0, 10) || "",
  };

  let gatewayResponse: unknown;
  let normalizedResponse: Record<string, unknown>;

  try {
    gatewayResponse = await sendPriorAuthAction(gatewayRequest);
    normalizedResponse = normalizePriorAuthGatewayResponse(gatewayResponse);
  } catch (error) {
    const message = (error as Error).message || "Prior authorization gateway action failed";
    const actionResult = await prisma.priorAuthActionResult.create({
      data: {
        caseId: priorAuthCase.id,
        clientId: priorAuthCase.clientId,
        gatewayPatientId,
        action: body.action,
        status: "error",
        errorMessage: message,
        performedById: req.user?.userId,
      },
    });

    res.status(502).json({
      success: false,
      error: message,
      data: {
        action: body.action,
        gatewayPatientId,
        actionResult,
      },
    });
    return;
  }

  const actionResult = await prisma.priorAuthActionResult.create({
    data: {
      caseId: priorAuthCase.id,
      clientId: priorAuthCase.clientId,
      gatewayPatientId,
      action: body.action,
      status: typeof normalizedResponse.status === "string" ? normalizedResponse.status : null,
      message: typeof normalizedResponse.message === "string" ? normalizedResponse.message : null,
      confirmationNumber:
        typeof normalizedResponse.confirmationNumber === "string"
          ? normalizedResponse.confirmationNumber
          : null,
      appealLetter:
        typeof normalizedResponse.appealLetter === "string" ? normalizedResponse.appealLetter : null,
      checklistItemsJson: stringifyJson(
        normalizedResponse.checklistItems
      ),
      missingItemsJson: stringifyJson(
        normalizedResponse.missingItems
      ),
      confidenceScore:
        typeof normalizedResponse.confidenceScore === "number"
          ? normalizedResponse.confidenceScore
          : null,
      medicalNecessitySummary:
        typeof normalizedResponse.medicalNecessitySummary === "string"
          ? normalizedResponse.medicalNecessitySummary
          : null,
      rawResponse: stringifyJson(gatewayResponse),
      errorMessage: typeof normalizedResponse.error === "string" ? normalizedResponse.error : null,
      performedById: req.user?.userId,
    },
  });

  const updatedCase = await prisma.priorAuthCase.update({
    where: { id },
    data: {
      gatewayPatientId,
      ...buildGatewayCaseUpdates(body.action, normalizedResponse, body.denialReason),
    },
    include: {
      client: true,
      assignedSpecialist: true,
      documents: true,
      actionResults: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  res.json({
    success: true,
    data: {
      action: body.action,
      gatewayPatientId,
      gatewayResponse: normalizedResponse,
      actionResult,
      priorAuthCase: updatedCase,
    },
  });
};

export const deleteCase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.$transaction(async (tx) => {
    await tx.priorAuthActionResult.deleteMany({
      where: { caseId: id },
    });

    await tx.priorAuthDocument.deleteMany({
      where: { caseId: id },
    });

    await tx.priorAuthCase.delete({
      where: { id },
    });
  });

  res.json({
    success: true,
    message: "Prior auth case deleted successfully",
  });
};

export const uploadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { documentType, fileName, fileUrl, checklistItemKey } = req.body as UploadDocumentBody;

  if (!(await ensureClientCaseAccess(req, id))) {
    res.status(403).json({ success: false, message: "Access denied" });
    return;
  }

  const document = await prisma.priorAuthDocument.create({
    data: {
      caseId: id,
      documentType,
      fileName,
      fileUrl,
      checklistItemKey,
      status: "UPLOADED",
      uploadedBy: req.user?.userId || "",
    },
  });

  res.status(201).json({
    success: true,
    data: document,
  });
};

export const getDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  if (!(await ensureClientCaseAccess(req, id))) {
    res.status(403).json({ success: false, message: "Access denied" });
    return;
  }

  const documents = await prisma.priorAuthDocument.findMany({
    where: { caseId: id },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    data: documents,
  });
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.priorAuthDocument.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: "Document deleted successfully",
  });
};

export const listDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { caseId, clientId, limit = "100", offset = "0" } = req.query as ListDocumentsQuery;

  const where: Prisma.PriorAuthDocumentWhereInput = {};
  if (caseId) where.caseId = caseId;
  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.case = { clientId: req.user.clientId };
  } else if (clientId) {
    where.case = { clientId };
  }

  if (caseId && !(await ensureClientCaseAccess(req, caseId))) {
    res.status(403).json({ success: false, message: "Access denied" });
    return;
  }

  const [documents, total] = await Promise.all([
    prisma.priorAuthDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.priorAuthDocument.count({ where }),
  ]);

  res.json({ data: documents, total });
};

export const updateDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const document = await prisma.priorAuthDocument.update({
    where: { id },
    data: req.body as Prisma.PriorAuthDocumentUpdateInput,
  });

  res.json(document);
};

export const listMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    caseId,
    clientId,
    readByClient,
    limit = "100",
    offset = "0",
  } = req.query as ListMessagesQuery;

  const where: Prisma.CaseMessageWhereInput = {};
  if (caseId) where.caseId = caseId;
  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }
  if (readByClient !== undefined) where.readByClient = readByClient === "true";

  if (caseId && !(await ensureClientCaseAccess(req, caseId))) {
    res.status(403).json({ success: false, message: "Access denied" });
    return;
  }

  const [messages, total] = await Promise.all([
    prisma.caseMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.caseMessage.count({ where }),
  ]);

  res.json({ data: messages, total });
};

export const createMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as CreateMessageBody;

  if (!(await ensureClientCaseAccess(req, body.caseId))) {
    res.status(403).json({ success: false, message: "Access denied" });
    return;
  }

  const message = await prisma.caseMessage.create({
    data: {
      ...body,
      clientId: req.user?.role === "CLIENT_USER" ? req.user.clientId || undefined : body.clientId,
      senderId: req.user?.userId || "",
    },
  });

  res.status(201).json(message);
};

export const updateMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const message = await prisma.caseMessage.update({
    where: { id },
    data: req.body as Prisma.CaseMessageUpdateInput,
  });

  res.json(message);
};
