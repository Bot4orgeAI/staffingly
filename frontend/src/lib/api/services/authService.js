/**
 * Authentication service for frontend auth flows.
 *
 * Responsibilities:
 * - authenticate users against the backend
 * - persist and clear the API auth token
 * - expose convenience methods for profile and password actions
 * - centralize login/logout redirect behavior
 *
 * Return shape:
 * - methods that hit the backend usually return `response.data` when present
 * - otherwise they return the raw API client response
 */

import apiClient from "../clients/apiClient";

export const authService = {
  /**
   * Authenticate a user with email and password.
   * Persists the returned JWT when the backend includes one.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async login(email, password) {
    const response = await apiClient.post("/api/auth/login", {
      email,
      password,
    });
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data || response;
  },

  /**
   * Register a new user account.
   * Persists the returned JWT when the backend includes one.
   *
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async register(userData) {
    const response = await apiClient.post("/api/auth/register", userData);
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data || response;
  },

  /**
   * Fetch the currently authenticated user.
   *
   * @returns {Promise<Object>}
   */
  async me() {
    const response = await apiClient.get("/api/auth/me");
    return response.data || response;
  },

  /**
   * Update the current user's profile.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateProfile(data) {
    return apiClient.put("/api/auth/profile", data);
  },

  /**
   * Change the current user's password.
   *
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async changePassword(currentPassword, newPassword) {
    return apiClient.post("/api/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Start the forgot-password flow for the supplied email address.
   *
   * @param {string} email
   * @returns {Promise<Object>}
   */
  async forgotPassword(email) {
    return apiClient.post("/api/auth/forgot-password", { email });
  },

  /**
   * Complete the reset-password flow with a reset token.
   *
   * @param {string} token
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async resetPassword(token, newPassword) {
    return apiClient.post("/api/auth/reset-password", { token, newPassword });
  },

  /**
   * Clear the current auth token and redirect to the supplied URL or the login page.
   *
   * @param {string|null} [redirectUrl=null]
   * @returns {void}
   */
  logout(redirectUrl = null) {
    apiClient.setToken(null);
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = "/login";
    }
  },

  /**
   * Redirect the browser to the login page.
   * Optionally preserves a post-login return URL.
   *
   * @param {string|null} [returnUrl=null]
   * @returns {void}
   */
  redirectToLogin(returnUrl = null) {
    const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login";
    window.location.href = url;
  },

  /**
   * Check whether an auth token is currently stored.
   *
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!apiClient.getToken();
  },
};

export default authService;
