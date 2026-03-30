const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3011";

/**
 * Custom error class for API-related failures.
 * Encapsulates the HTTP status code and any data returned by the server.
 */
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Core API Client for handling HTTP communication with the backend.
 * Provides a unified interface for standard REST requests (GET, POST, etc.).
 */
class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Retrieves the current authentication token from localStorage.
   * @returns {string|null} The auth token or null if not found.
   */
  getToken() {
    return localStorage.getItem("auth_token");
  }

  /**
   * Updates the authentication token in localStorage.
   * @param {string|null} token - The new token, or null to remove it.
   */
  setToken(token) {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  /**
   * Core request handler that manages headers, auth tokens, and error
   * responses.
   *
   * @param {string} endpoint - The API endpoint path (e.g., "/auth/me").
   * @param {Object} [options={}] - Standard fetch options (method, body, headers).
   * @returns {Promise<Object>} The parsed JSON response.
   * @throws {ApiError} If the response is not OK or a 401 Unauthorized occurs.
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
   * Performs a GET request with optional query parameters.
   * @param {string} endpoint - The API endpoint.
   * @param {Object} [params={}] - Key-value pairs for query parameters.
   * @returns {Promise<Object>} The server response.
   */
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: "GET" });
  }

  /**
   * Performs a POST request with a JSON body.
   * @param {string} endpoint - The API endpoint.
   * @param {Object} [body={}] - Data to be sent in the request body.
   * @returns {Promise<Object>} The server response.
   */
  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Performs a PUT request for full resource updates.
   * @param {string} endpoint - The API endpoint.
   * @param {Object} [body={}] - Data to be sent in the request body.
   * @returns {Promise<Object>} The server response.
   */
  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Performs a PATCH request for partial resource updates.
   * @param {string} endpoint - The API endpoint.
   * @param {Object} [body={}] - Data to be sent in the request body.
   * @returns {Promise<Object>} The server response.
   */
  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * Performs a DELETE request.
   * @param {string} endpoint - The API endpoint.
   * @returns {Promise<Object>} The server response.
   */
  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
