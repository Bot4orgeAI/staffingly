import { createHash } from "crypto";

const DEFAULT_MASTER_GATEWAY_URL =
  "https://cabdriver-tree-scabby.ngrok-free.dev/webhook/master-gateway";
const MASTER_GATEWAY_URL = process.env.N8N_MASTER_GATEWAY_URL || DEFAULT_MASTER_GATEWAY_URL;

export type GatewaySubmissionType = "manual" | "ocr" | "emr" | "bulk";
export type PriorAuthGatewayAction =
  | "save_intake"
  | "run_ai_review"
  | "submit_to_cmm"
  | "save_denial"
  | "draft_appeal";

export interface EligibilityGatewayInput {
  gatewayPatientId: string;
  sourcePatientId?: string;
  patientName: string;
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
  payerId?: string;
  payerName?: string;
  memberId: string;
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
  serviceDate?: string;
  serviceType?: string;
  serviceTypeCode?: string;
  cptCode?: string;
  facilityName?: string;
  notes?: string;
  submissionType?: GatewaySubmissionType;
  emrType?: string;
}

export interface EligibilityGatewayBulkItem {
  gatewayPatientId: string;
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
  payerId?: string;
  payerName?: string;
  memberId: string;
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
  serviceDate?: string;
  serviceType?: string;
  serviceTypeCode?: string;
  cptCode?: string;
  facilityName?: string;
  notes?: string;
  sourcePatientId?: string;
}

export interface PriorAuthGatewayInput {
  gatewayPatientId: string;
  caseId: string;
  action: PriorAuthGatewayAction;
  eligibilityCheckId?: string | null;
  patientName?: string | null;
  patientDob?: string | null;
  memberId?: string | null;
  payerName?: string | null;
  payerId?: string | null;
  coverageStatus?: string | null;
  priorAuthRequired?: boolean | null;
  providerNpi?: string | null;
  requestingProvider?: string | null;
  requestingProviderNpi?: string | null;
  serviceDate?: string | null;
  serviceType?: string | null;
  procedureCodes?: string[];
  diagnosisCodes?: string[];
  urgency?: string | null;
  submissionMethod?: string | null;
  payerRule?: Record<string, unknown> | null;
  documents?: Array<Record<string, unknown>>;
  clientContext?: Record<string, unknown> | null;
  procedureName?: string;
  icd10?: string;
  extractedDocumentText?: string;
  denialReason?: string;
  denialCode?: string | null;
  appealDeadline?: string | null;
}

function ensureGatewayConfigured(): string {
  if (!MASTER_GATEWAY_URL) {
    throw new Error("N8N master gateway URL is not configured");
  }

  return MASTER_GATEWAY_URL;
}

function splitName(patientName?: string): { firstName: string; lastName: string } {
  const nameParts = (patientName || "").trim().split(/\s+/).filter(Boolean);

  if (nameParts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (nameParts.length === 1) {
    return { firstName: nameParts[0] ?? "", lastName: "" };
  }

  return {
    firstName: nameParts.slice(0, -1).join(" "),
    lastName: nameParts[nameParts.length - 1] ?? "",
  };
}

export function buildGatewayPatientId({
  gatewayPatientId,
  patientName,
  dob,
  memberId,
}: {
  gatewayPatientId?: string | null;
  patientName?: string | null;
  dob?: string | null;
  memberId?: string | null;
}): string {
  if (gatewayPatientId) {
    return gatewayPatientId;
  }

  const fingerprint = [patientName || "", dob || "", memberId || ""].join("|").toLowerCase();
  const digest = createHash("sha256").update(fingerprint).digest("hex").slice(0, 12).toUpperCase();
  return `PT-${digest}`;
}

async function postToGateway(payload: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(ensureGatewayConfigured(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const parsed = text ? tryParseJson(text) : {};

  if (!response.ok) {
    const message =
      (isRecord(parsed) && (parsed.error || parsed.message)) ||
      text ||
      `Gateway request failed with status ${response.status}`;
    throw new Error(String(message));
  }

  return parsed;
}

function buildEligibilityGatewayData(input: EligibilityGatewayBulkItem): Record<string, unknown> {
  return {
    patientId: input.gatewayPatientId,
    sourcePatientId: input.sourcePatientId || "",
    patientFirstName: input.patientFirstName || "",
    patientMiddleName: input.patientMiddleName || "",
    patientLastName: input.patientLastName || "",
    patientDob: input.dob || "",
    gender: input.gender || "",
    phone: input.phone || "",
    email: input.email || "",
    address: input.address || "",
    city: input.city || "",
    state: input.state || "",
    zip: input.zip || "",
    payerName: input.payerName || "",
    payerId: input.payerId || "",
    memberId: input.memberId,
    groupNumber: input.groupNumber || "",
    planName: input.planName || "",
    planType: input.planType || "",
    effectiveDate: input.effectiveDate || "",
    terminationDate: input.terminationDate || "",
    rxBin: input.rxBin || "",
    rxPcn: input.rxPcn || "",
    rxGroup: input.rxGroup || "",
    copayPcp: input.copayPcp || "",
    copaySpecialist: input.copaySpecialist || "",
    subscriberName: input.subscriberName || "",
    subscriberDob: input.subscriberDob || "",
    subscriberRelationship: input.subscriberRelationship || "",
    secondaryPayer: input.secondaryPayer || "",
    secondaryMemberId: input.secondaryMemberId || "",
    secondaryGroupNumber: input.secondaryGroupNumber || "",
    secondaryPlanName: input.secondaryPlanName || "",
    providerNpi: input.providerNpi || "",
    serviceDate: input.serviceDate || "",
    serviceType: input.serviceType || "",
    serviceTypeCode: input.serviceTypeCode || "30",
    cptCode: input.cptCode || "",
    facilityName: input.facilityName || "",
    notes: input.notes || "",
  };
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapGatewayPayload(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) {
    const firstItem = raw[0];
    return isRecord(firstItem) ? firstItem : {};
  }

  return isRecord(raw) ? raw : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeEligibilityGatewayResponse(raw: unknown): Record<string, unknown> {
  const rootPayload = unwrapGatewayPayload(raw);
  const payload = isRecord(rootPayload.data)
    ? rootPayload.data
    : isRecord(rootPayload.result)
      ? rootPayload.result
      : rootPayload;

  const rawError =
    asString(payload.error) ||
    asString(payload.errorMessage) ||
    (asString(payload.status)?.toLowerCase() === "error" ? asString(payload.message) : null) ||
    asString(rootPayload.error) ||
    asString(rootPayload.errorMessage) ||
    (asString(rootPayload.status)?.toLowerCase() === "error"
      ? asString(rootPayload.message)
      : null);

  const coverageStatus =
    asString(payload.coverageStatus) ||
    asString(payload.coverage_status) ||
    asString(payload.coverage) ||
    (rawError ? "Unknown" : asString(payload.status)) ||
    "Unknown";

  const explicitSuccess = asBoolean(payload.success) ?? asBoolean(rootPayload.success);
  const success =
    explicitSuccess ??
    (!rawError &&
      asString(payload.status)?.toLowerCase() !== "error" &&
      coverageStatus !== "Unknown");

  return {
    success,
    coverageStatus,
    coverage_status: coverageStatus,
    planName:
      asString(payload.planName) || asString(payload.plan_name) || asString(payload.plan) || "",
    plan_name:
      asString(payload.planName) || asString(payload.plan_name) || asString(payload.plan) || "",
    planType: asString(payload.planType) || asString(payload.plan_type) || "",
    plan_type: asString(payload.planType) || asString(payload.plan_type) || "",
    networkStatus: asString(payload.networkStatus) || asString(payload.network_status) || "",
    network_status: asString(payload.networkStatus) || asString(payload.network_status) || "",
    effectiveDate: asString(payload.effectiveDate) || asString(payload.effective_date),
    effective_date: asString(payload.effectiveDate) || asString(payload.effective_date),
    terminationDate: asString(payload.terminationDate) || asString(payload.termination_date),
    termination_date: asString(payload.terminationDate) || asString(payload.termination_date),
    groupNumber: asString(payload.groupNumber) || asString(payload.group_number),
    group_number: asString(payload.groupNumber) || asString(payload.group_number),
    benefitsRaw: asArray(payload.benefitsRaw).length
      ? asArray(payload.benefitsRaw)
      : asArray(payload.benefits_raw),
    benefits_raw: asArray(payload.benefitsRaw).length
      ? asArray(payload.benefitsRaw)
      : asArray(payload.benefits_raw),
    confidenceScore: asNumber(payload.confidenceScore) ?? asNumber(payload.confidence_score),
    confidence_score: asNumber(payload.confidenceScore) ?? asNumber(payload.confidence_score),
    responseTimeSeconds:
      asNumber(payload.responseTimeSeconds) ?? asNumber(payload.response_time_seconds),
    response_time_seconds:
      asNumber(payload.responseTimeSeconds) ?? asNumber(payload.response_time_seconds),
    channelUsed:
      asString(payload.channelUsed) || asString(payload.channel_used) || "n8n Master Gateway",
    channel_used:
      asString(payload.channelUsed) || asString(payload.channel_used) || "n8n Master Gateway",
    flags: asArray(payload.flags),
    requiresHumanReview:
      asBoolean(payload.requiresHumanReview) ?? asBoolean(payload.requires_human_review) ?? false,
    requires_human_review:
      asBoolean(payload.requiresHumanReview) ?? asBoolean(payload.requires_human_review) ?? false,
    priorAuthRequired:
      asBoolean(payload.priorAuthRequired) ?? asBoolean(payload.prior_auth_required) ?? null,
    prior_auth_required:
      asBoolean(payload.priorAuthRequired) ?? asBoolean(payload.prior_auth_required) ?? null,
    rawResponse: raw,
    raw_response: raw,
    error: rawError,
  };
}

export async function sendEligibilityVerification(
  input: EligibilityGatewayInput
): Promise<unknown> {
  const firstName = input.patientFirstName?.trim() || splitName(input.patientName).firstName;
  const lastName = input.patientLastName?.trim() || splitName(input.patientName).lastName;

  return postToGateway({
    routing_header: {
      module: "EV",
      submission_type: input.submissionType || "manual",
      emr_type: input.emrType || "",
    },
    data: buildEligibilityGatewayData({
      gatewayPatientId: input.gatewayPatientId,
      sourcePatientId: input.sourcePatientId,
      patientFirstName: firstName,
      patientMiddleName: input.patientMiddleName,
      patientLastName: lastName,
      dob: input.dob || "",
      gender: input.gender || "",
      phone: input.phone || "",
      email: input.email || "",
      address: input.address || "",
      city: input.city || "",
      state: input.state || "",
      zip: input.zip || "",
      payerName: input.payerName || "",
      payerId: input.payerId || "",
      memberId: input.memberId,
      groupNumber: input.groupNumber || "",
      planName: input.planName || "",
      planType: input.planType || "",
      effectiveDate: input.effectiveDate || "",
      terminationDate: input.terminationDate || "",
      rxBin: input.rxBin || "",
      rxPcn: input.rxPcn || "",
      rxGroup: input.rxGroup || "",
      copayPcp: input.copayPcp || "",
      copaySpecialist: input.copaySpecialist || "",
      subscriberName: input.subscriberName || "",
      subscriberDob: input.subscriberDob || "",
      subscriberRelationship: input.subscriberRelationship || "",
      secondaryPayer: input.secondaryPayer || "",
      secondaryMemberId: input.secondaryMemberId || "",
      secondaryGroupNumber: input.secondaryGroupNumber || "",
      secondaryPlanName: input.secondaryPlanName || "",
      providerNpi: input.providerNpi || "",
      serviceDate: input.serviceDate || "",
      serviceType: input.serviceType || "",
      serviceTypeCode: input.serviceTypeCode || "30",
      cptCode: input.cptCode || "",
      facilityName: input.facilityName || "",
      notes: input.notes || "",
    }),
  });
}

export async function sendEligibilityBulkVerification(
  inputs: EligibilityGatewayBulkItem[],
  options?: { emrType?: string }
): Promise<unknown> {
  return postToGateway({
    routing_header: {
      module: "EV",
      submission_type: "bulk",
      emr_type: options?.emrType || "",
    },
    data: inputs.map((input) => buildEligibilityGatewayData(input)),
  });
}

export async function sendPriorAuthAction(input: PriorAuthGatewayInput): Promise<unknown> {
  return postToGateway({
    routing_header: {
      module: "PA",
      action: input.action,
    },
    data: {
      patientId: input.gatewayPatientId,
      caseId: input.caseId,
      eligibilityCheckId: input.eligibilityCheckId || "",
      patientName: input.patientName || "",
      patientDob: input.patientDob || "",
      memberId: input.memberId || "",
      payerName: input.payerName || "",
      payerId: input.payerId || "",
      coverageStatus: input.coverageStatus || "",
      priorAuthRequired: input.priorAuthRequired ?? null,
      providerNpi: input.providerNpi || "",
      requestingProvider: input.requestingProvider || "",
      requestingProviderNpi: input.requestingProviderNpi || "",
      serviceDate: input.serviceDate || "",
      serviceType: input.serviceType || input.procedureName || "",
      procedureCodes: input.procedureCodes || [],
      diagnosisCodes: input.diagnosisCodes || [],
      urgency: input.urgency || "",
      submissionMethod: input.submissionMethod || "",
      payerRule: input.payerRule || null,
      documents: input.documents || [],
      clientContext: input.clientContext || null,
      procedureName: input.procedureName || "",
      icd10: input.icd10 || "",
      extractedDocumentText: input.extractedDocumentText || "",
      denialReason: input.denialReason || "",
      denialCode: input.denialCode || "",
      appealDeadline: input.appealDeadline || "",
    },
  });
}

export function normalizePriorAuthGatewayResponse(raw: unknown): Record<string, unknown> {
  const rootPayload = unwrapGatewayPayload(raw);
  const payload = isRecord(rootPayload.data)
    ? rootPayload.data
    : isRecord(rootPayload.result)
      ? rootPayload.result
      : rootPayload;
  const rawError =
    asString(payload.error) ||
    asString(payload.errorMessage) ||
    (asString(payload.status)?.toLowerCase() === "error" ? asString(payload.message) : null) ||
    asString(rootPayload.error) ||
    asString(rootPayload.errorMessage) ||
    (asString(rootPayload.status)?.toLowerCase() === "error"
      ? asString(rootPayload.message)
      : null);
  const explicitSuccess = asBoolean(payload.success) ?? asBoolean(rootPayload.success);

  return {
    success: explicitSuccess ?? !rawError,
    action: asString(payload.action) || asString(rootPayload.action),
    status: asString(payload.status) || asString(rootPayload.status),
    message: asString(payload.message) || asString(rootPayload.message),
    confirmationNumber:
      asString(payload.confirmationNumber) || asString(payload.confirmation_number),
    appealLetter: asString(payload.appealLetter) || asString(payload.appeal_letter),
    checklistItems: payload.checklistItems || payload.checklist_items || null,
    missingItems: payload.missingItems || payload.missing_items || null,
    confidenceScore: asNumber(payload.confidenceScore) ?? asNumber(payload.confidence_score),
    confidenceTier: asString(payload.confidenceTier) || asString(payload.confidence_tier),
    requiresHumanReview:
      asBoolean(payload.requiresHumanReview) ?? asBoolean(payload.requires_human_review) ?? false,
    humanReviewReason:
      asString(payload.humanReviewReason) || asString(payload.human_review_reason),
    payerRequirements: payload.payerRequirements || payload.payer_requirements || null,
    routingTrace: payload.routingTrace || payload.routing_trace || null,
    automation: payload.automation || null,
    denialRisk: payload.denialRisk || payload.denial_risk || null,
    audit: payload.audit || null,
    medicalNecessitySummary:
      asString(payload.medicalNecessitySummary) || asString(payload.medical_necessity_summary),
    rawResponse: raw,
    error: rawError,
  };
}

export default {
  buildGatewayPatientId,
  normalizeEligibilityGatewayResponse,
  normalizePriorAuthGatewayResponse,
  sendEligibilityBulkVerification,
  sendEligibilityVerification,
  sendPriorAuthAction,
};
