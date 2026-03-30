import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match. Please make sure both passwords are the same.");
      return;
    }

    if (password.length < 6) {
      setError("Password is too short. Please use at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-['Plus_Jakarta_Sans'] py-12 px-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-[28px] font-extrabold text-[#0f172a] leading-tight mb-4">
            Invalid reset link
          </h1>
          <p className="text-slate-500 font-medium mb-8">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="block w-full py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl transition-colors text-center"
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-['Plus_Jakarta_Sans'] py-12 px-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-[28px] font-extrabold text-[#0f172a] leading-tight mb-4">
            Password reset successful
          </h1>
          <p className="text-slate-500 font-medium mb-8">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-['Plus_Jakarta_Sans'] py-12 px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-2">
          <h1 className="text-[28px] font-extrabold text-[#0f172a] leading-tight mb-2">
            Create new password
          </h1>
          <p className="text-slate-500 font-medium mb-8">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-bold text-slate-700 mb-2 text-left"
            >
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00207f] focus:border-[#00207f] outline-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-medium"
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#00207f] transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-bold text-slate-700 mb-2 text-left"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00207f] focus:border-[#00207f] outline-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-medium"
                placeholder="Re-enter password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#00207f] transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 disabled:bg-slate-600 text-white font-bold rounded-xl transition-all shadow-md mt-2"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}
