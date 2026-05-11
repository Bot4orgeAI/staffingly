/**
 * Functions Service - Replaces base44.functions.invoke
 * Maps function names to backend API endpoints
 */

import apiClient from "../clients/apiClient";

// Map function names to backend endpoints and parameter transformations
const FUNCTION_MAPPINGS = {
  // Eligibility
  availityEligibility: {
    endpoint: "/api/eligibility/check",
    transform: (params) => ({
      patientName:
        params.patient_name ||
        [params.patient_first_name, params.patient_last_name].filter(Boolean).join(" "),
      patientFirstName: params.patient_first_name,
      patientMiddleName: params.patient_middle_name,
      patientLastName: params.patient_last_name,
      dob: params.dob || params.patient_dob,
      gender: params.gender,
      phone: params.phone,
      email: params.email,
      address: params.address,
      city: params.city,
      state: params.state,
      zip: params.zip,
      memberId: params.member_id,
      payerId: params.payer_id,
      payerName: params.payer_name,
      groupNumber: params.group_number,
      planName: params.plan_name,
      planType: params.plan_type,
      effectiveDate: params.effective_date,
      terminationDate: params.termination_date,
      rxBin: params.rx_bin,
      rxPcn: params.rx_pcn,
      rxGroup: params.rx_group,
      copayPcp: params.copay_pcp,
      copaySpecialist: params.copay_specialist,
      subscriberName: params.subscriber_name,
      subscriberDob: params.subscriber_dob,
      subscriberRelationship: params.subscriber_relationship,
      secondaryPayer: params.secondary_payer,
      secondaryMemberId: params.secondary_member_id,
      secondaryGroupNumber: params.secondary_group_number,
      secondaryPlanName: params.secondary_plan_name,
      providerNpi: params.provider_npi,
      serviceTypeCode: params.service_type_code,
      serviceDate: params.service_date,
      serviceType: params.service_type,
      cptCode: params.cpt_code,
      facilityName: params.facility_name,
      notes: params.notes,
      clientId: params.client_id,
      patientId: params.patient_id,
      gatewayPatientId: params.gateway_patient_id,
      submissionType: params.submission_type,
      emrType: params.emr_type,
    }),
  },

  // Stripe / Billing
  stripeChargeInvoice: {
    endpoint: "/api/billing/charge",
    transform: (params) => ({
      invoiceId: params.invoice_id,
    }),
  },

  stripeCreateCustomer: {
    endpoint: "/api/billing/customers",
    transform: (params) => ({
      clientId: params.client_id,
      clientName: params.client_name,
      billingEmail: params.billing_email,
    }),
  },

  stripeSendCardUpdateLink: {
    endpoint: "/api/billing/card-update-link",
    transform: (params) => ({
      clientId: params.client_id,
    }),
  },

  stripeGetCardInfo: {
    endpoint: "/api/billing/card-info",
    transform: (params) => ({
      stripeCustomerId: params.stripe_customer_id,
      clientId: params.client_id,
    }),
  },

  generateWeeklyInvoices: {
    endpoint: "/api/billing/generate-invoices",
    transform: () => ({}),
  },

  processDisputeWindowCharges: {
    endpoint: "/api/billing/process-disputes",
    transform: () => ({}),
  },

  // Automation
  triggerAutomationJob: {
    endpoint: "/api/automation/trigger",
    transform: (params) => ({
      jobType: params.job_type,
      caseId: params.case_id,
      payerName: params.payer_name,
      urgency: params.urgency,
      payload: params.payload,
    }),
  },

  automationJobWebhook: {
    endpoint: "/api/automation/webhook",
    transform: (params) => params,
  },

  // Storage
  testStorageConnection: {
    endpoint: "/api/storage/test",
    transform: (params) => ({
      storageType: params.storage_type,
      credentialKeyRef: params.credential_key_ref,
      clientId: params.client_id,
      createFolders: params.create_folders,
    }),
  },

  createFolderStructure: {
    endpoint: "/api/storage/folders",
    transform: (params) => ({
      clientId: params.client_id,
    }),
  },

  documentIntakeSync: {
    endpoint: "/api/storage/sync",
    transform: (params) => ({
      clientId: params.client_id,
    }),
  },
};

export const functionsService = {
  async invoke(functionName, params = {}) {
    const mapping = FUNCTION_MAPPINGS[functionName];

    if (!mapping) {
      throw new Error(`Unknown function: ${functionName}. Add it to FUNCTION_MAPPINGS.`);
    }

    const transformedParams = mapping.transform ? mapping.transform(params) : params;
    const response = await apiClient.post(mapping.endpoint, transformedParams);

    // Wrap response in { data } to maintain compatibility with base44 SDK response format
    return { data: response };
  },
};

// Individual function exports for direct usage
export const eligibility = {
  check: (params) => functionsService.invoke("availityEligibility", params),
};

export const billing = {
  chargeInvoice: (invoiceId) =>
    functionsService.invoke("stripeChargeInvoice", { invoice_id: invoiceId }),
  createCustomer: (params) => functionsService.invoke("stripeCreateCustomer", params),
  sendCardUpdateLink: (clientId) =>
    functionsService.invoke("stripeSendCardUpdateLink", {
      client_id: clientId,
    }),
  getCardInfo: (params) => functionsService.invoke("stripeGetCardInfo", params),
  generateInvoices: () => functionsService.invoke("generateWeeklyInvoices", {}),
  processDisputes: () => functionsService.invoke("processDisputeWindowCharges", {}),
};

export const automation = {
  triggerJob: (params) => functionsService.invoke("triggerAutomationJob", params),
};

export const storage = {
  testConnection: (params) => functionsService.invoke("testStorageConnection", params),
  createFolders: (clientId) =>
    functionsService.invoke("createFolderStructure", { client_id: clientId }),
  sync: (clientId) => functionsService.invoke("documentIntakeSync", { client_id: clientId }),
};

export default functionsService;
