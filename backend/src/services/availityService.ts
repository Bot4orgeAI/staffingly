const AVAILITY_TOKEN_URL = "https://api.availity.com/availity/v1/token";
const AVAILITY_ELIGIBILITY_URL = "https://api.availity.com/availity/v1/coverages";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let lastRequestAt = 0;
const MIN_INTERVAL_MS = 200;

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.AVAILITY_CLIENT_ID;
  const clientSecret = process.env.AVAILITY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Availity credentials not configured");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "hipaa",
  });

  const res = await fetch(AVAILITY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Availity token error: ${res.status} — ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in ? data.expires_in * 1000 : 3600000);

  return cachedToken;
}

async function throttledFetch(
  url: string,
  opts: globalThis.RequestInit
): Promise<globalThis.Response> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;

  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }

  lastRequestAt = Date.now();
  return fetch(url, opts);
}

function parseName(patientName?: string): { firstName: string; lastName: string } {
  const nameParts = (patientName || "").trim().split(" ");
  return {
    firstName: nameParts[0] || "",
    lastName: nameParts[nameParts.length - 1] || "",
  };
}

function formatDob(dob?: string): string {
  if (!dob) return "";
  if (dob.includes("/")) {
    const [mm, dd, yyyy] = dob.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  return dob;
}

function calculateConfidence(
  coverageStatus: string,
  subscriber: { memberId?: string },
  benefits: unknown[],
  dates: { planBegin?: string }
): number {
  let confidence = 60;
  if (coverageStatus === "Active") confidence += 15;
  if (subscriber?.memberId) confidence += 5;
  if (benefits.length > 3) confidence += 10;
  if (dates?.planBegin) confidence += 5;
  if (benefits.length > 8) confidence += 5;
  return Math.min(confidence, 98);
}

function buildFlags(
  coverageStatus: string,
  benefits: unknown[],
  dates: { planEnd?: string }
): string[] {
  const flags: string[] = [];
  if (coverageStatus === "Unknown") {
    flags.push("Payer returned ambiguous coverage status — manual verification recommended");
  }
  if (benefits.length < 3) {
    flags.push("Limited benefit data returned — incomplete 271 response");
  }
  if (!dates?.planEnd || dates?.planEnd === "") {
    flags.push("No termination date found — confirm coverage end with payer");
  }
  return flags;
}

interface EligibilityResponseData {
  coverages?: unknown[];
  subscriber?: { memberId?: string; firstName?: string; lastName?: string };
  benefitsInformation?: unknown[];
  planInformation?: { planDescription?: string; groupOrPolicyNumber?: string };
  planStatus?: Array<{ statusCode?: string; status?: string[] }>;
  planDateInformation?: { planBegin?: string; planEnd?: string };
  payer?: { name?: string };
}

interface EligibilityResult {
  success: boolean;
  rawResponse: unknown;
  coverageStatus: string;
  planName: string;
  planType: string;
  networkStatus: string;
  effectiveDate: string | null;
  terminationDate: string | null;
  memberId: string;
  groupNumber: string | null;
  benefitsRaw: unknown[];
  subscriberName: string;
  payerName: string | null;
  confidenceScore: number;
  responseTimeSeconds: number;
  channelUsed: string;
  flags: string[];
  requiresHumanReview: boolean;
}

function parseEligibilityResponse(
  eligData: EligibilityResponseData,
  memberId: string,
  responseTime: string
): EligibilityResult {
  const coverage = (eligData?.coverages?.[0] as EligibilityResponseData) || eligData;
  const subscriber = coverage?.subscriber || {};
  const benefits = coverage?.benefitsInformation || [];
  const planInfo = coverage?.planInformation || {};
  const planStatus = coverage?.planStatus?.[0] || {};
  const dates = coverage?.planDateInformation || {};

  const coverageStatus =
    planStatus?.statusCode === "1"
      ? "Active"
      : planStatus?.statusCode === "6"
        ? "Inactive"
        : "Unknown";

  const confidence = calculateConfidence(coverageStatus, subscriber, benefits, dates);
  const flags = buildFlags(coverageStatus, benefits, dates);

  return {
    success: true,
    rawResponse: eligData,
    coverageStatus,
    planName: planInfo?.planDescription || planStatus?.status?.join(", ") || "Plan on file",
    planType: planInfo?.groupOrPolicyNumber ? "Group" : "Individual",
    networkStatus: planStatus?.status?.includes("In-Network") ? "In-Network" : "Verify with payer",
    effectiveDate: dates?.planBegin || null,
    terminationDate: dates?.planEnd || null,
    memberId: subscriber?.memberId || memberId,
    groupNumber: planInfo?.groupOrPolicyNumber || null,
    benefitsRaw: benefits,
    subscriberName: `${subscriber?.firstName || ""} ${subscriber?.lastName || ""}`.trim(),
    payerName: coverage?.payer?.name || null,
    confidenceScore: confidence,
    responseTimeSeconds: parseFloat(responseTime),
    channelUsed: "Availity Real-Time Eligibility API (270/271)",
    flags,
    requiresHumanReview: confidence < 75 || flags.length >= 2,
  };
}

interface CheckEligibilityParams {
  patientName: string;
  dob: string;
  memberId: string;
  payerId?: string;
  providerNpi?: string;
  serviceTypeCode?: string;
  serviceDate?: string;
}

interface CheckEligibilityError {
  success: false;
  error: string;
  details: string;
  responseTimeSeconds: number;
}

export async function checkEligibility({
  patientName,
  dob,
  memberId,
  payerId,
  providerNpi,
  serviceTypeCode,
  serviceDate,
}: CheckEligibilityParams): Promise<EligibilityResult | CheckEligibilityError> {
  const startTime = Date.now();
  const token = await getAccessToken();
  const { firstName, lastName } = parseName(patientName);
  const formattedDob = formatDob(dob);
  const today = new Date().toISOString().split("T")[0];

  const requestBody = {
    controlNumber: `SV${Date.now()}`,
    tradingPartnerServiceId: payerId || "87726",
    provider: {
      organizationName: "Staffingly Inc",
      npi: providerNpi || "1234567890",
      serviceProviderNumber: providerNpi || "1234567890",
    },
    subscriber: {
      memberId,
      firstName,
      lastName,
      dateOfBirth: formattedDob,
      gender: "U",
    },
    encounter: {
      serviceTypeCodes: [serviceTypeCode || "30"],
      beginningDateOfService: serviceDate || today,
      endDateOfService: serviceDate || today,
    },
  };

  const eligRes = await throttledFetch(AVAILITY_ELIGIBILITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseTime = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!eligRes.ok) {
    const errBody = await eligRes.text();
    return {
      success: false,
      error: `Availity API error: ${eligRes.status}`,
      details: errBody,
      responseTimeSeconds: parseFloat(responseTime),
    };
  }

  const eligData = (await eligRes.json()) as EligibilityResponseData;
  return parseEligibilityResponse(eligData, memberId, responseTime);
}

export { getAccessToken };

export default {
  checkEligibility,
  getAccessToken,
};
