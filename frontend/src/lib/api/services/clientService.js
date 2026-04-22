import apiClient from "../clients/apiClient";

/**
 * Client service for backend client registry operations.
 *
 * Responsibilities:
 * - fetch paginated client registry data
 * - create and update client records
 * - delete client records
 * - normalize request options for client-list queries
 */

export const clientService = {
  /**
   * Fetch a list of clients for the registry view.
   *
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=100]
   * @param {string|null} [params.search]
   * @param {string|null} [params.status]
   * @returns {Promise<Object>}
   */
  list(params = {}) {
    const { page = 1, limit = 100, search = undefined, status = undefined } = params;

    return apiClient.get("/api/clients", {
      page,
      limit,
      search,
      status,
    });
  },

  /**
   * Create a client record.
   *
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  create(payload) {
    return apiClient.post("/api/clients", payload);
  },

  /**
   * Update an existing client record.
   *
   * @param {string} clientId
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  update(clientId, payload) {
    return apiClient.put(`/api/clients/${clientId}`, payload);
  },

  /**
   * Delete a client record.
   *
   * @param {string} clientId
   * @returns {Promise<Object>}
   */
  delete(clientId) {
    return apiClient.delete(`/api/clients/${clientId}`);
  },
};

export default clientService;
