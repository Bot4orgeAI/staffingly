/**
 * OCR Service for Insurance Card Extraction
 *
 * Extraction order:
 * 1. OCR.space OCR + field parser
 * 2. Google Cloud Vision OCR + field parser
 * 3. Azure AI Document Intelligence
 * 4. No mock fallback - real OCR only
 */

type HeicConvertFn = (options: {
  buffer: Buffer;
  format: "JPEG" | "PNG";
  quality?: number;
}) => Promise<Buffer | Uint8Array>;

export interface ExtractedField {
  value: string | null;
  confidence: number; // 0-1
}

export interface InsuranceCardExtraction {
  payerName: ExtractedField;
  payerId: ExtractedField;
  memberId: ExtractedField;
  groupNumber: ExtractedField;
  subscriberName: ExtractedField;
  subscriberDob: ExtractedField;
  planName: ExtractedField;
  planType: ExtractedField;
  rxBin: ExtractedField;
  rxPcn: ExtractedField;
  rxGroup: ExtractedField;
  copay: ExtractedField;
  effectiveDate: ExtractedField;
}

export interface ExtractionResult {
  success: boolean;
  fields: InsuranceCardExtraction;
  overallConfidence: number;
  requiresReview: boolean;
  lowConfidenceFields: string[];
  channelUsed: "ocr-space" | "google-cloud-vision" | "azure";
  processingTimeMs: number;
  error?: string;
}

export type OcrProvider = "auto" | "ocr-space" | "google-cloud-vision" | "azure";
export type SupportedDocumentType =
  | "Insurance Card Front"
  | "Insurance Card Back"
  | "Explanation of Benefits (EOB)"
  | "Prior Authorization Letter"
  | "Referral Letter"
  | "Lab/Radiology Report"
  | "Other Document";

export interface GenericExtractionResult {
  success: boolean;
  fields: Record<string, string | null>;
  confidenceScores: Record<string, number>;
  overallConfidence: number;
  requiresReview: boolean;
  lowConfidenceFields: string[];
  channelUsed: "ocr-space" | "google-cloud-vision" | "azure" | "pdf-text";
  processingTimeMs: number;
  error?: string;
}

const SUPPORTED_DOCUMENT_TYPES: SupportedDocumentType[] = [
  "Insurance Card Front",
  "Insurance Card Back",
  "Explanation of Benefits (EOB)",
  "Prior Authorization Letter",
  "Referral Letter",
  "Lab/Radiology Report",
  "Other Document",
];

interface OcrSpaceResponse {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[] | string;
  ParsedResults?: Array<{
    ParsedText?: string;
  }>;
}

interface GoogleVisionResponse {
  responses?: Array<{
    textAnnotations?: Array<{
      description?: string;
    }>;
    fullTextAnnotation?: {
      text?: string;
    };
    error?: {
      message?: string;
    };
  }>;
}

const FIELD_NAMES: Array<keyof InsuranceCardExtraction> = [
  "payerName",
  "payerId",
  "memberId",
  "groupNumber",
  "subscriberName",
  "subscriberDob",
  "planName",
  "planType",
  "rxBin",
  "rxPcn",
  "rxGroup",
  "copay",
  "effectiveDate",
];

const KNOWN_PAYERS = [
  "UnitedHealthcare",
  "Aetna",
  "Blue Cross Blue Shield",
  "Blue Shield",
  "Anthem",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicare",
  "Medicaid",
  "Tricare",
  "Molina",
  "Centene",
  "Ambetter",
];

const PLAN_TYPE_PATTERNS = [
  "PPO",
  "HMO",
  "EPO",
  "POS",
  "HDHP",
  "Medicare Advantage",
  "Medicare Supplement",
  "Medicaid Managed Care",
  "Medicare",
  "Medicaid",
];

let azureClient: any = null;
let heicConvertModule: HeicConvertFn | null = null;

function clampConfidence(value: number | null | undefined, fallback = 0): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  if (value > 1) {
    return Math.max(0, Math.min(1, value / 100));
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeWhitespace(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function titleCaseWords(value: string | null | undefined): string | null {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return null;

  return cleaned
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeDate(value: string | null | undefined): string | null {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const slashMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const monthRaw = slashMatch[1];
    const dayRaw = slashMatch[2];
    const yearRaw = slashMatch[3];
    if (!monthRaw || !dayRaw || !yearRaw) {
      return cleaned;
    }

    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    const month = monthRaw.padStart(2, "0");
    const day = dayRaw.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0] || null;
  }

  return cleaned;
}

function normalizeMoney(value: string | null | undefined): string | null {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return null;

  const match = cleaned.match(/(\$?\d+(?:\.\d{1,2})?)/);
  const amount = match?.[1];
  if (!amount) {
    return cleaned;
  }

  return amount.startsWith("$") ? amount : `$${amount}`;
}

function normalizeMemberId(value: string | null | undefined): string | null {
  return normalizeWhitespace(value)?.replace(/[^\w-]/g, "") || null;
}

function normalizeGroupCode(value: string | null | undefined): string | null {
  return normalizeWhitespace(value)?.replace(/[^\w-]/g, "") || null;
}

function normalizePlanType(value: string | null | undefined): string | null {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return null;

  const matched = PLAN_TYPE_PATTERNS.find((planType) =>
    cleaned.toUpperCase().includes(planType.toUpperCase())
  );

  return matched ? titleCaseWords(matched) : titleCaseWords(cleaned);
}

function normalizeFieldValue(
  key: keyof InsuranceCardExtraction,
  value: string | null | undefined
): string | null {
  switch (key) {
    case "payerName":
    case "subscriberName":
    case "planName":
      return titleCaseWords(value);
    case "memberId":
    case "payerId":
      return normalizeMemberId(value);
    case "groupNumber":
    case "rxPcn":
    case "rxGroup":
      return normalizeGroupCode(value);
    case "subscriberDob":
    case "effectiveDate":
      return normalizeDate(value);
    case "planType":
      return normalizePlanType(value);
    case "rxBin":
      return normalizeWhitespace(value)?.replace(/[^\d]/g, "") || null;
    case "copay":
      return normalizeMoney(value);
    default:
      return normalizeWhitespace(value);
  }
}

function buildField(
  key: keyof InsuranceCardExtraction,
  value: string | null | undefined,
  confidence: number | null | undefined,
  fallbackConfidence = 0
): ExtractedField {
  return {
    value: normalizeFieldValue(key, value),
    confidence: clampConfidence(confidence, fallbackConfidence),
  };
}

function createEmptyExtraction(): InsuranceCardExtraction {
  return {
    payerName: buildField("payerName", null, 0),
    payerId: buildField("payerId", null, 0),
    memberId: buildField("memberId", null, 0),
    groupNumber: buildField("groupNumber", null, 0),
    subscriberName: buildField("subscriberName", null, 0),
    subscriberDob: buildField("subscriberDob", null, 0),
    planName: buildField("planName", null, 0),
    planType: buildField("planType", null, 0),
    rxBin: buildField("rxBin", null, 0),
    rxPcn: buildField("rxPcn", null, 0),
    rxGroup: buildField("rxGroup", null, 0),
    copay: buildField("copay", null, 0),
    effectiveDate: buildField("effectiveDate", null, 0),
  };
}

function finalizeResult(
  fields: InsuranceCardExtraction,
  channelUsed: ExtractionResult["channelUsed"],
  processingTimeMs: number,
  error?: string
): ExtractionResult {
  const fieldEntries = Object.entries(fields) as [keyof InsuranceCardExtraction, ExtractedField][];
  const confidences = fieldEntries
    .filter(([, field]) => field.value !== null)
    .map(([, field]) => field.confidence);

  const overallConfidence =
    confidences.length > 0
      ? Math.round((confidences.reduce((total, value) => total + value, 0) / confidences.length) * 100)
      : 0;

  const lowConfidenceFields = fieldEntries
    .filter(([, field]) => field.value !== null && field.confidence < 0.8)
    .map(([name]) => name);

  const requiredFieldsPresent = Boolean(fields.payerName.value || fields.memberId.value);

  return {
    success: requiredFieldsPresent,
    fields,
    overallConfidence,
    requiresReview:
      !requiredFieldsPresent || overallConfidence < 80 || lowConfidenceFields.length > 0,
    lowConfidenceFields,
    channelUsed,
    processingTimeMs,
    error,
  };
}

function shouldAcceptResult(result: ExtractionResult): boolean {
  return Boolean(result.fields.memberId.value && result.overallConfidence >= 70);
}

function createProviderUnavailableResult(
  channelUsed: ExtractionResult["channelUsed"],
  error: string
): ExtractionResult {
  return finalizeResult(createEmptyExtraction(), channelUsed, 0, error);
}

function extractLabeledValue(text: string, labels: string[], pattern = "([A-Z0-9][A-Z0-9\\-\\/ ]{1,40})") {
  for (const label of labels) {
    const regex = new RegExp(`${label}[\\s:#-]*${pattern}`, "i");
    const match = text.match(regex);
    if (match?.[1]) {
      return normalizeWhitespace(match[1]);
    }
  }

  return null;
}

function extractKnownPayer(text: string): string | null {
  const matched = KNOWN_PAYERS.find((payer) => text.toUpperCase().includes(payer.toUpperCase()));
  if (matched) {
    return matched;
  }

  const firstLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  const likelyPayer = firstLines.find(
    (line) =>
      line.length > 3 &&
      line.length < 50 &&
      !/\d{3,}/.test(line) &&
      !/(member|group|rx|dob|effective|copay|pcn|bin)/i.test(line)
  );

  return titleCaseWords(likelyPayer);
}

function extractName(text: string): string | null {
  const labeled = extractLabeledValue(text, ["member name", "subscriber name", "name"], "([A-Z][A-Z ,.'-]{2,50})");
  if (labeled) {
    return titleCaseWords(labeled);
  }

  const lineMatch = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^[A-Z][A-Z ,.'-]{4,50}$/.test(line) && !KNOWN_PAYERS.some((payer) => line.includes(payer.toUpperCase())));

  return titleCaseWords(lineMatch);
}

function parseInsuranceCardText(rawText: string): InsuranceCardExtraction {
  const text = rawText.replace(/\r/g, "");
  const extraction = createEmptyExtraction();

  extraction.payerName = buildField("payerName", extractKnownPayer(text), 0.76);
  extraction.payerId = buildField(
    "payerId",
    extractLabeledValue(
      text,
      ["payer id", "payor id", "payer#", "payor#", "payer no", "payor no"],
      "([A-Z0-9\\-]{2,20})"
    ),
    0.8
  );
  extraction.memberId = buildField(
    "memberId",
    extractLabeledValue(text, ["member id", "member#", "member no", "id#", "id no", "subscriber id", "identification number"]),
    0.84
  );
  extraction.groupNumber = buildField(
    "groupNumber",
    extractLabeledValue(text, ["group number", "group#", "grp#", "group no", "group"]),
    0.8
  );
  extraction.subscriberName = buildField("subscriberName", extractName(text), 0.74);
  extraction.subscriberDob = buildField(
    "subscriberDob",
    extractLabeledValue(text, ["dob", "date of birth", "birth date"], "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})"),
    0.78
  );
  extraction.planName = buildField(
    "planName",
    extractLabeledValue(text, ["plan name", "plan"], "([A-Z0-9][A-Z0-9\\-\\/ ]{2,50})"),
    0.68
  );
  extraction.planType = buildField(
    "planType",
    PLAN_TYPE_PATTERNS.find((planType) => text.toUpperCase().includes(planType.toUpperCase())) || null,
    0.75
  );
  extraction.rxBin = buildField(
    "rxBin",
    extractLabeledValue(text, ["rxbin", "rx bin", "bin"], "(\\d{6,8})"),
    0.83
  );
  extraction.rxPcn = buildField(
    "rxPcn",
    extractLabeledValue(text, ["rxpcn", "rx pcn", "pcn"], "([A-Z0-9\\-]{2,20})"),
    0.8
  );
  extraction.rxGroup = buildField(
    "rxGroup",
    extractLabeledValue(text, ["rxgrp", "rx group", "rxgroup"], "([A-Z0-9\\-]{2,20})"),
    0.78
  );
  extraction.copay = buildField(
    "copay",
    extractLabeledValue(text, ["copay", "co-pay"], "(\\$?\\d+(?:\\.\\d{1,2})?)"),
    0.68
  );
  extraction.effectiveDate = buildField(
    "effectiveDate",
    extractLabeledValue(text, ["effective date", "effective"], "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})"),
    0.72
  );

  return extraction;
}

function extractSimplePdfText(buffer: Buffer): string | null {
  const text = buffer
    .toString("latin1")
    .replace(/\r/g, "\n")
    .replace(/[^\x20-\x7E\n]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return text.length >= 20 ? text : null;
}

function extractDiagnosisCodes(text: string): string[] {
  return [...new Set(text.match(/\b[A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?\b/g) || [])].slice(
    0,
    5
  );
}

function extractProcedureCodes(text: string): string[] {
  return [...new Set(text.match(/\b\d{5}\b/g) || [])].slice(0, 5);
}

function extractCommonDocumentFields(text: string): Record<string, string | null> {
  const patientName =
    extractName(text) || extractLabeledValue(text, ["patient name"], "([A-Z][A-Z ,.'-]{2,50})");
  const payerName =
    extractKnownPayer(text) ||
    extractLabeledValue(text, ["payer", "insurance", "insurance company"], "([A-Z][A-Z0-9 &'./-]{2,60})");
  const memberId = extractLabeledValue(
    text,
    ["member id", "member#", "subscriber id", "insurance id", "id number"],
    "([A-Z0-9\\-]{3,30})"
  );
  const groupNumber = extractLabeledValue(text, ["group number", "group#", "group"], "([A-Z0-9\\-]{2,30})");
  const patientDob = extractLabeledValue(
    text,
    ["dob", "date of birth", "patient dob", "birth date"],
    "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})"
  );
  const serviceDate = extractLabeledValue(
    text,
    ["service date", "date of service", "dos"],
    "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})"
  );
  const authorizationNumber = extractLabeledValue(
    text,
    ["authorization number", "auth number", "auth #", "authorization #"],
    "([A-Z0-9\\-]{4,30})"
  );
  const referralNumber = extractLabeledValue(
    text,
    ["referral number", "referral #"],
    "([A-Z0-9\\-]{4,30})"
  );
  const providerName =
    extractLabeledValue(
      text,
      ["provider", "ordering provider", "referring provider", "physician", "doctor"],
      "([A-Z][A-Z ,.'-]{2,50})"
    ) || null;

  return {
    patientName: titleCaseWords(patientName),
    patientDob: normalizeDate(patientDob),
    payerName: titleCaseWords(payerName),
    payerId: extractLabeledValue(text, ["payer id", "payor id"], "([A-Z0-9\\-]{2,20})"),
    memberId: normalizeMemberId(memberId),
    groupNumber: normalizeGroupCode(groupNumber),
    planName: titleCaseWords(extractLabeledValue(text, ["plan name", "plan"], "([A-Z0-9][A-Z0-9\\-\\/ ]{2,50})")),
    planType: normalizePlanType(
      PLAN_TYPE_PATTERNS.find((planType) => text.toUpperCase().includes(planType.toUpperCase())) || null
    ),
    subscriberName: titleCaseWords(
      extractLabeledValue(text, ["subscriber name", "member name"], "([A-Z][A-Z ,.'-]{2,50})")
    ),
    subscriberDob: normalizeDate(
      extractLabeledValue(text, ["subscriber dob"], "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})")
    ),
    rxBin: normalizeWhitespace(extractLabeledValue(text, ["rxbin", "rx bin", "bin"], "(\\d{6,8})")),
    rxPcn: normalizeWhitespace(extractLabeledValue(text, ["rxpcn", "rx pcn", "pcn"], "([A-Z0-9\\-]{2,20})")),
    rxGroup: normalizeWhitespace(extractLabeledValue(text, ["rxgrp", "rx group"], "([A-Z0-9\\-]{2,20})")),
    effectiveDate: normalizeDate(
      extractLabeledValue(text, ["effective date", "effective"], "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})")
    ),
    serviceDate: normalizeDate(serviceDate),
    providerName: titleCaseWords(providerName),
    authorizationNumber: normalizeWhitespace(authorizationNumber),
    referralNumber: normalizeWhitespace(referralNumber),
    denialReason: normalizeWhitespace(
      extractLabeledValue(text, ["denial reason", "reason for denial"], "([A-Z0-9 ,.'()/-]{5,120})")
    ),
    diagnosisCodes: extractDiagnosisCodes(text).join(", ") || null,
    procedureCodes: extractProcedureCodes(text).join(", ") || null,
    extractedTextSnippet: normalizeWhitespace(text.slice(0, 500)),
  };
}

function buildGenericConfidenceScores(
  fields: Record<string, string | null>,
  baseConfidence: number,
  documentType: SupportedDocumentType
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;

    let score = baseConfidence;
    if (field === "patientName" || field === "payerName" || field === "memberId") score += 8;
    if (documentType.includes("Insurance Card")) score += 6;
    if (field === "diagnosisCodes" || field === "procedureCodes") score -= 6;

    scores[field] = Math.max(40, Math.min(95, Math.round(score)));
  }

  return scores;
}

function buildGenericExtractionResult(
  fields: Record<string, string | null>,
  documentType: SupportedDocumentType,
  channelUsed: GenericExtractionResult["channelUsed"],
  processingTimeMs: number,
  error?: string
): GenericExtractionResult {
  const populatedFieldCount = Object.values(fields).filter(Boolean).length;
  const baseConfidence = documentType.includes("Insurance Card") ? 78 : 68;
  const confidenceScores = buildGenericConfidenceScores(fields, baseConfidence, documentType);
  const scoreValues = Object.values(confidenceScores);
  const overallConfidence = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
    : 0;
  const lowConfidenceFields = Object.entries(confidenceScores)
    .filter(([, value]) => value < 70)
    .map(([field]) => field);

  return {
    success: populatedFieldCount > 0,
    fields,
    confidenceScores,
    overallConfidence,
    requiresReview: overallConfidence < 75 || lowConfidenceFields.length > 0,
    lowConfidenceFields,
    channelUsed,
    processingTimeMs,
    error,
  };
}

function normalizeSupportedDocumentType(documentType: string | null | undefined): SupportedDocumentType {
  if (!documentType) {
    return "Other Document";
  }

  const matchedType = SUPPORTED_DOCUMENT_TYPES.find((type) => type === documentType);
  return matchedType || "Other Document";
}

function buildInsuranceCardGenericResult(
  extraction: ExtractionResult
): GenericExtractionResult {
  return {
    success: extraction.success,
    fields: flattenExtraction(extraction.fields),
    confidenceScores: getConfidenceScores(extraction.fields),
    overallConfidence: extraction.overallConfidence,
    requiresReview: extraction.requiresReview,
    lowConfidenceFields: extraction.lowConfidenceFields,
    channelUsed: extraction.channelUsed,
    processingTimeMs: extraction.processingTimeMs,
    error: extraction.error,
  };
}

function extractDocumentSpecificFields(
  text: string,
  documentType: SupportedDocumentType
): Record<string, string | null> {
  const upperText = text.toUpperCase();
  const denialReason = normalizeWhitespace(
    extractLabeledValue(
      text,
      ["denial reason", "reason for denial", "denied because", "adverse determination"],
      "([A-Z0-9 ,.'()/:;-]{5,160})"
    )
  );
  const decisionStatus = normalizeWhitespace(
    extractLabeledValue(
      text,
      ["status", "authorization status", "determination"],
      "([A-Z][A-Z /-]{2,40})"
    )
  );
  const claimNumber = normalizeWhitespace(
    extractLabeledValue(text, ["claim number", "claim #"], "([A-Z0-9\\-]{4,30})")
  );

  switch (documentType) {
    case "Explanation of Benefits (EOB)":
      return {
        claimNumber,
        denialReason,
        decisionStatus:
          decisionStatus ||
          (upperText.includes("DENIED")
            ? "Denied"
            : upperText.includes("APPROVED")
              ? "Approved"
              : null),
      };
    case "Prior Authorization Letter":
      return {
        authorizationNumber: normalizeWhitespace(
          extractLabeledValue(
            text,
            ["authorization number", "auth number", "auth #", "prior auth number"],
            "([A-Z0-9\\-]{4,30})"
          )
        ),
        denialReason,
        decisionStatus:
          decisionStatus ||
          (upperText.includes("APPROVED")
            ? "Approved"
            : upperText.includes("DENIED")
              ? "Denied"
              : null),
      };
    case "Referral Letter":
      return {
        referralNumber: normalizeWhitespace(
          extractLabeledValue(
            text,
            ["referral number", "referral #", "reference number"],
            "([A-Z0-9\\-]{4,30})"
          )
        ),
        providerName: titleCaseWords(
          extractLabeledValue(
            text,
            ["referring provider", "referred to", "provider", "physician"],
            "([A-Z][A-Z ,.'-]{2,60})"
          )
        ),
      };
    case "Lab/Radiology Report":
      return {
        orderingProvider: titleCaseWords(
          extractLabeledValue(
            text,
            ["ordering provider", "provider", "physician", "doctor"],
            "([A-Z][A-Z ,.'-]{2,60})"
          )
        ),
        reportType: normalizeWhitespace(
          extractLabeledValue(
            text,
            ["exam", "study", "report type", "test"],
            "([A-Z0-9 ,.'()/-]{3,80})"
          )
        ),
      };
    default:
      return {
        claimNumber,
        denialReason,
        decisionStatus,
      };
  }
}

function parseGenericDocumentText(
  text: string,
  documentType: SupportedDocumentType
): Record<string, string | null> {
  const commonFields = extractCommonDocumentFields(text);
  const specificFields = extractDocumentSpecificFields(text, documentType);

  return {
    ...commonFields,
    ...specificFields,
  };
}

async function extractGenericTextWithProvider(
  fileBuffer: Buffer,
  mimeType: string,
  provider: OcrProvider
): Promise<{
  text: string | null;
  channelUsed: GenericExtractionResult["channelUsed"];
  processingTimeMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  if (mimeType === "application/pdf") {
    const pdfText = extractSimplePdfText(fileBuffer);
    if (pdfText) {
      return {
        text: pdfText,
        channelUsed: "pdf-text",
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  const prepared = await preprocessImage(fileBuffer, mimeType);

  if (provider === "ocr-space") {
    try {
      return {
        text: await extractTextWithOcrSpace(prepared.buffer, prepared.mimeType),
        channelUsed: "ocr-space",
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        text: null,
        channelUsed: "ocr-space",
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  if (provider === "google-cloud-vision") {
    try {
      return {
        text: await extractTextWithGoogleCloudVision(prepared.buffer, prepared.mimeType),
        channelUsed: "google-cloud-vision",
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        text: null,
        channelUsed: "google-cloud-vision",
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  if (provider === "azure") {
    return {
      text: null,
      channelUsed: "azure",
      processingTimeMs: Date.now() - startTime,
      error: "Azure extraction is currently only configured for insurance cards.",
    };
  }

  if (isOcrSpaceAvailable()) {
    try {
      const text = await extractTextWithOcrSpace(prepared.buffer, prepared.mimeType);
      if (text) {
        return {
          text,
          channelUsed: "ocr-space",
          processingTimeMs: Date.now() - startTime,
        };
      }
    } catch (error) {
      // Fall through to the next provider.
      console.warn("OCR.space generic extraction failed:", (error as Error).message);
    }
  }

  if (isGoogleCloudVisionAvailable()) {
    try {
      const text = await extractTextWithGoogleCloudVision(prepared.buffer, prepared.mimeType);
      if (text) {
        return {
          text,
          channelUsed: "google-cloud-vision",
          processingTimeMs: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.warn("Google Cloud Vision generic extraction failed:", (error as Error).message);
    }
  }

  return {
    text: null,
    channelUsed: mimeType === "application/pdf" ? "pdf-text" : "ocr-space",
    processingTimeMs: Date.now() - startTime,
    error:
      "No configured OCR provider could extract readable text from this document. Try a clearer scan or image.",
  };
}

function getOcrSpaceApiKey(): string | null {
  return process.env.OCR_SPACE_API_KEY || null;
}

export function isOcrSpaceAvailable(): boolean {
  return Boolean(getOcrSpaceApiKey());
}

function getGoogleCloudVisionApiKey(): string | null {
  return process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_API_KEY || null;
}

export function isGoogleCloudVisionAvailable(): boolean {
  return Boolean(getGoogleCloudVisionApiKey());
}

async function initAzureClient(): Promise<boolean> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    return false;
  }

  if (!azureClient) {
    try {
      // @ts-expect-error - Optional dependency, may not be installed
      const azureModule = await import("@azure/ai-form-recognizer");
      const DocumentAnalysisClient = azureModule.DocumentAnalysisClient;
      const AzureKeyCredential = azureModule.AzureKeyCredential;
      azureClient = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    } catch {
      console.warn("Azure AI Form Recognizer SDK not installed");
      return false;
    }
  }

  return true;
}

export async function isAzureAvailable(): Promise<boolean> {
  return await initAzureClient();
}

function isHeicMimeType(mimeType: string | undefined): boolean {
  return mimeType === "image/heic" || mimeType === "image/heif";
}

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  if (!heicConvertModule) {
    const imported = await import("heic-convert");
    heicConvertModule = (imported.default || imported) as HeicConvertFn;
  }

  if (!heicConvertModule) {
    throw new Error("HEIC conversion module failed to load");
  }

  const converted = await heicConvertModule({
    buffer,
    format: "JPEG",
    quality: 0.92,
  });

  return Buffer.isBuffer(converted) ? converted : Buffer.from(converted);
}

async function preprocessImage(
  imageBuffer: Buffer,
  mimeType?: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (isHeicMimeType(mimeType)) {
    return {
      buffer: await convertHeicToJpeg(imageBuffer),
      mimeType: "image/jpeg",
    };
  }

  return {
    buffer: imageBuffer,
    mimeType: mimeType || "image/jpeg",
  };
}

async function extractTextWithOcrSpace(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const apiKey = getOcrSpaceApiKey();
  if (!apiKey) {
    return null;
  }

  const formData = new FormData();
  formData.append("apikey", apiKey);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");
  formData.append("scale", "true");
  formData.append(
    "base64Image",
    `data:${mimeType};base64,${imageBuffer.toString("base64")}`
  );

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR.space request failed with ${response.status}`);
  }

  const data = (await response.json()) as OcrSpaceResponse;
  if (data.IsErroredOnProcessing) {
    const errorMessage = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join(", ")
      : data.ErrorMessage;
    throw new Error(errorMessage || "OCR.space failed to process the image");
  }

  const parsedText = data.ParsedResults?.map((result) => result.ParsedText || "").join("\n").trim();
  return parsedText || null;
}

async function extractWithOcrSpace(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const startTime = Date.now();
  if (!isOcrSpaceAvailable()) {
    return createProviderUnavailableResult("ocr-space", "OCR.space is not configured");
  }

  try {
    const text = await extractTextWithOcrSpace(imageBuffer, mimeType);
    if (!text) {
      return finalizeResult(
        createEmptyExtraction(),
        "ocr-space",
        Date.now() - startTime,
        "OCR.space returned no text"
      );
    }

    return finalizeResult(parseInsuranceCardText(text), "ocr-space", Date.now() - startTime);
  } catch (error) {
    return finalizeResult(
      createEmptyExtraction(),
      "ocr-space",
      Date.now() - startTime,
      (error as Error).message
    );
  }
}

async function extractTextWithGoogleCloudVision(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const apiKey = getGoogleCloudVisionApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: imageBuffer.toString("base64"),
          },
          features: [
            {
              type: "TEXT_DETECTION",
            },
          ],
          imageContext: {
            languageHints: ["en"],
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Cloud Vision request failed with ${response.status}`);
  }

  const data = (await response.json()) as GoogleVisionResponse;
  const result = data.responses?.[0];
  if (result?.error?.message) {
    throw new Error(result.error.message);
  }

  const fullText = result?.fullTextAnnotation?.text || result?.textAnnotations?.[0]?.description || null;
  return normalizeWhitespace(fullText);
}

async function extractWithGoogleCloudVision(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const startTime = Date.now();
  if (!isGoogleCloudVisionAvailable()) {
    return createProviderUnavailableResult(
      "google-cloud-vision",
      "Google Cloud Vision is not configured"
    );
  }

  try {
    const text = await extractTextWithGoogleCloudVision(imageBuffer, mimeType);
    if (!text) {
      return finalizeResult(
        createEmptyExtraction(),
        "google-cloud-vision",
        Date.now() - startTime,
        "Google Cloud Vision returned no text"
      );
    }

    return finalizeResult(
      parseInsuranceCardText(text),
      "google-cloud-vision",
      Date.now() - startTime
    );
  } catch (error) {
    return finalizeResult(
      createEmptyExtraction(),
      "google-cloud-vision",
      Date.now() - startTime,
      (error as Error).message
    );
  }
}

function mapAzureFields(
  azureFields: Record<string, { value?: string; content?: string; confidence?: number }>
): InsuranceCardExtraction {
  const getField = (
    key: keyof InsuranceCardExtraction,
    fieldName: string,
    fallbackFieldName?: string
  ): ExtractedField => {
    const field =
      azureFields[fieldName] || (fallbackFieldName ? azureFields[fallbackFieldName] : undefined);
    return buildField(key, field?.value || field?.content || null, field?.confidence || 0);
  };

  return {
    payerName: getField("payerName", "Insurer", "InsuranceCompany"),
    payerId: getField("payerId", "PayerId"),
    memberId: getField("memberId", "MemberId", "IdNumber"),
    groupNumber: getField("groupNumber", "GroupNumber"),
    subscriberName: getField("subscriberName", "MemberName", "SubscriberName"),
    subscriberDob: getField("subscriberDob", "DateOfBirth"),
    planName: getField("planName", "PlanName"),
    planType: getField("planType", "PlanType"),
    rxBin: getField("rxBin", "RxBin"),
    rxPcn: getField("rxPcn", "RxPCN"),
    rxGroup: getField("rxGroup", "RxGrp", "RxGroup"),
    copay: getField("copay", "Copay"),
    effectiveDate: getField("effectiveDate", "EffectiveDate"),
  };
}

async function extractWithAzure(imageBuffer: Buffer): Promise<ExtractionResult> {
  const startTime = Date.now();

  if (!(await initAzureClient()) || !azureClient) {
    return createProviderUnavailableResult("azure", "Azure Document Intelligence is not configured");
  }

  try {
    const poller = await azureClient.beginAnalyzeDocument(
      "prebuilt-healthInsuranceCard.us",
      imageBuffer
    );
    const result = await poller.pollUntilDone();

    if (!result.documents || result.documents.length === 0) {
      return finalizeResult(
        createEmptyExtraction(),
        "azure",
        Date.now() - startTime,
        "No insurance card detected in image"
      );
    }

    const document = result.documents[0];
    return finalizeResult(mapAzureFields(document.fields || {}), "azure", Date.now() - startTime);
  } catch (error) {
    return finalizeResult(
      createEmptyExtraction(),
      "azure",
      Date.now() - startTime,
      (error as Error).message
    );
  }
}

export async function getAvailableOcrProviders(): Promise<
  Array<{ id: Exclude<OcrProvider, "auto">; label: string; available: boolean }>
> {
  return [
    { id: "ocr-space", label: "OCR.space", available: isOcrSpaceAvailable() },
    {
      id: "google-cloud-vision",
      label: "Google Cloud Vision",
      available: isGoogleCloudVisionAvailable(),
    },
    { id: "azure", label: "Azure Document Intelligence", available: await isAzureAvailable() },
  ];
}

export async function extractInsuranceCard(
  imageBuffer: Buffer,
  mimeType?: string,
  provider: OcrProvider = "auto"
): Promise<ExtractionResult> {
  const prepared = await preprocessImage(imageBuffer, mimeType);

  if (provider === "ocr-space") {
    return extractWithOcrSpace(prepared.buffer, prepared.mimeType);
  }

  if (provider === "google-cloud-vision") {
    return extractWithGoogleCloudVision(prepared.buffer, prepared.mimeType);
  }

  if (provider === "azure") {
    return extractWithAzure(prepared.buffer);
  }

  const ocrSpaceResult = await extractWithOcrSpace(prepared.buffer, prepared.mimeType);
  if (isOcrSpaceAvailable() && shouldAcceptResult(ocrSpaceResult)) {
    console.log("Using OCR.space for insurance card extraction");
    return ocrSpaceResult;
  }

  const googleVisionResult = await extractWithGoogleCloudVision(prepared.buffer, prepared.mimeType);
  if (isGoogleCloudVisionAvailable() && shouldAcceptResult(googleVisionResult)) {
    console.log("Using Google Cloud Vision for insurance card extraction");
    return googleVisionResult;
  }

  const azureResult = await extractWithAzure(prepared.buffer);
  if (await isAzureAvailable()) {
    console.log("Using Azure AI Document Intelligence for OCR");
    return shouldAcceptResult(azureResult) ? azureResult : azureResult;
  }

  const availableProviders = await getAvailableOcrProviders();
  const configuredProviders = availableProviders.filter((item) => item.available).map((item) => item.label);
  const error =
    configuredProviders.length > 0
      ? "Configured OCR providers could not extract usable insurance data from this image."
      : "No OCR provider is configured. Configure OCR.space, Google Cloud Vision, or Azure Document Intelligence.";

  return finalizeResult(createEmptyExtraction(), "ocr-space", 0, error);
}

export async function extractDocumentData(
  fileBuffer: Buffer,
  mimeType = "image/jpeg",
  documentType: SupportedDocumentType,
  provider: OcrProvider = "auto"
): Promise<GenericExtractionResult> {
  const normalizedDocumentType = normalizeSupportedDocumentType(documentType);

  if (
    normalizedDocumentType === "Insurance Card Front" ||
    normalizedDocumentType === "Insurance Card Back"
  ) {
    const insuranceExtraction = await extractInsuranceCard(fileBuffer, mimeType, provider);
    return buildInsuranceCardGenericResult(insuranceExtraction);
  }

  const extractedText = await extractGenericTextWithProvider(fileBuffer, mimeType, provider);
  if (!extractedText.text) {
    return buildGenericExtractionResult(
      parseGenericDocumentText("", normalizedDocumentType),
      normalizedDocumentType,
      extractedText.channelUsed,
      extractedText.processingTimeMs,
      extractedText.error || "No readable text was found in the uploaded document."
    );
  }

  return buildGenericExtractionResult(
    parseGenericDocumentText(extractedText.text, normalizedDocumentType),
    normalizedDocumentType,
    extractedText.channelUsed,
    extractedText.processingTimeMs,
    extractedText.error
  );
}

export function flattenExtraction(
  extraction: InsuranceCardExtraction
): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  for (const key of FIELD_NAMES) {
    result[key] = extraction[key].value;
  }

  return result;
}

export function getConfidenceScores(extraction: InsuranceCardExtraction): Record<string, number> {
  const result: Record<string, number> = {};

  for (const key of FIELD_NAMES) {
    result[key] = Math.round(extraction[key].confidence * 100);
  }

  return result;
}

export default {
  extractDocumentData,
  extractInsuranceCard,
  flattenExtraction,
  getConfidenceScores,
  isOcrSpaceAvailable,
  isGoogleCloudVisionAvailable,
  isAzureAvailable,
  getAvailableOcrProviders,
};
