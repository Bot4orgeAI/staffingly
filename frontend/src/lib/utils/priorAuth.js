const STATUS_LABELS = {
  INTAKE: "New",
  PENDING_DOCUMENTS: "Awaiting Documents",
  READY_FOR_SUBMISSION: "Pending Supervisor Approval",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  DENIED: "Denied",
  APPEAL_IN_PROGRESS: "Appeal In Progress",
  PEER_TO_PEER_REQUESTED: "Peer To Peer Requested",
  CLOSED: "Closed",
};

const URGENCY_LABELS = {
  ROUTINE: "Routine",
  URGENT: "Urgent",
  EXPEDITED: "Urgent",
};

function getCaseValue(record, ...keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) {
      return record[key];
    }
  }
  return null;
}

export function normalizePriorAuthCase(record) {
  if (!record) return null;

  const patientName = getCaseValue(record, "patientName", "patient_name");
  const patientInitials =
    getCaseValue(record, "patientInitials", "patient_initials") || patientName || "—";
  const payerName = getCaseValue(record, "payerName", "payer_name") || "—";
  const serviceType =
    getCaseValue(record, "procedureName", "procedure_name", "serviceType", "service_type") || "—";
  const status =
    STATUS_LABELS[getCaseValue(record, "status")] || getCaseValue(record, "status") || "New";
  const urgency =
    URGENCY_LABELS[getCaseValue(record, "urgency")] || getCaseValue(record, "urgency") || "Routine";

  return {
    ...record,
    case_id: getCaseValue(record, "case_id", "caseNumber") || record.id?.slice(-6) || "—",
    patient_name: patientName,
    patient_initials: patientInitials,
    patient_dob: getCaseValue(record, "patient_dob", "patientDob"),
    insurance_id: getCaseValue(record, "insurance_id", "insuranceId"),
    payer_name: payerName,
    payer_id: getCaseValue(record, "payer_id", "payerId"),
    procedure_name: serviceType,
    service_type: getCaseValue(record, "service_type", "serviceType") || serviceType,
    diagnosis_codes: getCaseValue(record, "diagnosis_codes", "diagnosisCodes") || [],
    procedure_codes: getCaseValue(record, "procedure_codes", "procedureCodes") || [],
    ordering_physician_name:
      getCaseValue(
        record,
        "ordering_physician_name",
        "orderingPhysicianName",
        "requestingProvider"
      ) || "",
    ordering_physician_npi:
      getCaseValue(
        record,
        "ordering_physician_npi",
        "orderingPhysicianNpi",
        "requestingProviderNpi"
      ) || "",
    submission_method: getCaseValue(record, "submission_method", "submissionMethod"),
    confirmation_number: getCaseValue(record, "confirmation_number", "confirmationNumber"),
    covermymeds_reference: getCaseValue(record, "covermymeds_reference", "covermymedsReference"),
    appeal_deadline: getCaseValue(record, "appeal_deadline", "appealDeadline"),
    denial_date: getCaseValue(record, "denial_date", "deniedAt"),
    denial_reason: getCaseValue(record, "denial_reason", "denialReason"),
    denial_code: getCaseValue(record, "denial_code", "denialCode"),
    appeal_letter: getCaseValue(record, "appeal_letter", "appealLetter"),
    medical_necessity_summary: getCaseValue(
      record,
      "medical_necessity_summary",
      "medicalNecessitySummary"
    ),
    ai_review_result_json: getCaseValue(record, "ai_review_result_json", "aiReviewResultJson"),
    ai_confidence_score: getCaseValue(record, "ai_confidence_score", "aiConfidenceScore"),
    intake_notes: getCaseValue(record, "intake_notes", "intakeNotes"),
    p2p_physician_name: getCaseValue(record, "p2p_physician_name", "p2pPhysicianName"),
    p2p_physician_npi: getCaseValue(record, "p2p_physician_npi", "p2pPhysicianNpi"),
    p2p_reviewer_name: getCaseValue(record, "p2p_reviewer_name", "p2pReviewerName"),
    p2p_scheduled_at: getCaseValue(record, "p2p_scheduled_at", "p2pScheduledAt"),
    p2p_contact_number: getCaseValue(record, "p2p_contact_number", "p2pContactNumber"),
    p2p_outcome: getCaseValue(record, "p2p_outcome", "p2pOutcome"),
    is_medication_pa: Boolean(getCaseValue(record, "is_medication_pa", "isMedicationPa")),
    medication_name: getCaseValue(record, "medication_name", "medicationName"),
    days_supply: getCaseValue(record, "days_supply", "daysSupply"),
    quantity_requested: getCaseValue(record, "quantity_requested", "quantityRequested"),
    pharmacy_npi: getCaseValue(record, "pharmacy_npi", "pharmacyNpi"),
    step_therapy_confirmed: Boolean(
      getCaseValue(record, "step_therapy_confirmed", "stepTherapyConfirmed")
    ),
    gateway_patient_id: getCaseValue(record, "gateway_patient_id", "gatewayPatientId"),
    submitted_at: getCaseValue(record, "submitted_at", "submittedAt"),
    approved_at: getCaseValue(record, "approved_at", "approvedAt"),
    denied_at: getCaseValue(record, "denied_at", "deniedAt"),
    appeal_submitted_at: getCaseValue(record, "appeal_submitted_at", "appealSubmittedAt"),
    authorization_number: getCaseValue(record, "authorization_number", "authorizationNumber"),
    auth_valid_from: getCaseValue(record, "auth_valid_from", "authValidFrom"),
    auth_valid_to: getCaseValue(record, "auth_valid_to", "authValidTo"),
    status,
    urgency,
  };
}
