const CASE_STATUS_LABELS = {
  INTAKE: "New",
  PENDING_DOCUMENTS: "Awaiting Documents",
  READY_FOR_SUBMISSION: "Ready for Submission",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  DENIED: "Denied",
  APPEAL_IN_PROGRESS: "Appeal In Progress",
  PEER_TO_PEER_REQUESTED: "Peer-to-Peer Requested",
  CLOSED: "Closed",
};

const INVOICE_STATUS_LABELS = {
  DISPUTE_WINDOW: "Sent",
  PENDING: "Pending",
  PAID: "Paid",
  PAYMENT_FAILED: "Payment Failed",
  DISPUTED: "Disputed",
  VOIDED: "Voided",
};

function humanizeEnum(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveInitials(name) {
  if (!name) return "N/A";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "N/A";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function getClientId(user) {
  return user?.clientId || user?.client?.id || null;
}

export function getUserDisplayName(user) {
  return user?.name || user?.email || "Client";
}

export function normalizeBranding(rawBranding) {
  if (!rawBranding) return null;

  return {
    ...rawBranding,
    primaryColor: rawBranding.primaryColor || rawBranding.primary_color || null,
    secondaryColor: rawBranding.secondaryColor || rawBranding.secondary_color || null,
    accentColor: rawBranding.accentColor || rawBranding.accent_color || null,
    logoUrl: rawBranding.logoUrl || rawBranding.logo_url || null,
    faviconUrl: rawBranding.faviconUrl || rawBranding.favicon_url || null,
    companyName: rawBranding.companyName || rawBranding.company_name || null,
    welcomeMessage: rawBranding.welcomeMessage || rawBranding.welcome_message || null,
  };
}

export function getAccentColor(branding) {
  return branding?.accentColor || "#293682";
}

export function getPracticeName(user, branding) {
  return branding?.companyName || user?.client?.name || "Your Practice";
}

export function getCaseStatusLabel(status) {
  return CASE_STATUS_LABELS[status] || humanizeEnum(status);
}

export function normalizeCase(rawCase) {
  const patientName = rawCase?.patientName || rawCase?.patient_name || "";
  const patientInitials = rawCase?.patientInitials || rawCase?.patient_initials || deriveInitials(patientName);
  const procedureCodes = Array.isArray(rawCase?.procedureCodes) ? rawCase.procedureCodes : [];
  const displayStatus = getCaseStatusLabel(rawCase?.status);

  return {
    ...rawCase,
    patientName,
    patientInitials,
    caseNumber: rawCase?.caseNumber || rawCase?.case_id || rawCase?.id || "",
    payerName: rawCase?.payerName || rawCase?.payer_name || "Unknown payer",
    procedureLabel:
      rawCase?.serviceType ||
      rawCase?.procedureName ||
      rawCase?.procedure_name ||
      procedureCodes.join(", ") ||
      "Prior authorization",
    displayStatus,
    createdAt: rawCase?.createdAt || rawCase?.created_date || null,
    updatedAt: rawCase?.updatedAt || rawCase?.updated_date || rawCase?.createdAt || null,
    submittedAt: rawCase?.submittedAt || rawCase?.submission_timestamp || null,
    denialReason: rawCase?.denialReason || rawCase?.denial_reason || null,
    appealSubmittedAt: rawCase?.appealSubmittedAt || rawCase?.appeal_submitted_at || null,
  };
}

export function normalizeMessage(rawMessage) {
  const senderRole = rawMessage?.senderRole || rawMessage?.sender_role || "";
  return {
    ...rawMessage,
    body: rawMessage?.message || rawMessage?.content || "",
    senderRole: senderRole.toLowerCase().includes("client") ? "client" : "staff",
    readByClient: rawMessage?.readByClient ?? rawMessage?.read_by_client ?? false,
    readByStaff: rawMessage?.readByStaff ?? rawMessage?.read_by_staff ?? false,
    createdAt: rawMessage?.createdAt || rawMessage?.created_date || null,
  };
}

export function normalizeDocument(rawDocument) {
  return {
    ...rawDocument,
    fileName: rawDocument?.fileName || rawDocument?.file_name || "",
    fileUrl: rawDocument?.fileUrl || rawDocument?.file_url || "",
    documentType: rawDocument?.documentType || rawDocument?.document_type || "",
    checklistItemKey: rawDocument?.checklistItemKey || rawDocument?.checklist_item_key || "",
    createdAt: rawDocument?.createdAt || rawDocument?.created_date || null,
  };
}

export function normalizeNotification(rawNotification) {
  return {
    ...rawNotification,
    createdAt: rawNotification?.createdAt || rawNotification?.created_date || null,
  };
}

export function normalizeInvoice(rawInvoice) {
  const statusCode = rawInvoice?.status || "";

  return {
    ...rawInvoice,
    statusCode,
    displayStatus: INVOICE_STATUS_LABELS[statusCode] || humanizeEnum(statusCode),
    totalAmount: rawInvoice?.totalAmount || rawInvoice?.total_amount || 0,
    invoiceNumber: rawInvoice?.invoiceNumber || rawInvoice?.invoice_number || "",
    createdAt: rawInvoice?.createdAt || rawInvoice?.created_date || null,
    billingPeriodStart: rawInvoice?.billingPeriodStart || rawInvoice?.billing_period_start || null,
    billingPeriodEnd: rawInvoice?.billingPeriodEnd || rawInvoice?.billing_period_end || null,
    pdfUrl: rawInvoice?.pdfUrl || rawInvoice?.pdf_url || "",
    lineItemsSummary: rawInvoice?.lineItemsSummary || rawInvoice?.line_items_summary || "",
    disputeWindowClosesAt:
      rawInvoice?.disputeWindowClosesAt || rawInvoice?.dispute_window_closes_at || null,
    disputeReason: rawInvoice?.disputeReason || rawInvoice?.dispute_reason || "",
    disputeStatus: rawInvoice?.disputeStatus || rawInvoice?.dispute_status || "",
    disputeOpenedAt: rawInvoice?.disputeOpenedAt || rawInvoice?.dispute_opened_at || null,
  };
}

export function canDisputeInvoice(invoice) {
  if (!invoice) return false;
  if (!["DISPUTE_WINDOW", "PENDING"].includes(invoice.statusCode)) return false;
  if (!invoice.disputeWindowClosesAt) return false;
  return new Date(invoice.disputeWindowClosesAt).getTime() > Date.now();
}

export function getInvoiceDisputeHoursRemaining(invoice) {
  if (!invoice?.disputeWindowClosesAt) return 0;
  const hours = (new Date(invoice.disputeWindowClosesAt).getTime() - Date.now()) / 3600000;
  return Math.max(0, Math.ceil(hours));
}
