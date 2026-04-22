export function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function normalizeClient(client) {
  const specialists = Array.isArray(client.users)
    ? client.users.filter((user) => user.role === "STAFFINGLY_SPECIALIST")
    : [];

  return {
    id: client.id,
    name: client.name || "",
    practiceName: client.practiceName || "",
    contactName: client.contactName || "",
    contactEmail: client.contactEmail || "",
    contactPhone: client.contactPhone || "",
    address: client.address || "",
    npi: client.npi || "",
    taxId: client.taxId || "",
    emrSystem: client.emrSystem || "",
    cloudStorageType: client.cloudStorageType || "none",
    subdomain: client.subdomain || "",
    verificationTriggers: client.verificationTriggers || "",
    escalationRules: client.escalationRules || "",
    reportingPreferences: client.reportingPreferences || "",
    status: client.status || "ONBOARDING",
    onboardedAt: client.onboardedAt || null,
    specialistsCount: specialists.length,
    priorAuthCasesCount: client._count?.priorAuthCases || 0,
    eligibilityChecksCount: client._count?.eligibilityChecks || 0,
  };
}

export function toClientPayload(form) {
  return {
    name: form.contactName.trim() || form.practiceName.trim() || "Unnamed Client",
    practiceName: form.practiceName.trim() || null,
    contactName: form.contactName.trim() || null,
    contactEmail: form.contactEmail.trim() || null,
    contactPhone: form.contactPhone.trim() || null,
    address: form.address.trim() || null,
    npi: form.npi.trim() || null,
    taxId: form.taxId.trim() || null,
    emrSystem: form.emrSystem || null,
    cloudStorageType: form.cloudStorageType || null,
    subdomain: form.subdomain.trim() || null,
    verificationTriggers: form.verificationTriggers.trim() || null,
    escalationRules: form.escalationRules.trim() || null,
    reportingPreferences: form.reportingPreferences.trim() || null,
    status: form.active ? "ACTIVE" : "INACTIVE",
  };
}
