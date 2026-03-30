import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import {
  Users,
  Building2,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Crown,
  CheckCircle,
} from "lucide-react";

const STATS = [
  { label: "Total Clients", value: "248", icon: Building2, color: "#293682", bg: "#eef3ff" },
  { label: "Active Users", value: "1,042", icon: Users, color: "#0a7e87", bg: "#f0fdfa" },
  { label: "Cases This Month", value: "14,830", icon: Activity, color: "#f6b037", bg: "#fffbeb" },
  { label: "Security Alerts", value: "3", icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2" },
];

const RECENT_AUDIT = [
  {
    user: "admin@staffingly.com",
    role: "Super Admin",
    action: "Updated security settings",
    module: "Security",
    time: "2 min ago",
    type: "warning",
  },
  {
    user: "finance@staffingly.com",
    role: "Finance Admin",
    action: "Exported payroll report",
    module: "Payroll",
    time: "14 min ago",
    type: "info",
  },
  {
    user: "ops@staffingly.com",
    role: "Staffingly Admin",
    action: "Onboarded new client: Sunrise Clinic",
    module: "Clients",
    time: "1 hr ago",
    type: "success",
  },
  {
    user: "specialist@staffingly.com",
    role: "Specialist",
    action: "Failed login attempt (IP: 89.34.12.1)",
    module: "Auth",
    time: "2 hr ago",
    type: "danger",
  },
  {
    user: "supervisor@staffingly.com",
    role: "Supervisor",
    action: "Approved PA #00382 for Aetna",
    module: "Cases",
    time: "3 hr ago",
    type: "success",
  },
];

const TYPE_COLORS = {
  success: { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a" },
  info: { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  warning: { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  danger: { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
};

export default function SADashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth
      .me()
      .then((u) => {
        setUser({ ...u, role: u.role || "super_admin" });
      })
      .catch(() => api.auth.redirectToLogin());
  }, []);

  return (
    <StaffinglyLayout
      user={user}
      currentPage="sa-dashboard"
      title="Super Admin Dashboard"
      breadcrumbs={["Admin", "Dashboard"]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Crown Banner */}
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ backgroundColor: "#002082" }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10">
            <Crown className="w-6 h-6" style={{ color: "#f6b037" }} />
          </div>
          <div>
            <p className="text-white font-bold text-lg">
              Welcome, {user?.full_name || "Super Admin"}
            </p>
            <p className="text-blue-200 text-sm">
              Full platform access — all modules, all clients, all data.
            </p>
          </div>
          <div className="ml-auto flex gap-2 text-xs text-blue-200">
            <span className="px-3 py-1 rounded-full bg-white/10">Session: Active</span>
            <span className="px-3 py-1 rounded-full bg-white/10">2FA: Verified</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: s.bg }}
              >
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Manage Users", icon: Users, page: "sa-users", color: "#293682" },
            { label: "Client Registry", icon: Building2, page: "sa-clients", color: "#0a7e87" },
            {
              label: "Security Center",
              icon: ShieldCheck,
              page: "sa-security-settings",
              color: "#002082",
            },
            { label: "Audit Logs", icon: Activity, page: "sa-audit-logs", color: "#f6b037" },
          ].map((q) => (
            <Link key={q.label} to={createPageUrl(q.page)}>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${q.color}15` }}
                >
                  <q.icon className="w-4.5 h-4.5" style={{ color: q.color }} />
                </div>
                <span className="text-sm font-semibold text-slate-700">{q.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Audit Log Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Live Audit Feed</h3>
            <span className="text-xs text-slate-400">Last 24 hours — insert-only log</span>
          </div>
          <div className="divide-y divide-slate-50">
            {RECENT_AUDIT.map((log, i) => {
              const colors = TYPE_COLORS[log.type];
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: colors.dot }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700">{log.user}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {log.role}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500">
                        {log.module}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{log.action}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                    {log.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4">System Health</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "Availity API", status: "Operational" },
              { label: "Database", status: "Operational" },
              { label: "Auth Service", status: "Operational" },
              { label: "Audit Logger", status: "Operational" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700">{s.label}</p>
                <p className="text-[10px] text-emerald-600">{s.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
