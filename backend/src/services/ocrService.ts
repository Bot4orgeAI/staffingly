/**
 * OCR Service for Insurance Card Extraction
 *
 * Uses Azure AI Document Intelligence (prebuilt-healthInsuranceCard.us model) in production.
 * Falls back to mock data when Azure credentials are not configured (local development).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedField {
  value: string | null;
  confidence: number; // 0-1
}

export interface InsuranceCardExtraction {
  payerName: ExtractedField;
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
  channelUsed: "azure" | "mock";
  processingTimeMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Azure Client Initialization
// ─────────────────────────────────────────────────────────────────────────────

let azureClient: any = null;

/**
 * Initialize Azure Document Intelligence client
 */
async function initAzureClient(): Promise<boolean> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    return false;
  }

  if (!azureClient) {
    try {
      // Dynamic import - SDK is optional
      // @ts-expect-error - Optional dependency, may not be installed
      const azureModule = await import("@azure/ai-form-recognizer");
      const DocumentAnalysisClient = azureModule.DocumentAnalysisClient;
      const AzureKeyCredential = azureModule.AzureKeyCredential;
      azureClient = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    } catch {
      console.warn("Azure AI Form Recognizer SDK not installed, using mock OCR");
      return false;
    }
  }

  return true;
}

/**
 * Check if Azure OCR is available
 */
export async function isAzureAvailable(): Promise<boolean> {
  return await initAzureClient();
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data for Development
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PAYERS = [
  "UnitedHealthcare",
  "Aetna",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Anthem",
];

const MOCK_PLAN_TYPES = ["PPO", "HMO", "EPO", "POS", "HDHP"];

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomConfidence(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function generateMockMemberId(): string {
  const prefix = randomElement(["UHC", "AET", "BCBS", "CIG", "HUM"]);
  const num = Math.floor(Math.random() * 900000000) + 100000000;
  return `${prefix}-${num}`;
}

function generateMockGroupNumber(): string {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `GRP-${num}`;
}

function generateMockName(): string {
  const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

function generateMockDob(): string {
  const year = 1950 + Math.floor(Math.random() * 50);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateMockExtraction(): InsuranceCardExtraction {
  // Simulate varying confidence levels - some fields are harder to extract
  return {
    payerName: {
      value: randomElement(MOCK_PAYERS),
      confidence: randomConfidence(0.85, 0.98),
    },
    memberId: {
      value: generateMockMemberId(),
      confidence: randomConfidence(0.88, 0.99),
    },
    groupNumber: {
      value: generateMockGroupNumber(),
      confidence: randomConfidence(0.75, 0.95),
    },
    subscriberName: {
      value: generateMockName(),
      confidence: randomConfidence(0.82, 0.96),
    },
    subscriberDob: {
      value: generateMockDob(),
      confidence: randomConfidence(0.7, 0.92),
    },
    planName: {
      value: `${randomElement(MOCK_PAYERS)} ${randomElement(MOCK_PLAN_TYPES)} Plan`,
      confidence: randomConfidence(0.65, 0.9),
    },
    planType: {
      value: randomElement(MOCK_PLAN_TYPES),
      confidence: randomConfidence(0.8, 0.95),
    },
    rxBin: {
      value: String(Math.floor(Math.random() * 900000) + 100000),
      confidence: randomConfidence(0.6, 0.88),
    },
    rxPcn: {
      value: randomElement(["MCAID", "ADV", "SYRX", "CAREMARK", null]),
      confidence: randomConfidence(0.55, 0.85),
    },
    rxGroup: {
      value: `RX${Math.floor(Math.random() * 9000) + 1000}`,
      confidence: randomConfidence(0.58, 0.82),
    },
    copay: {
      value: randomElement(["$20", "$25", "$30", "$35", "$40", null]),
      confidence: randomConfidence(0.5, 0.78),
    },
    effectiveDate: {
      value: `2024-01-01`,
      confidence: randomConfidence(0.72, 0.9),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Azure Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map Azure Document Intelligence fields to our schema
 */
function mapAzureFields(
  azureFields: Record<string, { value?: string; content?: string; confidence?: number }>
): InsuranceCardExtraction {
  const getField = (fieldName: string): ExtractedField => {
    const field = azureFields[fieldName];
    return {
      value: field?.value || field?.content || null,
      confidence: field?.confidence || 0,
    };
  };

  return {
    payerName: getField("Insurer"),
    memberId: getField("MemberId"),
    groupNumber: getField("GroupNumber"),
    subscriberName: getField("MemberName"),
    subscriberDob: getField("DateOfBirth"),
    planName: getField("PlanName"),
    planType: getField("PlanType"),
    rxBin: getField("RxBin"),
    rxPcn: getField("RxPCN"),
    rxGroup: getField("RxGrp"),
    copay: getField("Copay"),
    effectiveDate: getField("EffectiveDate"),
  };
}

async function extractWithAzure(imageBuffer: Buffer): Promise<ExtractionResult> {
  const startTime = Date.now();

  if (!azureClient) {
    throw new Error("Azure client not initialized");
  }

  try {
    // Use the prebuilt health insurance card model
    const poller = await azureClient.beginAnalyzeDocument(
      "prebuilt-healthInsuranceCard.us",
      imageBuffer
    );

    const result = await poller.pollUntilDone();

    const processingTimeMs = Date.now() - startTime;

    if (!result.documents || result.documents.length === 0) {
      return {
        success: false,
        fields: generateMockExtraction(), // Fallback to mock on failure
        overallConfidence: 0,
        requiresReview: true,
        lowConfidenceFields: [],
        channelUsed: "azure",
        processingTimeMs,
        error: "No insurance card detected in image",
      };
    }

    const document = result.documents[0];
    const fields = mapAzureFields(document.fields || {});

    // Calculate overall confidence and find low-confidence fields
    const fieldEntries = Object.entries(fields) as [
      keyof InsuranceCardExtraction,
      ExtractedField,
    ][];
    const confidences = fieldEntries
      .filter(([, f]) => f.value !== null)
      .map(([, f]) => f.confidence);

    const overallConfidence =
      confidences.length > 0
        ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
        : 0;

    const lowConfidenceFields = fieldEntries
      .filter(([, f]) => f.value !== null && f.confidence < 0.8)
      .map(([name]) => name);

    return {
      success: true,
      fields,
      overallConfidence,
      requiresReview: overallConfidence < 80 || lowConfidenceFields.length >= 2,
      lowConfidenceFields,
      channelUsed: "azure",
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    return {
      success: false,
      fields: generateMockExtraction(),
      overallConfidence: 0,
      requiresReview: true,
      lowConfidenceFields: [],
      channelUsed: "azure",
      processingTimeMs,
      error: (error as Error).message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Extraction (Development)
// ─────────────────────────────────────────────────────────────────────────────

async function extractWithMock(): Promise<ExtractionResult> {
  const startTime = Date.now();

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

  const fields = generateMockExtraction();

  // Calculate overall confidence
  const fieldEntries = Object.entries(fields) as [keyof InsuranceCardExtraction, ExtractedField][];
  const confidences = fieldEntries.filter(([, f]) => f.value !== null).map(([, f]) => f.confidence);

  const overallConfidence =
    confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
      : 0;

  const lowConfidenceFields = fieldEntries
    .filter(([, f]) => f.value !== null && f.confidence < 0.8)
    .map(([name]) => name);

  const processingTimeMs = Date.now() - startTime;

  return {
    success: true,
    fields,
    overallConfidence,
    requiresReview: overallConfidence < 80 || lowConfidenceFields.length >= 2,
    lowConfidenceFields,
    channelUsed: "mock",
    processingTimeMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract insurance card data from an image
 *
 * Uses Azure AI Document Intelligence in production, mock data in development
 */
export async function extractInsuranceCard(imageBuffer: Buffer): Promise<ExtractionResult> {
  const useAzure = await initAzureClient();

  if (useAzure) {
    console.log("Using Azure AI Document Intelligence for OCR");
    return extractWithAzure(imageBuffer);
  } else {
    console.log("Using mock OCR (Azure credentials not configured)");
    return extractWithMock();
  }
}

/**
 * Convert extraction result to a flat object suitable for forms
 */
export function flattenExtraction(
  extraction: InsuranceCardExtraction
): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  for (const [key, field] of Object.entries(extraction)) {
    result[key] = field.value;
  }

  return result;
}

/**
 * Get confidence scores as a flat object
 */
export function getConfidenceScores(extraction: InsuranceCardExtraction): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [key, field] of Object.entries(extraction)) {
    result[key] = Math.round(field.confidence * 100);
  }

  return result;
}

export default {
  extractInsuranceCard,
  flattenExtraction,
  getConfidenceScores,
  isAzureAvailable,
};
