/**
 * Utility helpers for managing the authentication token.
 *
 * Responsibilities:
 * - read and write the auth token to/from localStorage
 * - provide simple token lifecycle primitives used by the auth service
 */

/**
 * Retrieve the current authentication token from localStorage.
 *
 * @returns {string|null}
 */
export const getToken = () => {
  return localStorage.getItem("auth_token");
};

/**
 * Updates the authentication token in localStorage.
 *
 * @param {string|null} token
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
};
