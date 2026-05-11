import Joi from "joi";

export const eligibilityCheckSchema = Joi.object({
  patientName: Joi.string().required(),
  patientFirstName: Joi.string().allow("", null),
  patientLastName: Joi.string().allow("", null),
  dob: Joi.string().required(),
  memberId: Joi.string().required(),
  payerId: Joi.string().allow("", null),
  payerName: Joi.string().allow("", null),
  providerNpi: Joi.string().allow("", null),
  serviceTypeCode: Joi.string().allow("", null),
  serviceDate: Joi.string().allow("", null),
  clientId: Joi.string().allow("", null),
  patientId: Joi.string().allow("", null),
  gatewayPatientId: Joi.string().allow("", null),
  submissionType: Joi.string().valid("manual", "ocr", "emr", "bulk").default("manual"),
  emrType: Joi.string().allow("", null),
  verificationEngine: Joi.string().valid("n8n").default("n8n"),
});

export const bulkEligibilityRowSchema = Joi.object({
  patientId: Joi.string().allow("", null),
  patient_name: Joi.string().allow("", null),
  first_name: Joi.string().allow("", null),
  last_name: Joi.string().allow("", null),
  middle_name: Joi.string().allow("", null),
  dob: Joi.string().allow("", null),
  gender: Joi.string().allow("", null),
  phone: Joi.string().allow("", null),
  email: Joi.string().allow("", null),
  address: Joi.string().allow("", null),
  city: Joi.string().allow("", null),
  state: Joi.string().allow("", null),
  zip: Joi.string().allow("", null),
  payer: Joi.string().allow("", null),
  payer_id: Joi.string().allow("", null),
  member_id: Joi.string().required(),
  group_number: Joi.string().allow("", null),
  plan_name: Joi.string().allow("", null),
  plan_type: Joi.string().allow("", null),
  effective_date: Joi.string().allow("", null),
  termination_date: Joi.string().allow("", null),
  rx_bin: Joi.string().allow("", null),
  rx_pcn: Joi.string().allow("", null),
  rx_group: Joi.string().allow("", null),
  copay_pcp: Joi.string().allow("", null),
  copay_specialist: Joi.string().allow("", null),
  subscriber_name: Joi.string().allow("", null),
  subscriber_dob: Joi.string().allow("", null),
  subscriber_relationship: Joi.string().allow("", null),
  provider_npi: Joi.string().allow("", null),
  cpt_code: Joi.string().allow("", null),
  facility_name: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
  service_type: Joi.string().allow("", null),
  service_type_code: Joi.string().allow("", null),
  service_date: Joi.string().allow("", null),
});

export const bulkEligibilityBatchSchema = Joi.object({
  clientId: Joi.string().allow("", null),
  verificationEngine: Joi.string().valid("n8n").default("n8n"),
  rows: Joi.array().items(bulkEligibilityRowSchema).min(1).max(250).required(),
});

export const createCustomerSchema = Joi.object({
  clientId: Joi.string().required(),
  clientName: Joi.string().required(),
  billingEmail: Joi.string().email().required(),
});

export const chargeInvoiceSchema = Joi.object({
  invoiceId: Joi.string().required(),
});

export const updateInvoiceSchema = Joi.object({
  status: Joi.string()
    .valid("DISPUTE_WINDOW", "PENDING", "PAID", "PAYMENT_FAILED", "DISPUTED", "VOIDED")
    .required(),
  disputeReason: Joi.string().allow("", null),
  disputeStatus: Joi.string().allow("", null),
  disputeOpenedAt: Joi.string().allow("", null),
});

export const cardInfoSchema = Joi.object({
  stripeCustomerId: Joi.string().required(),
  clientId: Joi.string().allow("", null),
});

export const cardUpdateLinkSchema = Joi.object({
  clientId: Joi.string().required(),
});

export const triggerJobSchema = Joi.object({
  jobType: Joi.string().required(),
  payerName: Joi.string().required(),
  caseId: Joi.string().allow("", null),
  urgency: Joi.string().valid("ROUTINE", "URGENT", "EXPEDITED").default("ROUTINE"),
  payload: Joi.object().allow(null),
});

export const webhookSchema = Joi.object({
  jobRecordId: Joi.string().required(),
  jobId: Joi.string().allow("", null),
  status: Joi.string().required(),
  errorType: Joi.string().allow("", null),
  errorMessage: Joi.string().allow("", null),
  resultJson: Joi.object().allow(null),
  confirmationNumber: Joi.string().allow("", null),
  screenshotUrls: Joi.array().items(Joi.string()).allow(null),
  startedAt: Joi.string().allow("", null),
  completedAt: Joi.string().allow("", null),
});

export const testConnectionSchema = Joi.object({
  storageType: Joi.string().required(),
  clientId: Joi.string().required(),
  credentialKeyRef: Joi.string().allow("", null),
  createFolders: Joi.boolean().default(false),
});

export const createFoldersSchema = Joi.object({
  clientId: Joi.string().required(),
});

export const syncDocumentsSchema = Joi.object({
  clientId: Joi.string().allow("", null),
});

export const updateStorageConfigSchema = Joi.object({
  storageType: Joi.string().valid("STAFFINGLY_PORTAL", "GOOGLE_DRIVE", "ONEDRIVE", "DROPBOX"),
  credentialKeyRef: Joi.string().allow("", null),
  syncEnabled: Joi.boolean(),
});

export const resolveDocumentSchema = Joi.object({
  caseId: Joi.string().allow("", null),
  action: Joi.string().valid("attach", "dismiss").required(),
});

export const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  page: Joi.number().integer().min(1).default(1),
  clientId: Joi.string().allow("", null),
  status: Joi.string().allow("", null),
  search: Joi.string().allow("", null),
});

export const securitySettingsSchema = Joi.object({
  sessionTimeoutHours: Joi.number().integer().min(1).max(24).required(),
  otpExpiryMinutes: Joi.number().integer().min(1).max(30).required(),
  lockoutThreshold: Joi.number().integer().min(3).max(10).required(),
  passwordExpiryDays: Joi.number().integer().min(0).max(365).required(),
  concurrentSessions: Joi.number().integer().min(1).max(10).required(),
  countryBlocking: Joi.boolean().required(),
  approvedCountries: Joi.array().items(Joi.string().trim().min(2).max(3)).required(),
  alertRecipients: Joi.array()
    .items(
      Joi.object({
        event: Joi.string().required(),
        audience: Joi.string().allow("", null),
        email: Joi.boolean().required(),
        sms: Joi.boolean().required(),
      })
    )
    .required(),
  twoFactorConfig: Joi.object({
    otpMethod: Joi.string().required(),
    otpLength: Joi.number().integer().min(4).max(8).required(),
    otpSingleUse: Joi.boolean().required(),
    newIpRequiresFresh2fa: Joi.boolean().required(),
    newDeviceRequiresEmailConfirmation: Joi.boolean().required(),
    maxRegisteredDevices: Joi.number().integer().min(1).max(10).required(),
  }).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().allow("", null),
});

export const createClientSchema = Joi.object({
  name: Joi.string().required(),
  practiceName: Joi.string().allow("", null),
  contactName: Joi.string().allow("", null),
  contactEmail: Joi.string().email().allow("", null),
  contactPhone: Joi.string().allow("", null),
  address: Joi.string().allow("", null),
  npi: Joi.string().allow("", null),
  taxId: Joi.string().allow("", null),
  emrSystem: Joi.string().allow("", null),
  cloudStorageType: Joi.string().allow("", null),
  subdomain: Joi.string().allow("", null),
  verificationTriggers: Joi.string().allow("", null),
  escalationRules: Joi.string().allow("", null),
  reportingPreferences: Joi.string().allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE", "SUSPENDED", "ONBOARDING").default("ONBOARDING"),
});

export const updateClientSchema = Joi.object({
  name: Joi.string(),
  practiceName: Joi.string().allow("", null),
  contactName: Joi.string().allow("", null),
  contactEmail: Joi.string().email().allow("", null),
  contactPhone: Joi.string().allow("", null),
  address: Joi.string().allow("", null),
  npi: Joi.string().allow("", null),
  taxId: Joi.string().allow("", null),
  emrSystem: Joi.string().allow("", null),
  cloudStorageType: Joi.string().allow("", null),
  subdomain: Joi.string().allow("", null),
  verificationTriggers: Joi.string().allow("", null),
  escalationRules: Joi.string().allow("", null),
  reportingPreferences: Joi.string().allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE", "SUSPENDED", "ONBOARDING"),
});

export const createPriorAuthSchema = Joi.object({
  clientId: Joi.string().allow("", null),
  gatewayPatientId: Joi.string().allow("", null),
  eligibilityCheckId: Joi.string().allow("", null),
  patientName: Joi.string().allow("", null),
  patientInitials: Joi.string().allow("", null),
  patientDob: Joi.string().allow("", null),
  insuranceId: Joi.string().allow("", null),
  payerName: Joi.string().allow("", null),
  payerId: Joi.string().allow("", null),
  serviceType: Joi.string().allow("", null),
  diagnosisCodes: Joi.array().items(Joi.string()).default([]),
  procedureCodes: Joi.array().items(Joi.string()).default([]),
  requestingProvider: Joi.string().allow("", null),
  requestingProviderNpi: Joi.string().allow("", null),
  urgency: Joi.string().valid("ROUTINE", "URGENT", "EXPEDITED").default("ROUTINE"),
  status: Joi.string().allow("", null),
  assignedSpecialistId: Joi.string().allow("", null),
});

export const updatePriorAuthSchema = Joi.object({
  gatewayPatientId: Joi.string().allow("", null),
  patientName: Joi.string().allow("", null),
  patientInitials: Joi.string().allow("", null),
  patientDob: Joi.string().allow("", null),
  insuranceId: Joi.string().allow("", null),
  payerName: Joi.string().allow("", null),
  payerId: Joi.string().allow("", null),
  serviceType: Joi.string().allow("", null),
  diagnosisCodes: Joi.array().items(Joi.string()),
  procedureCodes: Joi.array().items(Joi.string()),
  requestingProvider: Joi.string().allow("", null),
  requestingProviderNpi: Joi.string().allow("", null),
  urgency: Joi.string().valid("ROUTINE", "URGENT", "EXPEDITED"),
  status: Joi.string().allow("", null),
  assignedSpecialistId: Joi.string().allow("", null),
  eligibilityVerified: Joi.boolean(),
  denialReason: Joi.string().allow("", null),
  authorizationNumber: Joi.string().allow("", null),
  authValidFrom: Joi.string().allow("", null),
  authValidTo: Joi.string().allow("", null),
  submittedAt: Joi.string().allow("", null),
  approvedAt: Joi.string().allow("", null),
  deniedAt: Joi.string().allow("", null),
  appealSubmittedAt: Joi.string().allow("", null),
});

export const priorAuthGatewayActionSchema = Joi.object({
  action: Joi.string()
    .valid("save_intake", "run_ai_review", "submit_to_cmm", "save_denial", "draft_appeal")
    .required(),
  gatewayPatientId: Joi.string().allow("", null),
  procedureName: Joi.string().allow("", null),
  icd10: Joi.string().allow("", null),
  extractedDocumentText: Joi.string().allow("", null),
  denialReason: Joi.string().allow("", null),
});

export const uploadDocumentSchema = Joi.object({
  documentType: Joi.string().required(),
  fileName: Joi.string().required(),
  fileUrl: Joi.string().required(),
  checklistItemKey: Joi.string().allow("", null),
});

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().allow("", null),
  role: Joi.string()
    .valid(
      "SUPER_ADMIN",
      "FINANCE_ADMIN",
      "STAFFINGLY_ADMIN",
      "STAFFINGLY_SUPERVISOR",
      "STAFFINGLY_SPECIALIST",
      "CLIENT_USER"
    )
    .required(),
  clientId: Joi.string().allow("", null),
  active: Joi.boolean().default(true),
  accountLocked: Joi.boolean().default(false),
  allowedIpAddresses: Joi.array().items(Joi.string().trim()).default([]),
  registeredDevices: Joi.array().items(Joi.object().unknown(true)).default([]),
});

export const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  name: Joi.string().allow("", null),
  role: Joi.string().valid(
    "SUPER_ADMIN",
    "FINANCE_ADMIN",
    "STAFFINGLY_ADMIN",
    "STAFFINGLY_SUPERVISOR",
    "STAFFINGLY_SPECIALIST",
    "CLIENT_USER"
  ),
  clientId: Joi.string().allow("", null),
  active: Joi.boolean(),
  accountLocked: Joi.boolean(),
  allowedIpAddresses: Joi.array().items(Joi.string().trim()),
  registeredDevices: Joi.array().items(Joi.object().unknown(true)),
});

export const revokeUserDeviceSchema = Joi.object({
  deviceId: Joi.string().allow("", null),
  label: Joi.string().allow("", null),
  ipAddress: Joi.string().allow("", null),
}).or("deviceId", "label", "ipAddress");

export const createPayerRuleSchema = Joi.object({
  payerName: Joi.string().required(),
  payerId: Joi.string().allow("", null),
  serviceType: Joi.string().allow("", null),
  requiresPriorAuth: Joi.boolean().default(true),
  submissionMethod: Joi.string().allow("", null),
  portalUrl: Joi.string().allow("", null),
  phoneNumber: Joi.string().allow("", null),
  faxNumber: Joi.string().allow("", null),
  turnaroundDays: Joi.number().integer().allow(null),
  requiredDocuments: Joi.array().items(Joi.string()).default([]),
  automationSupported: Joi.boolean().default(false),
  fieldMappingJson: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
});

export const updatePayerRuleSchema = Joi.object({
  payerName: Joi.string(),
  payerId: Joi.string().allow("", null),
  serviceType: Joi.string().allow("", null),
  requiresPriorAuth: Joi.boolean(),
  submissionMethod: Joi.string().allow("", null),
  portalUrl: Joi.string().allow("", null),
  phoneNumber: Joi.string().allow("", null),
  faxNumber: Joi.string().allow("", null),
  turnaroundDays: Joi.number().integer().allow(null),
  requiredDocuments: Joi.array().items(Joi.string()),
  automationSupported: Joi.boolean(),
  fieldMappingJson: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
});

export const createPricingPackageSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow("", null),
  monthlyBaseFee: Joi.number().default(0),
  ratePerEligibilityCheck: Joi.number().default(0),
  ratePerPriorAuth: Joi.number().default(0),
  ratePerApprovedPriorAuth: Joi.number().default(0),
  ratePerAppeal: Joi.number().default(0),
  includedEligibilityChecks: Joi.number().integer().default(0),
  includedPriorAuths: Joi.number().integer().default(0),
  includedAppeals: Joi.number().integer().default(0),
  unlimitedEligibility: Joi.boolean().default(false),
  unlimitedPriorAuths: Joi.boolean().default(false),
  unlimitedAppeals: Joi.boolean().default(false),
  chargeOnApproval: Joi.boolean().default(false),
  overageRateEligibility: Joi.number().allow(null),
  overageRatePriorAuth: Joi.number().allow(null),
  isActive: Joi.boolean().default(true),
});

export const updatePricingPackageSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow("", null),
  monthlyBaseFee: Joi.number(),
  ratePerEligibilityCheck: Joi.number(),
  ratePerPriorAuth: Joi.number(),
  ratePerApprovedPriorAuth: Joi.number(),
  ratePerAppeal: Joi.number(),
  includedEligibilityChecks: Joi.number().integer(),
  includedPriorAuths: Joi.number().integer(),
  includedAppeals: Joi.number().integer(),
  unlimitedEligibility: Joi.boolean(),
  unlimitedPriorAuths: Joi.boolean(),
  unlimitedAppeals: Joi.boolean(),
  chargeOnApproval: Joi.boolean(),
  overageRateEligibility: Joi.number().allow(null),
  overageRatePriorAuth: Joi.number().allow(null),
  isActive: Joi.boolean(),
});
