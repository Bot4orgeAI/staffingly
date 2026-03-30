import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "@/lib/api/clients/apiClient";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const returnUrl = searchParams.get("returnUrl") || "/";
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    if (token) {
      apiClient.setToken(token);
      navigate(returnUrl);
    } else {
      setError("Sign-in could not be completed. Please try again.");
      setTimeout(() => navigate("/login"), 3000);
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            {error}
          </div>
          <p className="text-slate-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500">Completing sign in...</p>
      </div>
    </div>
  );
}
