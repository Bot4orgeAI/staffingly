/**
 * Entity Service - Generic CRUD operations
 * Replaces base44.entities.<EntityName>
 *
 * Maps entity names to backend endpoints
 */

import apiClient from "../clients/apiClient";

// Map frontend entity names to backend API endpoints
const ENTITY_ENDPOINTS = {
  // Staff & Users
  Staff: "/api/staff",
  User: "/api/users",
  StaffinglyUser: "/api/users",

  // Clients
  Client: "/api/clients",
  StaffinglyClient: "/api/clients",
  ClientStorageConfig: "/api/storage/configs",
  ClientBranding: "/api/clients/branding",
  ClientNotification: "/api/clients/notifications",
  Notification: "/api/clients/notifications",

  // Eligibility
  EligibilityHistory: "/api/eligibility/history",
  EligibilityCheck: "/api/eligibility",
  Subscriber: "/api/subscribers",
  Provider: "/api/providers",

  // Prior Auth
  PriorAuthCase: "/api/prior-auth/cases",
  PriorAuthDocument: "/api/prior-auth/documents",
  CaseMessage: "/api/prior-auth/messages",

  // Billing
  BillingProfile: "/api/billing/profiles",
  ClientInvoice: "/api/billing/invoices",
  Invoice: "/api/billing/invoices",
  BillingAuditLog: "/api/billing/audit-logs",
  BillingCredit: "/api/billing/credits",

  // Automation
  AutomationJob: "/api/automation/jobs",
  PayerRule: "/api/payer-rules",

  // Storage & Documents
  DriveSyncLog: "/api/storage/logs",
  UnmatchedDocument: "/api/storage/unmatched",

  // Pricing
  PricingPackage: "/api/pricing/packages",

  // Knowledge Base
  KnowledgeBaseEntry: "/api/knowledge-base/entries",
  ChatbotConversation: "/api/knowledge-base/conversations",

  // Payroll & Activity
  PayrollRate: "/api/payroll/rates",
  PayrollAdjustment: "/api/payroll/adjustments",
  DailyActivityLog: "/api/activity/daily-logs",
  StaffinglyAuditLog: "/api/activity/audit-logs",
};

// Convert camelCase to snake_case for API payloads
function toSnakeCase(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj instanceof Date || obj instanceof File || obj instanceof Blob) return obj;
  if (typeof obj !== "object") return obj;

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    result[snakeKey] = toSnakeCase(value);
  }
  return result;
}

// Convert snake_case to camelCase for frontend
function toCamelCase(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj instanceof Date || obj instanceof File || obj instanceof Blob) return obj;
  if (typeof obj !== "object") return obj;

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(value);
  }
  return result;
}

function normalizeRequest(value) {
  return toCamelCase(value);
}

function unwrapCollectionResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;

  const firstArray = Object.values(response || {}).find((value) => Array.isArray(value));
  return Array.isArray(firstArray) ? firstArray : [];
}

function unwrapEntityResponse(response) {
  if (response?.data !== undefined && !Array.isArray(response?.data)) {
    return response.data;
  }
  return response;
}

class EntityProxy {
  constructor(entityName) {
    this.entityName = entityName;
    this.endpoint = ENTITY_ENDPOINTS[entityName];

    if (!this.endpoint) {
      console.warn(
        `No endpoint mapping for entity: ${entityName}. Using /api/${entityName.toLowerCase()}s`
      );
      this.endpoint = `/api/${entityName.toLowerCase()}s`;
    }
  }

  /**
   * @param {string|Object} [sortByOrParams]
   * @param {number} [limit]
   * @returns {Promise<any[]>}
   */
  async list(sortByOrParams = null, limit = null) {
    // Handle both list() and list("-created_date", 100) signatures
    /** @type {Object.<string, any>} */
    const params = {};

    if (typeof sortByOrParams === "object" && sortByOrParams !== null) {
      Object.assign(params, sortByOrParams);
    } else if (typeof sortByOrParams === "string") {
      if (sortByOrParams.startsWith("-")) {
        params.sortBy = sortByOrParams.substring(1);
        params.sortOrder = "desc";
      } else {
        params.sortBy = sortByOrParams;
        params.sortOrder = "asc";
      }
    }

    if (limit) params.limit = limit;

    const response = await apiClient.get(this.endpoint, normalizeRequest(params));
    return unwrapCollectionResponse(response);
  }

  async filter(filters = {}, sortBy = null, limit = null) {
    /** @type {Object.<string, any>} */
    const params = { ...filters };
    if (sortBy) {
      if (sortBy.startsWith("-")) {
        params.sortBy = sortBy.substring(1);
        params.sortOrder = "desc";
      } else {
        params.sortBy = sortBy;
        params.sortOrder = "asc";
      }
    }
    if (limit) params.limit = limit;

    const response = await apiClient.get(this.endpoint, normalizeRequest(params));
    return unwrapCollectionResponse(response);
  }

  async get(id) {
    const response = await apiClient.get(`${this.endpoint}/${id}`);
    return unwrapEntityResponse(response);
  }

  async create(data) {
    const response = await apiClient.post(this.endpoint, normalizeRequest(data));
    return unwrapEntityResponse(response);
  }

  async update(id, data) {
    const response = await apiClient.put(`${this.endpoint}/${id}`, normalizeRequest(data));
    return unwrapEntityResponse(response);
  }

  async patch(id, data) {
    const response = await apiClient.patch(`${this.endpoint}/${id}`, normalizeRequest(data));
    return unwrapEntityResponse(response);
  }

  async delete(id) {
    return apiClient.delete(`${this.endpoint}/${id}`);
  }
}

// Create a proxy that returns entity handlers on demand
/**
 * @typedef {Object} EntityHandler
 * @property {function(string|Object=, number=): Promise<any[]>} list
 * @property {function(Object=, string=, number=): Promise<any[]>} filter
 * @property {function(string|number): Promise<any>} get
 * @property {function(Object): Promise<any>} create
 * @property {function(string|number, Object): Promise<any>} update
 * @property {function(string|number, Object): Promise<any>} patch
 * @property {function(string|number): Promise<any>} delete
 */

/**
 * @type {Object.<string, EntityHandler> & {
 *   Staff: EntityHandler,
 *   User: EntityHandler,
 *   StaffinglyUser: EntityHandler,
 *   Client: EntityHandler,
 *   StaffinglyClient: EntityHandler,
 *   ClientStorageConfig: EntityHandler,
 *   ClientBranding: EntityHandler,
 *   ClientNotification: EntityHandler,
 *   Notification: EntityHandler,
 *   EligibilityHistory: EntityHandler,
 *   EligibilityCheck: EntityHandler,
 *   Subscriber: EntityHandler,
 *   Provider: EntityHandler,
 *   PriorAuthCase: EntityHandler,
 *   PriorAuthDocument: EntityHandler,
 *   CaseMessage: EntityHandler,
 *   BillingProfile: EntityHandler,
 *   ClientInvoice: EntityHandler,
 *   Invoice: EntityHandler,
 *   BillingAuditLog: EntityHandler,
 *   BillingCredit: EntityHandler,
 *   AutomationJob: EntityHandler,
 *   PayerRule: EntityHandler,
 *   DriveSyncLog: EntityHandler,
 *   UnmatchedDocument: EntityHandler,
 *   PricingPackage: EntityHandler,
 *   KnowledgeBaseEntry: EntityHandler,
 *   ChatbotConversation: EntityHandler,
 *   PayrollRate: EntityHandler,
 *   PayrollAdjustment: EntityHandler,
 *   DailyActivityLog: EntityHandler,
 *   StaffinglyAuditLog: EntityHandler,
 * }}
 */
export const entities = new Proxy(/** @type {any} */ ({}), {
  get(target, entityName) {
    if (!target[entityName]) {
      target[entityName] = new EntityProxy(entityName);
    }
    return target[entityName];
  },
});

export default entities;
