import { useState } from "react";
import {
  Crown,
  Lock,
  Bell,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  X,
  RefreshCw,
} from "lucide-react";

const ROLE_STRIPE = {
  super_admin: { bg: "#002082", label: "Super Admin Portal", icon: Crown },
  finance_admin: { bg: "#b45309", label: "Finance Admin Portal", icon: Lock, textColor: "#fff" },
  staffingly_admin: { bg: "#293682", label: "Operations Portal", icon: ShieldCheck },
  staffingly_supervisor: { bg: "#0a7e87", label: "Supervisor Portal", icon: ShieldCheck },
  staffingly_specialist: { bg: "#293682", label: "Specialist Portal", icon: ShieldCheck },
  client_user: { bg: "#004e4e", label: "Client Portal", icon: ShieldCheck },
};

const INTEGRATIONS = [
  { key: "availity", label: "Availity", status: "connected", lastSync: "2 min ago" },
  {
    key: "covermymeds",
    label: "CoverMyMeds",
    status: "degraded",
    lastSync: "14 min ago",
    error: "Response time 3.2s (threshold: 2s)",
  },
  { key: "emr", label: "EMR", status: "connected", lastSync: "8 min ago" },
  { key: "cloud", label: "Cloud Storage", status: "connected", lastSync: "1 hr ago" },
  {
    key: "stripe",
    label: "Stripe",
    status: "disconnected",
    error: "API key expired — reconnect required",
  },
];

const STATUS_DOT = {
  connected: "bg-emerald-500",
  degraded: "bg-amber-400",
  disconnected: "bg-red-500",
};
const STATUS_TEXT = {
  connected: "text-emerald-600",
  degraded: "text-amber-600",
  disconnected: "text-red-600",
};
const STATUS_BG = {
  connected: "bg-emerald-50 border-emerald-200",
  degraded: "bg-amber-50 border-amber-200",
  disconnected: "bg-red-50 border-red-200",
};

function IntegrationDot({ intg, onClick }) {
  return (
    <button
      onClick={() => onClick(intg)}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white/60 transition-colors"
      title={intg.label}
    >
      <div
        className={`w-2 h-2 rounded-full ${STATUS_DOT[intg.status]} ${intg.status === "degraded" ? "animate-pulse" : ""}`}
      />
      <span className="text-[11px] font-medium text-slate-600 hidden sm:inline">{intg.label}</span>
    </button>
  );
}

function IntegrationCard({ intg, onClose }) {
  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 w-72 rounded-2xl border shadow-xl bg-white overflow-hidden"
      style={{
        borderColor:
          intg.status === "connected"
            ? "#d1fae5"
            : intg.status === "degraded"
              ? "#fde68a"
              : "#fecaca",
      }}
    >
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${STATUS_BG[intg.status]}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[intg.status]}`} />
          <span className={`text-sm font-bold ${STATUS_TEXT[intg.status]}`}>{intg.label}</span>
        </div>
        <button onClick={onClose}>
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Status</span>
          <span className={`font-semibold capitalize ${STATUS_TEXT[intg.status]}`}>
            {intg.status}
          </span>
        </div>
        {intg.lastSync && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Last Sync</span>
            <span className="text-slate-700 font-medium">{intg.lastSync}</span>
          </div>
        )}
        {intg.error && (
          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-red-50 border border-red-100">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{intg.error}</p>
          </div>
        )}
        {intg.status !== "connected" && (
          <button
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl text-white text-xs font-bold"
            style={{ backgroundColor: "#293682" }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reconnect
          </button>
        )}
      </div>
    </div>
  );
}

export default function TopBar({ user, title, breadcrumbs = [] }) {
  const [notifCount] = useState(3);
  const [activeIntg, setActiveIntg] = useState(null);

  if (!user) return null;
  const stripe = ROLE_STRIPE[user.role] || ROLE_STRIPE.staffingly_specialist;
  const Icon = stripe.icon;
  const textColor = stripe.textColor || "#ffffff";
  const showIntegrations = user.role !== "client_user";

  return (
    <header className="border-b border-slate-200 bg-white flex-shrink-0">
      {/* Role stripe */}
      <div className="px-6 py-1.5 flex items-center gap-2" style={{ backgroundColor: stripe.bg }}>
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textColor }} />
        <span className="text-xs font-bold tracking-wide uppercase" style={{ color: textColor }}>
          {stripe.label}
        </span>
        <span
          className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20"
          style={{ color: textColor }}
        >
          HIPAA Compliant
        </span>
      </div>

      {/* Main bar */}
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-slate-500 min-w-0">
          <span className="text-slate-400 text-xs">Staffingly.AI</span>
          {breadcrumbs.length > 0
            ? breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span
                    className={
                      i === breadcrumbs.length - 1
                        ? "font-bold text-slate-800 text-sm"
                        : "text-slate-500 text-xs"
                    }
                  >
                    {crumb}
                  </span>
                </span>
              ))
            : title && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className="font-bold text-slate-800 text-sm truncate">{title}</span>
                </>
              )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
            <Bell className="w-4 h-4 text-slate-500" />
            {notifCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: "#f6b037", color: "#002082" }}
              >
                {notifCount}
              </span>
            )}
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: ROLE_STRIPE[user.role]?.bg || "#293682" }}
            >
              {user.name?.charAt(0) || "U"}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold text-slate-700 leading-tight">
                {user.name || user.email}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight capitalize">
                {user.role?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration status bar */}
      {showIntegrations && (
        <div
          className="px-6 py-1.5 border-t border-slate-100 flex items-center gap-1 relative"
          style={{ backgroundColor: "#f8faff" }}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 flex-shrink-0">
            Integrations
          </span>
          <div className="flex items-center gap-1 flex-wrap relative">
            {INTEGRATIONS.map((intg) => (
              <div key={intg.key} className="relative">
                <IntegrationDot
                  intg={intg}
                  onClick={(i) => setActiveIntg(activeIntg?.key === i.key ? null : i)}
                />
                {activeIntg?.key === intg.key && (
                  <IntegrationCard intg={intg} onClose={() => setActiveIntg(null)} />
                )}
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>3 ok</span>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" />
            <span>1 slow</span>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1" />
            <span>1 down</span>
          </div>
        </div>
      )}
    </header>
  );
}
