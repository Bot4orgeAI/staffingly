import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3011";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const getReturnUrl = () => searchParams.get("returnUrl") || "/";

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

  const handleGoogleLogin = () => {
    const returnUrl = getReturnUrl();
    window.location.href = `${API_URL}/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-['Plus_Jakarta_Sans'] py-12 px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center mb-6">
            <img
              src="/images/logo/staffverify-combination-logo.png"
              alt="StaffVerify"
              className="w-28 h-28 focus:outline-none"
            />
          </div>
          <h1 className="text-[28px] font-extrabold text-[#00207f] leading-tight mb-2">
            Welcome to StaffVerify
          </h1>
          <p className="text-slate-500 font-medium">Sign in to continue</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full mb-6 flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center mb-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 tracking-widest uppercase">
            or
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
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
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00207f] focus:border-[#00207f] outline-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-medium"
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
                className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00207f] focus:border-[#00207f] outline-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-medium"
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

        <div className="mt-8 flex items-center justify-between text-sm font-bold">
          <Link
            to="/forgot-password"
            className="text-slate-500 hover:text-[#0f172a] transition-colors"
          >
            Forgot password?
          </Link>
          <span className="text-slate-500 font-medium">
            Need an account?{" "}
            <Link to="/register" className="text-[#0f172a] hover:underline font-bold ml-1">
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
