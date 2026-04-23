export function derivePatientName(prefill = {}) {
  const explicitName =
    prefill.patient_name ||
    prefill.patient ||
    [prefill.first_name, prefill.last_name].filter(Boolean).join(" ").trim();

  return explicitName || "";
}

export function derivePatientInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase())
    .join(".");
}

export function buildPatientWorkflowParams(patient, options = {}) {
  const primaryPolicy = patient.insurancePolicies?.find(
    (policy) => policy.policyType === "PRIMARY"
  );
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim();

  return new URLSearchParams({
    source: options.source || "patients",
    intent: options.intent || "",
    patientId: patient.id || "",
    patient_name: patientName,
    first_name: patient.firstName || "",
    last_name: patient.lastName || "",
    dob: patient.dob ? patient.dob.split("T")[0] : "",
    phone: patient.phone || "",
    email: patient.email || "",
    payer: primaryPolicy?.payerName || "",
    payer_id: primaryPolicy?.payerId || "",
    member_id: primaryPolicy?.memberId || "",
    group_number: primaryPolicy?.groupNumber || "",
    plan_name: primaryPolicy?.planName || "",
    plan_type: primaryPolicy?.planType || "",
    subscriber_name: primaryPolicy?.subscriberName || "",
    subscriber_dob: primaryPolicy?.subscriberDob ? primaryPolicy.subscriberDob.split("T")[0] : "",
    subscriber_relationship: primaryPolicy?.subscriberRelationship || "Self",
  }).toString();
}

export function getWorkflowContext(search = window.location.search) {
  const params = new URLSearchParams(search);
  const patientName =
    params.get("patient_name") ||
    params.get("patient") ||
    [params.get("first_name"), params.get("last_name")].filter(Boolean).join(" ").trim();

  return {
    source: params.get("source") || "",
    intent: params.get("intent") || "",
    patientId: params.get("patientId") || "",
    patientName,
    firstName: params.get("first_name") || "",
    lastName: params.get("last_name") || "",
    dob: params.get("dob") || "",
    phone: params.get("phone") || "",
    email: params.get("email") || "",
    payer: params.get("payer") || "",
    payerId: params.get("payer_id") || "",
    memberId: params.get("member_id") || "",
    groupNumber: params.get("group_number") || "",
    planName: params.get("plan_name") || "",
    planType: params.get("plan_type") || "",
    subscriberName: params.get("subscriber_name") || "",
    subscriberDob: params.get("subscriber_dob") || "",
    subscriberRelationship: params.get("subscriber_relationship") || "Self",
    procedureRequested: params.get("procedure_requested") || "",
  };
}
