import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Mail, Lock, ArrowLeft, User, Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3011";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
      await register(email, password, name);
      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${API_URL}/api/auth/google?returnUrl=/`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-['Plus_Jakarta_Sans'] py-12 px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-2">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-[#0f172a] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to sign in
          </Link>
          <h1 className="text-[28px] font-extrabold text-[#0f172a] text-center leading-tight mb-8">
            Create your account
          </h1>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
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
            <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2 text-left">
              Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00207f] focus:border-[#00207f] outline-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-medium"
                placeholder="Your name"
              />
            </div>
          </div>

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
              Confirm Password
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
            className="w-full py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 disabled:bg-slate-600 text-white font-bold rounded-xl transition-all shadow-md mt-4"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
