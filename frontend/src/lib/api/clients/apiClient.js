import { getToken, setToken } from "@/lib/utils/auth";

/**
 * Core HTTP client for frontend API access.
 *
 * Responsibilities:
 * - build fully qualified backend URLs
 * - attach auth headers when a token is available
 * - normalize JSON and form-data request behavior
 * - clear auth state on unauthorized responses
 * - raise consistent API errors for failed requests
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3011";

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Read the currently stored auth token.
   *
   * @returns {string|null}
   */
  getToken() {
    return getToken();
  }

  /**
   * Persist or clear the current auth token.
   *
   * @param {string|null} token
   * @returns {void}
   */
  setToken(token) {
    setToken(token);
  }

  /**
   * Execute a JSON-based HTTP request against the backend.
   * Automatically injects the auth token when present.
   *
   * @param {string} endpoint
   * @param {Object} [options={}]
   * @returns {Promise<Object>}
   * @throws {ApiError}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // For 401, clear token but use the backend's message if available
      if (response.status === 401) {
        this.setToken(null);
      }
      throw new ApiError(
        data.message || data.error || "Something went wrong. Please try again.",
        response.status,
        data
      );
    }

    return data;
  }

  /**
   * Perform a GET request with optional query parameters.
   * Nullish query values are omitted from the final URL.
   *
   * @param {string} endpoint
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  get(endpoint, params = {}) {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
    );
    const queryString = new URLSearchParams(filteredParams).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: "GET" });
  }

  /**
   * Perform a POST request with a JSON body.
   *
   * @param {string} endpoint
   * @param {Object} [body={}]
   * @returns {Promise<Object>}
   */
  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Perform a PUT request for full resource updates.
   *
   * @param {string} endpoint
   * @param {Object} [body={}]
   * @returns {Promise<Object>}
   */
  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Perform a PATCH request for partial resource updates.
   *
   * @param {string} endpoint
   * @param {Object} [body={}]
   * @returns {Promise<Object>}
   */
  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * Perform a DELETE request.
   *
   * @param {string} endpoint
   * @returns {Promise<Object>}
   */
  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }

  /**
   * Perform a POST request with FormData.
   * This is used for uploads where the browser should manage the multipart
   * boundary.
   *
   * @param {string} endpoint
   * @param {FormData} formData
   * @returns {Promise<Object>}
   */
  async postFormData(endpoint, formData) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
      }
      throw new Error(data.message || data.error || "Upload failed");
    }

    return data;
  }
}

/**
 * Error type raised for failed API requests.
 *
 * @extends Error
 */
class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {any} data
   */
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
