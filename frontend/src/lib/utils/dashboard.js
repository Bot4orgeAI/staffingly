import { endOfDay, startOfDay, subDays } from "date-fns";

export const DATE_RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const ISSUE_MATCHERS = [
  {
    label: "Coverage termination",
    test: (text, record) =>
      record.coverageStatus === "Inactive" ||
      text.includes("terminated") ||
      text.includes("termination"),
  },
  {
    label: "Prior auth missing",
    test: (text) => text.includes("prior auth") || text.includes("authorization required"),
  },
  {
    label: "Payer timeout",
    test: (text) =>
      text.includes("timeout") || text.includes("portal") || text.includes("login failed"),
  },
  {
    label: "Coordination of benefits",
    test: (text) =>
      text.includes("coordination of benefits") ||
      text.includes("secondary payer") ||
      text.includes("cob"),
  },
  {
    label: "Member ID mismatch",
    test: (text) =>
      text.includes("member id") || text.includes("subscriber id") || text.includes("invalid data"),
  },
  {
    label: "Coverage gap",
    test: (text) =>
      text.includes("coverage gap") || text.includes("effective date") || text.includes("inactive"),
  },
];

export function getRangeDays(rangeKey) {
  return RANGE_DAYS[rangeKey] || RANGE_DAYS["30d"];
}

export function getCurrentRange(rangeKey, now = new Date()) {
  const days = getRangeDays(rangeKey);
  return {
    start: startOfDay(subDays(now, days - 1)),
    end: endOfDay(now),
  };
}

export function getPreviousRange(rangeKey, now = new Date()) {
  const { start } = getCurrentRange(rangeKey, now);
  const days = getRangeDays(rangeKey);
  return {
    start: startOfDay(subDays(start, days)),
    end: endOfDay(subDays(start, 1)),
  };
}

export function isInDateRange(value, range) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date <= range.end;
}

export function parseFlagsJson(rawValue) {
  if (!rawValue) return [];

  if (Array.isArray(rawValue)) {
    return rawValue.filter(Boolean).map(String);
  }

  if (typeof rawValue !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export function getClientId(record) {
  return record?.clientId || record?.client?.id || null;
}

export function getClientName(record, clientNames = {}) {
  const clientId = getClientId(record);
  return (
    clientNames[clientId] ||
    record?.client?.practiceName ||
    record?.client?.name ||
    clientId ||
    "Unassigned"
  );
}

export function getPayerName(record) {
  return record?.payer || record?.payerName || record?.insurerName || "Unknown payer";
}

export function getPatientName(record) {
  return (
    record?.subscriberName || record?.patientName || record?.patient?.name || "Unknown patient"
  );
}

export function categorizeIssue(record) {
  const flags = parseFlagsJson(record?.flagsJson);
  const flagText = flags.join(" ").toLowerCase();

  for (const matcher of ISSUE_MATCHERS) {
    if (matcher.test(flagText, record || {})) {
      return matcher.label;
    }
  }

  if (record?.coverageStatus === "Unknown" || record?.requiresHumanReview) {
    return "Manual review";
  }

  if ((record?.confidenceScore ?? 100) < 75) {
    return "Low-confidence result";
  }

  return "Manual review";
}

export function getTimeOfDayBucket(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const hour = date.getHours();
  if (hour < 6) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export function getExceptionPriority(record) {
  if (record?.coverageStatus === "Inactive" || (record?.confidenceScore ?? 100) < 65) {
    return "HIGH";
  }

  if (record?.requiresHumanReview || (record?.confidenceScore ?? 100) < 75) {
    return "MEDIUM";
  }

  return "LOW";
}

export function formatWaitingTime(value, now = new Date()) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const totalMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (totalMinutes < 60) return `${totalMinutes}m`;

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours}h ${totalMinutes % 60}m`;
  }

  const totalDays = Math.floor(totalHours / 24);
  return `${totalDays}d ${totalHours % 24}h`;
}

export function formatSeconds(value) {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(1)}s`;
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}
