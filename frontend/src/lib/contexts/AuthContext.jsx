import { createContext, useState, useContext, useEffect } from "react";
import { api } from "@/lib/api";
import apiClient from "@/lib/api/clients/apiClient";

/**
 * Context for managing authentication state and actions.
 * Provides user information, authentication status, and methods for login/
 * logout/registration.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      // Check if we have a stored token
      const token = apiClient.getToken();

      if (token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setAuthError({
        type: "unknown",
        message: error.message || "Something went wrong. Please refresh and try again.",
      });
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error("User auth check failed:", error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);

      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        apiClient.setToken(null);
        setAuthError({
          type: "auth_required",
          message: "Please sign in to continue.",
        });
      }
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.auth.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      setAuthError(null);
      return response;
    } catch (error) {
      setAuthError({
        type: "login_failed",
        message: error.message || "Unable to sign in. Please try again.",
      });
      throw error;
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await api.auth.register({ email, password, name });
      setUser(response.user);
      setIsAuthenticated(true);
      setAuthError(null);
      return response;
    } catch (error) {
      setAuthError({
        type: "registration_failed",
        message: error.message || "Unable to create account. Please try again.",
      });
      throw error;
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      api.auth.logout(window.location.href);
    } else {
      api.auth.logout();
    }
  };

  const navigateToLogin = () => {
    api.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        login,
        register,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
