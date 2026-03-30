import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.auth.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-['Plus_Jakarta_Sans'] py-12 px-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-[28px] font-extrabold text-[#0f172a] leading-tight mb-4">
            Check your email
          </h1>
          <p className="text-slate-500 font-medium mb-8">
            If an account exists for <span className="text-slate-700">{email}</span>, you'll receive
            a password reset link shortly.
          </p>
          <p className="text-sm text-slate-400 mb-6">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setSubmitted(false)}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Try another email
            </button>
            <Link
              to="/login"
              className="block w-full py-3 px-4 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl transition-colors text-center"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-[28px] font-extrabold text-[#0f172a] leading-tight mb-2">
            Forgot your password?
          </h1>
          <p className="text-slate-500 font-medium mb-8">
            Enter your email and we'll send you a link to reset your password.
          </p>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 disabled:bg-slate-600 text-white font-bold rounded-xl transition-all shadow-md mt-2"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
