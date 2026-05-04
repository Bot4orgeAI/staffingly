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

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function getPatientEvDraftKey(patientId = "") {
  return `patient-ev-draft:${patientId}`;
}

export function getPatientEvDraft(patientId = "") {
  if (!patientId || !canUseSessionStorage()) return {};

  try {
    const raw = window.sessionStorage.getItem(getPatientEvDraftKey(patientId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePatientEvDraft(patientId = "", draft = {}) {
  if (!patientId || !canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(getPatientEvDraftKey(patientId), JSON.stringify(draft));
  } catch {
    // Ignore storage failures and continue with in-memory navigation data only.
  }
}

export function buildPatientWorkflowParams(patient, options = {}) {
  const primaryPolicy = patient.insurancePolicies?.find(
    (policy) => policy.policyType === "PRIMARY"
  );
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim();
  const evDraft = getPatientEvDraft(patient.id);

  return new URLSearchParams({
    source: options.source || "patients",
    intent: options.intent || "",
    client_id: patient.clientId || "",
    patientId: patient.id || "",
    patient_name: patientName,
    first_name: patient.firstName || "",
    last_name: patient.lastName || "",
    middle_name: patient.middleName || "",
    dob: patient.dob ? patient.dob.split("T")[0] : "",
    gender: patient.gender || "",
    phone: patient.phone || "",
    email: patient.email || "",
    address: patient.address || "",
    city: patient.city || "",
    state: patient.state || "",
    zip: patient.zip || "",
    payer: primaryPolicy?.payerName || "",
    payer_id: primaryPolicy?.payerId || "",
    member_id: primaryPolicy?.memberId || "",
    group_number: primaryPolicy?.groupNumber || "",
    plan_name: primaryPolicy?.planName || "",
    plan_type: primaryPolicy?.planType || "",
    effective_date: primaryPolicy?.effectiveDate ? primaryPolicy.effectiveDate.split("T")[0] : "",
    termination_date: primaryPolicy?.terminationDate
      ? primaryPolicy.terminationDate.split("T")[0]
      : "",
    rx_bin: primaryPolicy?.rxBin || "",
    rx_pcn: primaryPolicy?.rxPcn || "",
    rx_group: primaryPolicy?.rxGroup || "",
    copay_pcp: primaryPolicy?.copayPcp != null ? String(primaryPolicy.copayPcp) : "",
    copay_specialist:
      primaryPolicy?.copaySpecialist != null ? String(primaryPolicy.copaySpecialist) : "",
    subscriber_name: primaryPolicy?.subscriberName || "",
    subscriber_dob: primaryPolicy?.subscriberDob ? primaryPolicy.subscriberDob.split("T")[0] : "",
    subscriber_relationship: primaryPolicy?.subscriberRelationship || "Self",
    provider_npi: evDraft.provider_npi || "",
    service_date: evDraft.service_date || "",
    service_type: evDraft.service_type || "",
    cpt_code: evDraft.cpt_code || "",
    facility_name: evDraft.facility_name || "",
    notes: evDraft.notes || "",
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
    clientId: params.get("client_id") || "",
    patientId: params.get("patientId") || "",
    patientName,
    firstName: params.get("first_name") || "",
    lastName: params.get("last_name") || "",
    middleName: params.get("middle_name") || "",
    dob: params.get("dob") || "",
    gender: params.get("gender") || "",
    phone: params.get("phone") || "",
    email: params.get("email") || "",
    address: params.get("address") || "",
    city: params.get("city") || "",
    state: params.get("state") || "",
    zip: params.get("zip") || "",
    payer: params.get("payer") || "",
    payerId: params.get("payer_id") || "",
    memberId: params.get("member_id") || "",
    groupNumber: params.get("group_number") || "",
    planName: params.get("plan_name") || "",
    planType: params.get("plan_type") || "",
    effectiveDate: params.get("effective_date") || "",
    terminationDate: params.get("termination_date") || "",
    rxBin: params.get("rx_bin") || "",
    rxPcn: params.get("rx_pcn") || "",
    rxGroup: params.get("rx_group") || "",
    copayPcp: params.get("copay_pcp") || "",
    copaySpecialist: params.get("copay_specialist") || "",
    subscriberName: params.get("subscriber_name") || "",
    subscriberDob: params.get("subscriber_dob") || "",
    subscriberRelationship: params.get("subscriber_relationship") || "Self",
    providerNpi: params.get("provider_npi") || "",
    serviceDate: params.get("service_date") || "",
    serviceType: params.get("service_type") || "",
    cptCode: params.get("cpt_code") || "",
    facilityName: params.get("facility_name") || "",
    notes: params.get("notes") || "",
    procedureRequested: params.get("procedure_requested") || "",
  };
}
