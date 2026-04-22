import { useAuthUserQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import {
  Wifi,
  Globe,
  Database,
  Monitor,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ClipboardList,
  Activity,
  Clock,
} from "lucide-react";

const METHOD_STATS = [
  {
    label: "Availity API",
    icon: Wifi,
    count: 31,
    pct: 66,
    avgMs: 2800,
    color: "#15803d",
    bg: "#f0fdf4",
  },
  {
    label: "Direct Payer API",
    icon: Globe,
    count: 8,
    pct: 17,
    avgMs: 1600,
    color: "#1d4ed8",
    bg: "#eff6ff",
  },
  {
    label: "EMR Integration",
    icon: Database,
    count: 5,
    pct: 10,
    avgMs: 900,
    color: "#6d28d9",
    bg: "#f5f3ff",
  },
  {
    label: "Portal Automation",
    icon: Monitor,
    count: 3,
    pct: 7,
    avgMs: 11200,
    color: "#b45309",
    bg: "#fffbeb",
  },
];

const TOP_METRICS = [
  {
    label: "Eligibility Checks Today",
    value: 47,
    trend: +12,
    up: true,
    icon: Activity,
    color: "#0a7e87",
    bg: "#f0fdfa",
  },
  {
    label: "Avg Response Time",
    value: "2.8s",
    trend: -0.4,
    up: true,
    suffix: "s faster",
    icon: Clock,
    color: "#293682",
    bg: "#eef3ff",
  },
  {
    label: "Failed / Manual Follow-up",
    value: 5,
    trend: +2,
    up: false,
    icon: AlertTriangle,
    color: "#dc2626",
    bg: "#fef2f2",
  },
  {
    label: "Converted to Prior Auth",
    value: 18,
    trend: +3,
    up: true,
    icon: ClipboardList,
    color: "#f6b037",
    bg: "#fffbeb",
  },
];

const FAILED_CHECKS = [
  {
    id: "EL-03885",
    patient: "Kevin B. Walsh",
    payer: "Molina",
    reason: "Payer timeout — portal login failed",
    specialist: "Sam Torres",
    time: "1 hr ago",
  },
  {
    id: "EL-03881",
    patient: "Tania M. Osei",
    payer: "WellCare",
    reason: "Member ID not found in payer system",
    specialist: "Priya Mehta",
    time: "2 hr ago",
  },
  {
    id: "EL-03876",
    patient: "Raj V. Kapoor",
    payer: "Anthem",
    reason: "Availity returned incomplete EB segments",
    specialist: "Dana Kim",
    time: "3 hr ago",
  },
];

export default function EligibilityDashboard() {
  const { data: user } = useAuthUserQuery({ withDefaultRole: "staffingly_supervisor" });

  return (
    <StaffinglyLayout
      user={user}
      currentPage="new-verification"
      title="Eligibility Enterprise Dashboard"
      breadcrumbs={["Eligibility", "Dashboard"]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Top Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TOP_METRICS.map((m, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: m.bg }}
              >
                <m.icon className="w-5 h-5" style={{ color: m.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-slate-800">{m.value}</p>
                <p className="text-xs text-slate-500 leading-tight mt-0.5">{m.label}</p>
                <span
                  className={`flex items-center gap-0.5 text-[11px] font-bold mt-1 ${m.up ? "text-emerald-600" : "text-red-500"}`}
                >
                  {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {m.trend > 0 ? "+" : ""}
                  {m.trend} vs last week
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Connection Method Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Checks by Connection Method — Today</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Shows which integration handled each eligibility request
            </p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {METHOD_STATS.map((m, i) => {
              const Icon = m.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl border p-4"
                  style={{ backgroundColor: m.bg, borderColor: `${m.color}30` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4" style={{ color: m.color }} />
                    <span className="text-xs font-bold" style={{ color: m.color }}>
                      {m.label}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{m.count}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Share</span>
                      <span className="font-bold">{m.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3">
                    Avg:{" "}
                    <span className="font-bold text-slate-700">{(m.avgMs / 1000).toFixed(1)}s</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Combined bar */}
          <div className="px-6 pb-5">
            <p className="text-xs text-slate-500 mb-2">Combined usage today</p>
            <div className="h-3 rounded-full overflow-hidden flex">
              {METHOD_STATS.map((m, i) => (
                <div
                  key={i}
                  className="h-full"
                  style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                  title={`${m.label}: ${m.pct}%`}
                />
              ))}
            </div>
            <div className="flex gap-4 mt-2 flex-wrap">
              {METHOD_STATS.map((m, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.label} ({m.pct}%)
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Failed Checks */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="font-bold text-slate-800">
                Failed Checks — Manual Follow-up Required
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">
              {FAILED_CHECKS.length} pending
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {FAILED_CHECKS.map((fc, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-700 text-xs">{fc.id}</span>
                    <span className="font-semibold text-slate-800 text-xs">{fc.patient}</span>
                    <span className="text-slate-500 text-xs">· {fc.payer}</span>
                  </div>
                  <p className="text-xs text-red-600 mt-0.5">{fc.reason}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Specialist: {fc.specialist}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400">{fc.time}</span>
                  <button
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-bold"
                    style={{ backgroundColor: "#293682" }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
