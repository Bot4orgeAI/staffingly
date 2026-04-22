import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const getReturnUrl = () => {
    const raw = searchParams.get("returnUrl") || "/";
    // If it's a full URL, extract just the pathname
    try {
      const url = new URL(raw, window.location.origin);
      const path = url.pathname + url.search;
      // Never redirect back to login
      return path.startsWith("/login") ? "/" : path;
    } catch {
      return raw.startsWith("/login") ? "/" : raw;
    }
  };

  // Check for error from OAuth callback
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(getReturnUrl());
    } catch (err) {
      setError(err.message || "Unable to sign in. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-white font-['Plus_Jakarta_Sans'] py-12 px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center mb-6">
            <img
              src="/images/logo/staffverify-combination-logo.png"
              alt="StaffVerify"
              className="w-24 h-auto focus:outline-none"
            />
          </div>
          <h1 className="text-[22px] sm:text-[28px] font-extrabold text-[#00207f] leading-tight mb-2">
            Welcome to StaffVerify
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-bold text-slate-700 mb-2 text-left"
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00207f] focus:border-[#00207f] outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-medium"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-bold text-slate-700 mb-2 text-left"
            >
              Password
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
                className="w-full pl-12 pr-12 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00207f] focus:border-[#00207f] outline-none text-sm sm:text-base text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-medium"
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 disabled:bg-slate-600 text-white font-bold rounded-xl transition-all shadow-md mt-2"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-start text-sm font-bold">
          <Link
            to="/forgot-password"
            className="text-slate-500 hover:text-[#0f172a] transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
