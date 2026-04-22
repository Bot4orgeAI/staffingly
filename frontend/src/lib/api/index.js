/**
 * Main API Module - Drop-in replacement for base44 SDK
 *
 * Usage:
 *   import { api } from '@/api';
 *
 *   // Auth (same as base44.auth)
 *   await api.auth.me();
 *   api.auth.logout();
 *
 *   // Entities (same as base44.entities)
 *   await api.entities.Staff.list();
 *   await api.entities.Client.filter({ active: true });
 *   await api.entities.Invoice.create({ ... });
 *
 *   // Functions (same as base44.functions.invoke)
 *   await api.functions.invoke('availityEligibility', { ... });
 *
 *   // Integrations (same as base44.integrations.Core)
 *   await api.integrations.Core.UploadFile({ file });
 *   await api.integrations.Core.InvokeLLM({ prompt, context });
 */

import apiClient from "./clients/apiClient";
import authService from "./services/authService";
import clientService from "./services/clientService";
import entities from "./services/entityService";
import functionsService from "./services/functionsService";
import integrations from "./services/integrationsService";

// Patient API
const patients = {
  list: (params = {}) => apiClient.get("/api/patients", params),
  get: (id) => apiClient.get(`/api/patients/${id}`),
  create: (data) => apiClient.post("/api/patients", data),
  update: (id, data) => apiClient.put(`/api/patients/${id}`, data),
  delete: (id) => apiClient.delete(`/api/patients/${id}`),
  // Insurance policy management
  getPolicies: (patientId) => apiClient.get(`/api/patients/${patientId}/insurance`),
  addInsurance: (patientId, data) => apiClient.post(`/api/patients/${patientId}/insurance`, data),
  updateInsurance: (patientId, policyId, data) =>
    apiClient.put(`/api/patients/${patientId}/insurance/${policyId}`, data),
  deleteInsurance: (patientId, policyId) =>
    apiClient.delete(`/api/patients/${patientId}/insurance/${policyId}`),
};

// Upload API (insurance cards)
const upload = {
  // Upload insurance card image
  insuranceCard: (formData) => apiClient.postFormData("/api/upload/insurance-card", formData),
  // Extract data from insurance card using OCR
  extractInsuranceCard: (formData) =>
    apiClient.postFormData("/api/upload/insurance-card/extract", formData),
  // Get URL for uploaded card
  getInsuranceCardUrl: (uploadId) => apiClient.get(`/api/upload/insurance-card/${uploadId}/url`),
  // General file upload
  file: (formData) => apiClient.postFormData("/api/upload/file", formData),
};

export const api = {
  auth: authService,
  clients: clientService,
  entities,
  functions: functionsService,
  integrations,
  client: apiClient,
  patients,
  upload,
};

// Re-export for convenience
export { apiClient } from "./clients/apiClient";
export { authService } from "./services/authService";
export { clientService } from "./services/clientService";
export { entities } from "./services/entityService";
export { functionsService } from "./services/functionsService";
export { integrations } from "./services/integrationsService";
export * from "./services/functionsService";

export default api;
