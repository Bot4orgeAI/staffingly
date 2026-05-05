import type { AutomationJobStatus, CoverageStatus } from "@prisma/client";
import { Response } from "express";
import type { AuthenticatedRequest, AuthenticatedUser } from "../types/index.js";
import prisma from "../lib/prisma.js";
import {
  buildGatewayPatientId,
  normalizeEligibilityGatewayResponse,
  sendEligibilityVerification,
} from "../services/masterGatewayService.js";

interface CheckEligibilityBody {
  patientName?: string;
  patientFirstName?: string;
  patientLastName?: string;
  dob?: string;
  memberId: string;
  payerId: string;
  payerName?: string;
  providerNpi?: string;
  serviceTypeCode?: string;
  serviceDate?: string;
  clientId?: string;
  patientId?: string;
  gatewayPatientId?: string;
  submissionType?: "manual" | "ocr" | "emr" | "bulk";
  emrType?: string;
  verificationEngine?: "n8n";
}

interface BulkEligibilityRow {
  patientId?: string;
  patient_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  payer?: string;
  payer_id?: string;
  member_id: string;
  group_number?: string;
  plan_name?: string;
  plan_type?: string;
  effective_date?: string;
  termination_date?: string;
  rx_bin?: string;
  rx_pcn?: string;
  rx_group?: string;
  copay_pcp?: string;
  copay_specialist?: string;
  subscriber_name?: string;
  subscriber_dob?: string;
  subscriber_relationship?: string;
  provider_npi?: string;
  cpt_code?: string;
  facility_name?: string;
  notes?: string;
  service_type?: string;
  service_type_code?: string;
  service_date?: string;
}

interface BulkEligibilityBatchBody {
  clientId?: string;
  verificationEngine?: "n8n";
  rows: BulkEligibilityRow[];
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
  routingTrace?: Array<{
    channel: string;
    status: string;
    detail: string;
  }>;
  automationJobId?: string;
}

interface EligibilityExecutionResult {
  checkRecordId: string;
  gatewayPatientId: string;
  result: EligibilityResult;
}

interface BulkBatchRowResult {
  index: number;
  status: "completed" | "failed";
  input: {
    patientName: string;
    dob: string;
    payerName: string;
    payerId: string;
    memberId: string;
    providerNpi: string;
    serviceDate: string;
    serviceTypeCode: string;
  };
  checkId?: string;
  gatewayPatientId?: string;
  result?: EligibilityResult;
  error?: string;
}

interface BulkBatchJobResult {
  totalRows: number;
  completedRows: number;
  successCount: number;
  failureCount: number;
  verificationEngine: "n8n";
  rows: BulkBatchRowResult[];
}

interface ResolvedClientContext {
  clientId: string;
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

function toCoverageStatus(value?: string): CoverageStatus | null {
  const normalized = value?.trim().toUpperCase();

  if (normalized === "ACTIVE") return "ACTIVE";
  if (normalized === "INACTIVE") return "INACTIVE";
  if (normalized === "UNKNOWN") return "UNKNOWN";

  return null;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.includes("/") ? value.split("/").reverse().join("-") : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRowPatientName(row: BulkEligibilityRow): string {
  if (row.patient_name?.trim()) return row.patient_name.trim();
  return [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ").trim();
}

function normalizeBulkRow(row: BulkEligibilityRow): CheckEligibilityBody {
  return {
    patientName: getRowPatientName(row),
    patientFirstName: row.first_name || "",
    patientLastName: row.last_name || "",
    dob: row.dob || "",
    memberId: row.member_id,
    payerId: row.payer_id || "",
    payerName: row.payer || "",
    providerNpi: row.provider_npi || "",
    serviceTypeCode: row.service_type_code || "30",
    serviceDate: row.service_date || new Date().toISOString().slice(0, 10),
    patientId: row.patientId || undefined,
    submissionType: "bulk",
  };
}

function createEmptyBulkBatchResult(
  totalRows: number,
  verificationEngine: "n8n"
): BulkBatchJobResult {
  return {
    totalRows,
    completedRows: 0,
    successCount: 0,
    failureCount: 0,
    verificationEngine,
    rows: [],
  };
}

function parseJobResult(job: { resultJson: string | null }): BulkBatchJobResult | null {
  if (!job.resultJson) return null;

  try {
    return JSON.parse(job.resultJson) as BulkBatchJobResult;
  } catch {
    return null;
  }
}

function buildRowResult(
  index: number,
  payload: CheckEligibilityBody,
  execution: EligibilityExecutionResult | null,
  error?: string
): BulkBatchRowResult {
  return {
    index,
    status: execution ? "completed" : "failed",
    input: {
      patientName: payload.patientName || "",
      dob: payload.dob || "",
      payerName: payload.payerName || "",
      payerId: payload.payerId || "",
      memberId: payload.memberId,
      providerNpi: payload.providerNpi || "",
      serviceDate: payload.serviceDate || "",
      serviceTypeCode: payload.serviceTypeCode || "30",
    },
    checkId: execution?.checkRecordId,
    gatewayPatientId: execution?.gatewayPatientId,
    result: execution?.result,
    error,
  };
}

async function resolveEligibilityClientContext({
  clientId,
  patientId,
  user,
}: {
  clientId?: string | null;
  patientId?: string | null;
  user?: AuthenticatedUser;
}): Promise<ResolvedClientContext> {
  const requestedClientId = clientId?.trim();
  if (requestedClientId) {
    const client = await prisma.client.findUnique({
      where: { id: requestedClientId },
      select: { id: true },
    });
    if (!client) {
      throw new Error("The selected client could not be found.");
    }
    return { clientId: client.id };
  }

  if (patientId?.trim()) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId.trim() },
      select: { clientId: true },
    });
    if (patient?.clientId) {
      return { clientId: patient.clientId };
    }
  }

  if (user?.clientId?.trim()) {
    const client = await prisma.client.findUnique({
      where: { id: user.clientId.trim() },
      select: { id: true },
    });
    if (client) {
      return { clientId: client.id };
    }
  }

  throw new Error(
    "A valid client context is required for eligibility checks. Please select or sign in under a client account."
  );
}

async function runEligibilityCheck(
  payload: CheckEligibilityBody,
  user?: AuthenticatedUser
): Promise<EligibilityExecutionResult> {
  const {
    patientName,
    patientFirstName,
    patientLastName,
    dob,
    memberId,
    payerId,
    payerName,
    providerNpi,
    serviceTypeCode,
    serviceDate,
    clientId,
    patientId,
    gatewayPatientId,
    submissionType,
    emrType,
    verificationEngine = "n8n",
  } = payload;
  const clientContext = await resolveEligibilityClientContext({
    clientId,
    patientId,
    user,
  });

  const resolvedPatientName =
    patientName ||
    [patientFirstName?.trim(), patientLastName?.trim()].filter(Boolean).join(" ").trim();

  const resolvedGatewayPatientId = buildGatewayPatientId({
    gatewayPatientId,
    patientName: resolvedPatientName,
    dob,
    memberId,
  });

  const result = normalizeEligibilityGatewayResponse(
    await sendEligibilityVerification({
      gatewayPatientId: resolvedGatewayPatientId,
      patientName: resolvedPatientName,
      patientFirstName,
      patientLastName,
      dob: dob || "",
      payerId: payerId || "",
      memberId,
      providerNpi: providerNpi || "",
      serviceDate: serviceDate || "",
      serviceTypeCode: serviceTypeCode || "30",
      submissionType,
      emrType,
    })
  ) as unknown as EligibilityResult & {
    rawResponse?: unknown;
  };

  const checkRecord = await prisma.eligibilityCheck.create({
    data: {
      clientId: clientContext.clientId,
      gatewayPatientId: resolvedGatewayPatientId,
      patientName: resolvedPatientName,
      patientDob: parseDate(dob),
      memberId,
      payerId,
      payerName,
      providerNpi,
      serviceTypeCode,
      serviceDate: parseDate(serviceDate),
      coverageStatus: toCoverageStatus(result.coverageStatus),
      planName: result.planName,
      planType: result.planType,
      networkStatus: result.networkStatus,
      effectiveDate: parseDate(result.effectiveDate || null),
      terminationDate: parseDate(result.terminationDate || null),
      groupNumber: result.groupNumber,
      benefitsRaw: result.benefitsRaw ? JSON.stringify(result.benefitsRaw) : null,
      confidenceScore: result.confidenceScore,
      responseTimeSeconds: result.responseTimeSeconds,
      channelUsed: result.channelUsed,
      flags: result.flags || [],
      requiresHumanReview: result.requiresHumanReview || false,
      rawResponse: result.rawResponse ? JSON.stringify(result.rawResponse) : null,
      errorMessage: result.error,
      performedById: user?.userId,
    },
  });

  return {
    checkRecordId: checkRecord.id,
    gatewayPatientId: resolvedGatewayPatientId,
    result,
  };
}

async function processBulkBatchJob(
  jobId: string,
  rows: BulkEligibilityRow[],
  user?: AuthenticatedUser,
  clientId?: string | null,
  verificationEngine: "n8n" = "n8n"
): Promise<void> {
  const resultState = createEmptyBulkBatchResult(rows.length, verificationEngine);

  await prisma.automationJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      resultJson: JSON.stringify(resultState),
      clientId: clientId || user?.clientId || null,
    },
  });

  for (let index = 0; index < rows.length; index += 1) {
    const payload = {
      ...normalizeBulkRow(rows[index] as BulkEligibilityRow),
      clientId: clientId || user?.clientId || "",
      verificationEngine,
    };

    try {
      const execution = await runEligibilityCheck(payload, user);
      resultState.rows.push(buildRowResult(index, payload, execution));
      resultState.successCount += 1;
    } catch (error) {
      resultState.rows.push(
        buildRowResult(index, payload, null, (error as Error).message || "Eligibility check failed")
      );
      resultState.failureCount += 1;
    }

    resultState.completedRows = resultState.rows.length;

    await prisma.automationJob.update({
      where: { id: jobId },
      data: {
        resultJson: JSON.stringify(resultState),
      },
    });
  }

  const finalStatus: AutomationJobStatus =
    resultState.failureCount > 0 && resultState.successCount === 0 ? "FAILED" : "COMPLETED";

  await prisma.automationJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      errorMessage:
        finalStatus === "FAILED"
          ? "All bulk eligibility rows failed. Review the row errors for details."
          : null,
      resultJson: JSON.stringify(resultState),
    },
  });
}

function assertCanAccessBatch(
  job: { clientId: string | null; triggeredBy: string | null },
  user?: AuthenticatedUser
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "STAFFINGLY_ADMIN" || user.role === "STAFFINGLY_SUPERVISOR") {
    return true;
  }
  if (user.clientId && job.clientId && user.clientId === job.clientId) {
    return true;
  }
  return Boolean(user.email && job.triggeredBy && user.email === job.triggeredBy);
}

export async function checkEligibility(req: AuthenticatedRequest, res: Response): Promise<void> {
  const execution = await runEligibilityCheck(req.body as CheckEligibilityBody, req.user);

  res.json({
    ...execution.result,
    checkId: execution.checkRecordId,
    check_id: execution.checkRecordId,
    gatewayPatientId: execution.gatewayPatientId,
    gateway_patient_id: execution.gatewayPatientId,
  });
}

export async function createBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { clientId, rows, verificationEngine = "n8n" } = req.body as BulkEligibilityBatchBody;
  const clientContext = await resolveEligibilityClientContext({
    clientId,
    user: req.user,
  });
  const resolvedClientId = clientContext.clientId;
  const activeJobs = await prisma.automationJob.findMany({
    where: {
      jobType: "eligibility_bulk",
      status: { in: ["QUEUED", "RUNNING"] },
      clientId: resolvedClientId,
    },
  });

  const queuePosition = activeJobs.filter((job) => job.status === "QUEUED").length + 1;
  const jobRecord = await prisma.automationJob.create({
    data: {
      jobId: `eligibility_bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      jobType: "eligibility_bulk",
      clientId: resolvedClientId,
      payerName:
        rows.length === 1 ? rows[0]?.payer || rows[0]?.payer_id || "Unknown Payer" : "Mixed Payers",
      status: "QUEUED",
      queuePosition,
      triggeredBy: req.user?.email || null,
      resultJson: JSON.stringify(createEmptyBulkBatchResult(rows.length, verificationEngine)),
    },
  });

  setTimeout(() => {
    void processBulkBatchJob(jobRecord.id, rows, req.user, resolvedClientId, verificationEngine);
  }, 0);

  res.status(202).json({
    success: true,
    batchJobId: jobRecord.id,
    jobId: jobRecord.jobId,
    status: jobRecord.status.toLowerCase(),
    queuePosition,
    verificationEngine,
  });
}

export async function getBulkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const job = await prisma.automationJob.findUnique({
    where: { id },
    select: {
      id: true,
      jobId: true,
      jobType: true,
      clientId: true,
      payerName: true,
      status: true,
      queuePosition: true,
      queuedAt: true,
      startedAt: true,
      completedAt: true,
      triggeredBy: true,
      errorMessage: true,
      resultJson: true,
    },
  });

  if (!job || job.jobType !== "eligibility_bulk") {
    res.status(404).json({ error: "Bulk eligibility batch not found" });
    return;
  }

  if (!assertCanAccessBatch(job, req.user)) {
    res.status(403).json({ error: "You do not have access to this batch job" });
    return;
  }

  res.json({
    id: job.id,
    jobId: job.jobId,
    status: job.status.toLowerCase(),
    queuePosition: job.queuePosition,
    queuedAt: job.queuedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    payerName: job.payerName,
    errorMessage: job.errorMessage,
    result: parseJobResult(job),
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
