import type { AutomationJobStatus, CoverageStatus } from "@prisma/client";
import { Response } from "express";
import type { AuthenticatedRequest, AuthenticatedUser } from "../types/index.js";
import prisma from "../lib/prisma.js";
import {
  buildGatewayPatientId,
  normalizeEligibilityGatewayResponse,
  sendEligibilityBulkVerification,
  sendEligibilityVerification,
} from "../services/masterGatewayService.js";
import { getEhrSystemById, listEhrSystems } from "../services/emrCatalogService.js";

interface CheckEligibilityBody {
  patientName?: string;
  patientFirstName?: string;
  patientMiddleName?: string;
  patientLastName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  memberId: string;
  payerId: string;
  payerName?: string;
  groupNumber?: string;
  planName?: string;
  planType?: string;
  effectiveDate?: string;
  terminationDate?: string;
  rxBin?: string;
  rxPcn?: string;
  rxGroup?: string;
  copayPcp?: string;
  copaySpecialist?: string;
  subscriberName?: string;
  subscriberDob?: string;
  subscriberRelationship?: string;
  secondaryPayer?: string;
  secondaryMemberId?: string;
  secondaryGroupNumber?: string;
  secondaryPlanName?: string;
  providerNpi?: string;
  serviceTypeCode?: string;
  serviceDate?: string;
  serviceType?: string;
  cptCode?: string;
  facilityName?: string;
  notes?: string;
  sourcePatientId?: string;
  clientId?: string;
  patientId?: string;
  gatewayPatientId?: string;
  submissionType?: "manual" | "ocr" | "emr" | "bulk";
  emrType?: string;
  verificationEngine?: "n8n";
}

interface BulkEligibilityRow {
  patientId?: string;
  patient_id?: string;
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
  secondary_payer?: string;
  secondary_member_id?: string;
  secondary_group_number?: string;
  secondary_plan_name?: string;
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

interface ListEhrSystemsQuery {
  clientId?: string;
}

interface SearchEmrPatientsQuery {
  clientId?: string;
  search?: string;
  limit?: string;
}

interface ConnectEhrSystemBody {
  clientId?: string;
}

interface EhrConfigBody {
  clientId?: string;
  environmentLabel?: string;
  baseUrl?: string;
  authType?: string;
  clientAppId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string;
  fhirVersion?: string;
}

interface EhrConfigRecord {
  environmentLabel: string;
  baseUrl: string;
  authType: string;
  clientAppId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  fhirVersion: string;
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
  const sourcePatientId = row.patientId || row.patient_id || "";
  return {
    patientName: getRowPatientName(row),
    patientFirstName: row.first_name || "",
    patientMiddleName: row.middle_name || "",
    patientLastName: row.last_name || "",
    dob: row.dob || "",
    gender: row.gender || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    city: row.city || "",
    state: row.state || "",
    zip: row.zip || "",
    memberId: row.member_id,
    payerId: row.payer_id || "",
    payerName: row.payer || "",
    groupNumber: row.group_number || "",
    planName: row.plan_name || "",
    planType: row.plan_type || "",
    effectiveDate: row.effective_date || "",
    terminationDate: row.termination_date || "",
    rxBin: row.rx_bin || "",
    rxPcn: row.rx_pcn || "",
    rxGroup: row.rx_group || "",
    copayPcp: row.copay_pcp || "",
    copaySpecialist: row.copay_specialist || "",
    subscriberName: row.subscriber_name || "",
    subscriberDob: row.subscriber_dob || "",
    subscriberRelationship: row.subscriber_relationship || "",
    secondaryPayer: row.secondary_payer || "",
    secondaryMemberId: row.secondary_member_id || "",
    secondaryGroupNumber: row.secondary_group_number || "",
    secondaryPlanName: row.secondary_plan_name || "",
    providerNpi: row.provider_npi || "",
    serviceTypeCode: row.service_type_code || "30",
    serviceDate: row.service_date || new Date().toISOString().slice(0, 10),
    serviceType: row.service_type || "",
    cptCode: row.cpt_code || "",
    facilityName: row.facility_name || "",
    notes: row.notes || "",
    sourcePatientId,
    patientId: sourcePatientId || undefined,
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

function unwrapBulkGatewayResults(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.results)) return record.results;
    if (Array.isArray(record.items)) return record.items;

    if (record.data && typeof record.data === "object") {
      const nestedData = record.data as Record<string, unknown>;
      if (Array.isArray(nestedData.results)) return nestedData.results;
      if (Array.isArray(nestedData.items)) return nestedData.items;
    }
  }

  return [];
}

async function createEligibilityCheckRecord(
  payload: CheckEligibilityBody,
  result: EligibilityResult,
  gatewayPatientId: string,
  clientId: string,
  user?: AuthenticatedUser
): Promise<string> {
  const checkRecord = await prisma.eligibilityCheck.create({
    data: {
      clientId,
      gatewayPatientId,
      patientName: payload.patientName || "",
      patientDob: parseDate(payload.dob),
      memberId: payload.memberId,
      payerId: payload.payerId,
      payerName: payload.payerName,
      providerNpi: payload.providerNpi,
      serviceTypeCode: payload.serviceTypeCode,
      serviceDate: parseDate(payload.serviceDate),
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

  return checkRecord.id;
}

async function executeBulkGatewayRequest(
  payloads: CheckEligibilityBody[],
  clientId: string,
  user?: AuthenticatedUser
): Promise<Array<{ execution: EligibilityExecutionResult | null; error?: string }>> {
  const preparedPayloads = payloads.map((payload) => {
    const resolvedGatewayPatientId = buildGatewayPatientId({
      gatewayPatientId: payload.gatewayPatientId,
      patientName: payload.patientName,
      dob: payload.dob,
      memberId: payload.memberId,
    });

    return {
      payload,
      gatewayPatientId: resolvedGatewayPatientId,
    };
  });

  const rawGatewayResponse = await sendEligibilityBulkVerification(
    preparedPayloads.map(({ payload, gatewayPatientId }) => ({
      gatewayPatientId,
      sourcePatientId: payload.sourcePatientId || payload.patientId || "",
      patientFirstName: payload.patientFirstName || "",
      patientMiddleName: payload.patientMiddleName || "",
      patientLastName: payload.patientLastName || "",
      dob: payload.dob || "",
      gender: payload.gender || "",
      phone: payload.phone || "",
      email: payload.email || "",
      address: payload.address || "",
      city: payload.city || "",
      state: payload.state || "",
      zip: payload.zip || "",
      payerName: payload.payerName || "",
      payerId: payload.payerId || "",
      memberId: payload.memberId,
      groupNumber: payload.groupNumber || "",
      planName: payload.planName || "",
      planType: payload.planType || "",
      effectiveDate: payload.effectiveDate || "",
      terminationDate: payload.terminationDate || "",
      rxBin: payload.rxBin || "",
      rxPcn: payload.rxPcn || "",
      rxGroup: payload.rxGroup || "",
      copayPcp: payload.copayPcp || "",
      copaySpecialist: payload.copaySpecialist || "",
      subscriberName: payload.subscriberName || "",
      subscriberDob: payload.subscriberDob || "",
      subscriberRelationship: payload.subscriberRelationship || "",
      secondaryPayer: payload.secondaryPayer || "",
      secondaryMemberId: payload.secondaryMemberId || "",
      secondaryGroupNumber: payload.secondaryGroupNumber || "",
      secondaryPlanName: payload.secondaryPlanName || "",
      providerNpi: payload.providerNpi || "",
      serviceDate: payload.serviceDate || "",
      serviceType: payload.serviceType || "",
      serviceTypeCode: payload.serviceTypeCode || "30",
      cptCode: payload.cptCode || "",
      facilityName: payload.facilityName || "",
      notes: payload.notes || "",
    }))
  );

  const rawItems = unwrapBulkGatewayResults(rawGatewayResponse);
  const fallbackError =
    rawItems.length === 0
      ? "The bulk eligibility gateway response did not contain a results array."
      : undefined;

  const executions: Array<{ execution: EligibilityExecutionResult | null; error?: string }> = [];

  for (let index = 0; index < preparedPayloads.length; index += 1) {
    const prepared = preparedPayloads[index];
    if (!prepared) {
      executions.push({ execution: null, error: "Missing prepared bulk payload." });
      continue;
    }

    const rawItem = rawItems[index];
    if (rawItem == null) {
      executions.push({
        execution: null,
        error: fallbackError || "The bulk gateway response was missing a row result.",
      });
      continue;
    }

    const normalized = normalizeEligibilityGatewayResponse(rawItem) as EligibilityResult & {
      rawResponse?: unknown;
    };

    const checkRecordId = await createEligibilityCheckRecord(
      prepared.payload,
      normalized,
      prepared.gatewayPatientId,
      clientId,
      user
    );

    executions.push({
      execution: {
        checkRecordId,
        gatewayPatientId: prepared.gatewayPatientId,
        result: normalized,
      },
    });
  }

  return executions;
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

async function resolveEmrClientId({
  requestedClientId,
  user,
}: {
  requestedClientId?: string | null;
  user?: AuthenticatedUser;
}): Promise<string | null> {
  if (user?.role === "CLIENT_USER") {
    return user.clientId || null;
  }

  if (requestedClientId?.trim()) {
    const client = await prisma.client.findUnique({
      where: { id: requestedClientId.trim() },
      select: { id: true },
    });
    return client?.id || null;
  }

  return user?.clientId || null;
}

function buildEmrPatientProjection(
  subscriber: {
    id: string;
    firstName: string | null;
    lastName: string;
    dob: string | null;
    memberId: string | null;
    payer: string | null;
    payerId: string | null;
    groupNumber: string | null;
    planType: string | null;
    clientId: string;
  },
  emrName: string,
  enrichment?: {
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
      middleName: string | null;
      dob: Date;
      gender: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      client: {
        id: string;
        name: string;
        practiceName: string | null;
        npi: string | null;
      };
    } | null;
    primaryPolicy?: {
      payerId: string | null;
      payerName: string;
      memberId: string;
      groupNumber: string | null;
      subscriberName: string | null;
      subscriberDob: Date | null;
      subscriberRelationship: string | null;
      planName: string | null;
      planType: string | null;
      effectiveDate: Date | null;
      terminationDate: Date | null;
      rxBin: string | null;
      rxPcn: string | null;
      rxGroup: string | null;
      copayPcp: number | null;
      copaySpecialist: number | null;
    } | null;
    secondaryPolicy?: {
      payerName: string;
      memberId: string;
      groupNumber: string | null;
      planName: string | null;
    } | null;
  }
) {
  const patient = enrichment?.patient || null;
  const primaryPolicy = enrichment?.primaryPolicy || null;
  const secondaryPolicy = enrichment?.secondaryPolicy || null;
  const practiceName = patient?.client?.practiceName || patient?.client?.name || "";
  const defaultNotes =
    practiceName && subscriber.memberId
      ? `EMR pull for ${practiceName} patient ${subscriber.memberId}`
      : practiceName
        ? `EMR pull for ${practiceName}`
        : "EMR patient pull";
  const today = new Date().toISOString().slice(0, 10);

  const foundFields = [
    patient?.firstName || patient?.lastName || subscriber.firstName || subscriber.lastName ? "Name" : null,
    patient?.dob || subscriber.dob ? "DOB" : null,
    patient?.gender ? "Gender" : null,
    patient?.phone ? "Phone" : null,
    patient?.email ? "Email" : null,
    patient?.address ? "Address" : null,
    primaryPolicy?.memberId || subscriber.memberId ? "Member ID" : null,
    primaryPolicy?.payerName || subscriber.payer || subscriber.payerId ? "Payer" : null,
    primaryPolicy?.groupNumber || subscriber.groupNumber ? "Group Number" : null,
    primaryPolicy?.planName ? "Plan Name" : null,
    primaryPolicy?.planType || subscriber.planType ? "Plan Type" : null,
    primaryPolicy?.effectiveDate ? "Effective Date" : null,
    primaryPolicy?.rxBin ? "Rx BIN" : null,
    primaryPolicy?.subscriberName ? "Subscriber Name" : null,
    patient?.client?.npi ? "Provider NPI" : null,
    practiceName ? "Facility Name" : null,
  ].filter((value): value is string => Boolean(value));

  const missingFields = [
    !patient?.middleName ? "Middle Name" : null,
    !primaryPolicy?.payerId && !subscriber.payerId ? "Payer ID" : null,
    !primaryPolicy?.planName ? "Plan Name" : null,
    !primaryPolicy?.subscriberDob ? "Subscriber DOB" : null,
    !primaryPolicy?.rxPcn ? "Rx PCN" : null,
    !primaryPolicy?.rxGroup ? "Rx Group" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    id: subscriber.id,
    clientId: subscriber.clientId,
    source: emrName,
    mrn: subscriber.id,
    name:
      `${patient?.firstName || subscriber.firstName || ""} ${patient?.lastName || subscriber.lastName || ""}`.trim(),
    firstName: patient?.firstName || subscriber.firstName || "",
    lastName: patient?.lastName || subscriber.lastName || "",
    middleName: patient?.middleName || "",
    dob: patient?.dob?.toISOString().slice(0, 10) || subscriber.dob || "",
    gender: patient?.gender || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    address: patient?.address || "",
    city: patient?.city || "",
    state: patient?.state || "",
    zip: patient?.zip || "",
    payer: primaryPolicy?.payerName || subscriber.payer || "",
    payerId: primaryPolicy?.payerId || subscriber.payerId || "",
    memberId: primaryPolicy?.memberId || subscriber.memberId || "",
    groupNumber: primaryPolicy?.groupNumber || subscriber.groupNumber || "",
    planName: primaryPolicy?.planName || "",
    planType: primaryPolicy?.planType || subscriber.planType || "",
    effectiveDate: primaryPolicy?.effectiveDate?.toISOString().slice(0, 10) || "",
    terminationDate: primaryPolicy?.terminationDate?.toISOString().slice(0, 10) || "",
    rxBin: primaryPolicy?.rxBin || "",
    rxPcn: primaryPolicy?.rxPcn || "",
    rxGroup: primaryPolicy?.rxGroup || "",
    copayPcp: primaryPolicy?.copayPcp != null ? String(primaryPolicy.copayPcp) : "",
    copaySpecialist:
      primaryPolicy?.copaySpecialist != null ? String(primaryPolicy.copaySpecialist) : "",
    subscriberName:
      primaryPolicy?.subscriberName ||
      `${patient?.firstName || subscriber.firstName || ""} ${patient?.lastName || subscriber.lastName || ""}`.trim(),
    subscriberDob: primaryPolicy?.subscriberDob?.toISOString().slice(0, 10) || "",
    subscriberRelationship: primaryPolicy?.subscriberRelationship || "Self",
    secondaryPayer: secondaryPolicy?.payerName || "",
    secondaryMemberId: secondaryPolicy?.memberId || "",
    secondaryGroupNumber: secondaryPolicy?.groupNumber || "",
    secondaryPlanName: secondaryPolicy?.planName || "",
    providerNpi: patient?.client?.npi || "",
    serviceDate: today,
    serviceType: "Specialist Visit",
    cptCode: "99214",
    facilityName: practiceName,
    notes: defaultNotes,
    foundFields,
    missingFields,
  };
}

function parseEhrConfig(rawValue?: string | null): EhrConfigRecord | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<EhrConfigRecord>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      environmentLabel: String(parsed.environmentLabel || ""),
      baseUrl: String(parsed.baseUrl || ""),
      authType: String(parsed.authType || "smart_on_fhir"),
      clientAppId: String(parsed.clientAppId || ""),
      clientSecret: String(parsed.clientSecret || ""),
      redirectUri: String(parsed.redirectUri || ""),
      scopes: String(parsed.scopes || ""),
      fhirVersion: String(parsed.fhirVersion || "R4"),
    };
  } catch {
    return null;
  }
}

async function runEligibilityCheck(
  payload: CheckEligibilityBody,
  user?: AuthenticatedUser
): Promise<EligibilityExecutionResult> {
  const {
    patientName,
    patientFirstName,
    patientMiddleName,
    patientLastName,
    dob,
    gender,
    phone,
    email,
    address,
    city,
    state,
    zip,
    memberId,
    payerId,
    payerName,
    groupNumber,
    planName,
    planType,
    effectiveDate,
    terminationDate,
    rxBin,
    rxPcn,
    rxGroup,
    copayPcp,
    copaySpecialist,
    subscriberName,
    subscriberDob,
    subscriberRelationship,
    secondaryPayer,
    secondaryMemberId,
    secondaryGroupNumber,
    secondaryPlanName,
    providerNpi,
    serviceTypeCode,
    serviceDate,
    serviceType,
    cptCode,
    facilityName,
    notes,
    sourcePatientId,
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
      sourcePatientId: sourcePatientId || patientId || "",
      patientName: resolvedPatientName,
      patientFirstName,
      patientMiddleName,
      patientLastName,
      dob: dob || "",
      gender: gender || "",
      phone: phone || "",
      email: email || "",
      address: address || "",
      city: city || "",
      state: state || "",
      zip: zip || "",
      payerId: payerId || "",
      payerName: payerName || "",
      memberId,
      groupNumber: groupNumber || "",
      planName: planName || "",
      planType: planType || "",
      effectiveDate: effectiveDate || "",
      terminationDate: terminationDate || "",
      rxBin: rxBin || "",
      rxPcn: rxPcn || "",
      rxGroup: rxGroup || "",
      copayPcp: copayPcp || "",
      copaySpecialist: copaySpecialist || "",
      subscriberName: subscriberName || "",
      subscriberDob: subscriberDob || "",
      subscriberRelationship: subscriberRelationship || "",
      secondaryPayer: secondaryPayer || "",
      secondaryMemberId: secondaryMemberId || "",
      secondaryGroupNumber: secondaryGroupNumber || "",
      secondaryPlanName: secondaryPlanName || "",
      providerNpi: providerNpi || "",
      serviceDate: serviceDate || "",
      serviceTypeCode: serviceTypeCode || "30",
      serviceType: serviceType || "",
      cptCode: cptCode || "",
      facilityName: facilityName || "",
      notes: notes || "",
      submissionType,
      emrType,
    })
  ) as unknown as EligibilityResult & {
    rawResponse?: unknown;
  };

  const checkRecordId = await createEligibilityCheckRecord(
    {
      ...payload,
      patientName: resolvedPatientName,
    },
    result,
    resolvedGatewayPatientId,
    clientContext.clientId,
    user
  );

  return {
    checkRecordId,
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

  const payloads = rows.map((row) => ({
    ...normalizeBulkRow(row as BulkEligibilityRow),
    clientId: clientId || user?.clientId || "",
    verificationEngine,
  }));

  try {
    const executions = await executeBulkGatewayRequest(
      payloads,
      clientId || user?.clientId || "",
      user
    );

    for (let index = 0; index < executions.length; index += 1) {
      const payload = payloads[index];
      const outcome = executions[index];

      if (!payload || !outcome) {
        resultState.rows.push(
          buildRowResult(index, payload || ({ memberId: "" } as CheckEligibilityBody), null, "Missing bulk row context")
        );
        resultState.failureCount += 1;
        continue;
      }

      if (outcome.execution) {
        resultState.rows.push(buildRowResult(index, payload, outcome.execution));
        resultState.successCount += 1;
      } else {
        resultState.rows.push(
          buildRowResult(index, payload, null, outcome.error || "Eligibility check failed")
        );
        resultState.failureCount += 1;
      }
    }
  } catch (error) {
    const message = (error as Error).message || "Bulk eligibility request failed";
    for (let index = 0; index < payloads.length; index += 1) {
      const payload = payloads[index];
      resultState.rows.push(
        buildRowResult(index, payload, null, message)
      );
      resultState.failureCount += 1;
    }
  }

  resultState.completedRows = resultState.rows.length;

  await prisma.automationJob.update({
    where: { id: jobId },
    data: {
      resultJson: JSON.stringify(resultState),
    },
  });

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

export async function listEhrSystemCatalog(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { clientId } = req.query as ListEhrSystemsQuery;
  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: clientId,
    user: req.user,
  });

  let connectedSystem: string | null = null;
  if (resolvedClientId) {
    const client = await prisma.client.findUnique({
      where: { id: resolvedClientId },
      select: { emrSystem: true },
    });
    connectedSystem = client?.emrSystem || null;
  }

  res.json({ data: listEhrSystems(connectedSystem) });
}

export async function connectEhrSystem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as ConnectEhrSystemBody;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: body.clientId,
    user: req.user,
  });

  if (!resolvedClientId) {
    res.status(400).json({
      error: "A client workspace is required before connecting an EHR system.",
    });
    return;
  }

  await prisma.client.update({
    where: { id: resolvedClientId },
    data: { emrSystem: ehrSystem.id },
  });

  res.json({
    success: true,
    data: {
      clientId: resolvedClientId,
      emrSystem: ehrSystem.id,
      name: ehrSystem.name,
    },
  });
}

export async function getEhrSystemConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { clientId } = req.query as ListEhrSystemsQuery;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: clientId,
    user: req.user,
  });

  if (!resolvedClientId) {
    res.status(400).json({ error: "A client workspace is required before configuring an EHR." });
    return;
  }

  const client = await prisma.client.findUnique({
    where: { id: resolvedClientId },
    select: {
      id: true,
      emrSystem: true,
      emrConfigJson: true,
    },
  });

  const config = parseEhrConfig(client?.emrConfigJson);

  res.json({
    data: {
      clientId: resolvedClientId,
      emrSystem: client?.emrSystem || "",
      isConnected: client?.emrSystem === ehrSystem.id,
      config: config || {
        environmentLabel: "",
        baseUrl: "",
        authType: "smart_on_fhir",
        clientAppId: "",
        clientSecret: "",
        redirectUri: "",
        scopes: "",
        fhirVersion: "R4",
      },
    },
  });
}

export async function saveEhrSystemConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as EhrConfigBody;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: body.clientId,
    user: req.user,
  });

  if (!resolvedClientId) {
    res.status(400).json({ error: "A client workspace is required before configuring an EHR." });
    return;
  }

  const config: EhrConfigRecord = {
    environmentLabel: body.environmentLabel?.trim() || "",
    baseUrl: body.baseUrl?.trim() || "",
    authType: body.authType?.trim() || "smart_on_fhir",
    clientAppId: body.clientAppId?.trim() || "",
    clientSecret: body.clientSecret?.trim() || "",
    redirectUri: body.redirectUri?.trim() || "",
    scopes: body.scopes?.trim() || "",
    fhirVersion: body.fhirVersion?.trim() || "R4",
  };

  if (!config.baseUrl) {
    res.status(400).json({ error: "Base URL is required." });
    return;
  }

  const client = await prisma.client.update({
    where: { id: resolvedClientId },
    data: {
      emrSystem: ehrSystem.id,
      emrConfigJson: JSON.stringify(config),
    },
    select: {
      id: true,
      emrSystem: true,
      emrConfigJson: true,
    },
  });

  res.json({
    success: true,
    data: {
      clientId: client.id,
      emrSystem: client.emrSystem,
      config,
    },
  });
}

export async function searchEmrPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { clientId, search = "", limit = "20" } = req.query as SearchEmrPatientsQuery;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const searchTerm = search.trim();
  if (!searchTerm) {
    res.json({ data: [] });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: clientId,
    user: req.user,
  });

  const subscribers = await prisma.subscriber.findMany({
    where: {
      ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
      OR: [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { memberId: { contains: searchTerm, mode: "insensitive" } },
        { id: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(parseInt(limit || "20", 10) || 20, 50),
  });

  res.json({
    data: subscribers.map((subscriber) => buildEmrPatientProjection(subscriber, ehrSystem.name)),
  });
}

export async function getEmrPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id, patientId } = req.params as { id: string; patientId: string };
  const { clientId } = req.query as SearchEmrPatientsQuery;
  const ehrSystem = getEhrSystemById(id);

  if (!ehrSystem) {
    res.status(404).json({ error: "EHR system not found" });
    return;
  }

  const resolvedClientId = await resolveEmrClientId({
    requestedClientId: clientId,
    user: req.user,
  });

  const subscriber = await prisma.subscriber.findFirst({
    where: {
      id: patientId,
      ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
    },
  });

  if (!subscriber) {
    res.status(404).json({ error: "Patient not found in the selected EMR feed" });
    return;
  }

  const matchedPatient = await prisma.patient.findFirst({
    where: {
      clientId: subscriber.clientId,
      deletedAt: null,
      OR: [
        ...(subscriber.memberId
          ? [
              {
                insurancePolicies: {
                  some: {
                    deletedAt: null,
                    memberId: subscriber.memberId,
                  },
                },
              },
            ]
          : []),
        {
          firstName: subscriber.firstName || undefined,
          lastName: subscriber.lastName,
          ...(subscriber.dob ? { dob: new Date(subscriber.dob) } : {}),
        },
      ],
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          practiceName: true,
          npi: true,
        },
      },
      insurancePolicies: {
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          policyType: true,
          payerId: true,
          payerName: true,
          memberId: true,
          groupNumber: true,
          subscriberName: true,
          subscriberDob: true,
          subscriberRelationship: true,
          planName: true,
          planType: true,
          effectiveDate: true,
          terminationDate: true,
          rxBin: true,
          rxPcn: true,
          rxGroup: true,
          copayPcp: true,
          copaySpecialist: true,
        },
      },
    },
  });

  const primaryPolicy =
    matchedPatient?.insurancePolicies.find((policy) => policy.policyType === "PRIMARY") ||
    matchedPatient?.insurancePolicies[0] ||
    null;
  const secondaryPolicy =
    matchedPatient?.insurancePolicies.find((policy) => policy.policyType === "SECONDARY") || null;

  res.json({
    data: buildEmrPatientProjection(subscriber, ehrSystem.name, {
      patient: matchedPatient,
      primaryPolicy,
      secondaryPolicy,
    }),
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
