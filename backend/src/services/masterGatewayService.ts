import { createHash } from "crypto";

const MASTER_GATEWAY_URL = process.env.N8N_MASTER_GATEWAY_URL;

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
    throw new Error("N8N_MASTER_GATEWAY_URL is not configured");
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

export function normalizeEligibilityGatewayResponse(raw: unknown): Record<string, unknown> {
  const payload = isRecord(raw)
    ? isRecord(raw.data)
      ? raw.data
      : isRecord(raw.result)
        ? raw.result
        : raw
    : {};

  const coverageStatus =
    payload.coverageStatus ||
    payload.coverage_status ||
    payload.coverage ||
    payload.status ||
    "Unknown";

  return {
    success:
      payload.success !== undefined
        ? Boolean(payload.success)
        : !payload.error && !payload.errorMessage,
    coverageStatus,
    coverage_status: coverageStatus,
    planName: payload.planName || payload.plan_name || payload.plan || "",
    plan_name: payload.planName || payload.plan_name || payload.plan || "",
    planType: payload.planType || payload.plan_type || "",
    plan_type: payload.planType || payload.plan_type || "",
    networkStatus: payload.networkStatus || payload.network_status || "",
    network_status: payload.networkStatus || payload.network_status || "",
    effectiveDate: payload.effectiveDate || payload.effective_date || null,
    effective_date: payload.effectiveDate || payload.effective_date || null,
    terminationDate: payload.terminationDate || payload.termination_date || null,
    termination_date: payload.terminationDate || payload.termination_date || null,
    groupNumber: payload.groupNumber || payload.group_number || null,
    group_number: payload.groupNumber || payload.group_number || null,
    benefitsRaw: payload.benefitsRaw || payload.benefits_raw || [],
    benefits_raw: payload.benefitsRaw || payload.benefits_raw || [],
    confidenceScore: payload.confidenceScore || payload.confidence_score || null,
    confidence_score: payload.confidenceScore || payload.confidence_score || null,
    responseTimeSeconds: payload.responseTimeSeconds || payload.response_time_seconds || null,
    response_time_seconds: payload.responseTimeSeconds || payload.response_time_seconds || null,
    channelUsed: payload.channelUsed || payload.channel_used || "n8n Master Gateway",
    channel_used: payload.channelUsed || payload.channel_used || "n8n Master Gateway",
    flags: Array.isArray(payload.flags) ? payload.flags : [],
    requiresHumanReview:
      payload.requiresHumanReview || payload.requires_human_review || false,
    requires_human_review:
      payload.requiresHumanReview || payload.requires_human_review || false,
    rawResponse: raw,
    raw_response: raw,
    error: payload.error || payload.errorMessage || payload.message || null,
  };
}

export async function sendEligibilityVerification(
  input: EligibilityGatewayInput
): Promise<unknown> {
  const { firstName, lastName } = splitName(input.patientName);

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

export default {
  buildGatewayPatientId,
  normalizeEligibilityGatewayResponse,
  sendEligibilityVerification,
  sendPriorAuthAction,
};
