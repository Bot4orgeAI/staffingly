import { LogOut, ShieldCheck, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { createPageUrl } from "@/lib/utils/page";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/contexts/AuthContext";

const ROLE_COLORS = {
  admin: { bg: "#f6b037", text: "#002082" },
  verification_staff: { bg: "#0a7e87", text: "#fff" },
  provider: { bg: "#293682", text: "#fff" },
};

const ROLE_LABELS = {
  admin: "Admin",
  verification_staff: "Verification Staff",
  provider: "Provider (Read Only)",
};

export default function AppHeader({ user, breadcrumbs = [] }) {
  const { user: authUser } = useAuth();
  const resolvedUser = user || authUser;
  const roleStyle = ROLE_COLORS[resolvedUser?.role] || ROLE_COLORS.provider;

  return (
    <header className="border-b border-slate-200" style={{ backgroundColor: "#002082" }}>
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to={createPageUrl("dashboard")} className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#0a7e87" }}
          >
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <span
            className="font-bold text-xl tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span className="text-white">InsuVerif</span>
            <span style={{ color: "#f6b037" }}>AI</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
            style={{ backgroundColor: "#f6b037", color: "#002082" }}
          >
            Demo Mode
          </span>
          {resolvedUser && (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: "#293682" }}
                >
                  {resolvedUser.full_name?.charAt(0) || "U"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-white text-xs font-semibold leading-tight">
                    {resolvedUser.full_name}
                  </p>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                  >
                    {ROLE_LABELS[resolvedUser.role] || resolvedUser.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => api.auth.logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <div className="px-6 pb-2 flex items-center gap-1 text-xs text-blue-300">
          <Link to={createPageUrl("dashboard")} className="hover:text-white transition-colors">
            Home
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              {crumb.href ? (
                <Link to={crumb.href} className="hover:text-white transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-white">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
