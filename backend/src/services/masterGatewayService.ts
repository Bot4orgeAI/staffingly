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
  patientName: string;
  patientFirstName?: string;
  patientLastName?: string;
  dob?: string;
  payerId?: string;
  memberId: string;
  providerNpi?: string;
  serviceDate?: string;
  serviceTypeCode?: string;
  submissionType?: GatewaySubmissionType;
  emrType?: string;
}

export interface PriorAuthGatewayInput {
  gatewayPatientId: string;
  caseId: string;
  action: PriorAuthGatewayAction;
  procedureName?: string;
  icd10?: string;
  extractedDocumentText?: string;
  denialReason?: string;
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
    (asString(rootPayload.status)?.toLowerCase() === "error" ? asString(rootPayload.message) : null);

  const coverageStatus =
    asString(payload.coverageStatus) ||
    asString(payload.coverage_status) ||
    asString(payload.coverage) ||
    (rawError ? "Unknown" : asString(payload.status)) ||
    "Unknown";

  const explicitSuccess = asBoolean(payload.success) ?? asBoolean(rootPayload.success);
  const success =
    explicitSuccess ??
    (!rawError && asString(payload.status)?.toLowerCase() !== "error" && coverageStatus !== "Unknown");

  return {
    success,
    coverageStatus,
    coverage_status: coverageStatus,
    planName: asString(payload.planName) || asString(payload.plan_name) || asString(payload.plan) || "",
    plan_name: asString(payload.planName) || asString(payload.plan_name) || asString(payload.plan) || "",
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
    data: {
      patient_id: input.gatewayPatientId,
      patientFirstName: firstName,
      patientLastName: lastName,
      patientDob: input.dob || "",
      payerId: input.payerId || "",
      memberId: input.memberId,
      providerNpi: input.providerNpi || "",
      serviceDate: input.serviceDate || "",
      serviceTypeCode: input.serviceTypeCode || "30",
    },
  });
}

export async function sendPriorAuthAction(input: PriorAuthGatewayInput): Promise<unknown> {
  return postToGateway({
    routing_header: {
      module: "PA",
      action: input.action,
    },
    data: {
      patient_id: input.gatewayPatientId,
      case_id: input.caseId,
      procedureName: input.procedureName || "",
      icd10: input.icd10 || "",
      extracted_document_text: input.extractedDocumentText || "",
      denialReason: input.denialReason || "",
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

  return {
    action: asString(payload.action) || asString(rootPayload.action),
    status: asString(payload.status) || asString(rootPayload.status),
    message: asString(payload.message) || asString(rootPayload.message),
    confirmationNumber:
      asString(payload.confirmationNumber) || asString(payload.confirmation_number),
    confirmation_number:
      asString(payload.confirmationNumber) || asString(payload.confirmation_number),
    appealLetter: asString(payload.appealLetter) || asString(payload.appeal_letter),
    appeal_letter: asString(payload.appealLetter) || asString(payload.appeal_letter),
    checklistItems: payload.checklistItems || payload.checklist_items || null,
    checklist_items: payload.checklistItems || payload.checklist_items || null,
    missingItems: payload.missingItems || payload.missing_items || null,
    missing_items: payload.missingItems || payload.missing_items || null,
    confidenceScore: asNumber(payload.confidenceScore) ?? asNumber(payload.confidence_score),
    confidence_score: asNumber(payload.confidenceScore) ?? asNumber(payload.confidence_score),
    medicalNecessitySummary:
      asString(payload.medicalNecessitySummary) || asString(payload.medical_necessity_summary),
    medical_necessity_summary:
      asString(payload.medicalNecessitySummary) || asString(payload.medical_necessity_summary),
    rawResponse: raw,
    raw_response: raw,
  };
}

export default {
  buildGatewayPatientId,
  normalizeEligibilityGatewayResponse,
  normalizePriorAuthGatewayResponse,
  sendEligibilityVerification,
  sendPriorAuthAction,
};
