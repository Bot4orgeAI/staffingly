import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Search, Download, Lock } from "lucide-react";

const DUMMY_LOGS = [
  {
    id: "1",
    user_id: "alex@staffingly.com",
    role: "super_admin",
    action_type: "UPDATE",
    module: "SecuritySettings",
    record_id: "sec-001",
    old_value: "session_timeout=6",
    new_value: "session_timeout=8",
    ip_address: "192.168.1.10",
    timestamp: "2026-03-01 09:02:11",
  },
  {
    id: "2",
    user_id: "jordan@staffingly.com",
    role: "finance_admin",
    action_type: "EXPORT",
    module: "Payroll",
    record_id: "payroll-feb",
    old_value: null,
    new_value: null,
    ip_address: "10.0.0.5",
    timestamp: "2026-03-01 08:44:30",
  },
  {
    id: "3",
    user_id: "unknown@89.34.12.1",
    role: "—",
    action_type: "FAILED_LOGIN",
    module: "Auth",
    record_id: null,
    old_value: null,
    new_value: null,
    ip_address: "89.34.12.1",
    timestamp: "2026-03-01 07:30:00",
  },
  {
    id: "4",
    user_id: "morgan@staffingly.com",
    role: "staffingly_admin",
    action_type: "CREATE",
    module: "Clients",
    record_id: "client-248",
    old_value: null,
    new_value: "Sunrise Clinic",
    ip_address: "10.0.0.8",
    timestamp: "2026-02-28 15:10:45",
  },
  {
    id: "5",
    user_id: "casey@staffingly.com",
    role: "staffingly_supervisor",
    action_type: "APPROVE",
    module: "Cases",
    record_id: "case-00382",
    old_value: "status=pending",
    new_value: "status=approved",
    ip_address: "10.0.0.22",
    timestamp: "2026-02-28 11:05:20",
  },
  {
    id: "6",
    user_id: "dana@staffingly.com",
    role: "staffingly_specialist",
    action_type: "LOGIN_LOCKED",
    module: "Auth",
    record_id: null,
    old_value: "failed_attempts=4",
    new_value: "account_locked=true",
    ip_address: "10.0.0.44",
    timestamp: "2026-02-27 16:55:00",
  },
];

const ACTION_COLORS = {
  UPDATE: { bg: "#fffbeb", text: "#b45309" },
  EXPORT: { bg: "#eff6ff", text: "#1d4ed8" },
  CREATE: { bg: "#f0fdf4", text: "#15803d" },
  APPROVE: { bg: "#f0fdfa", text: "#0f766e" },
  FAILED_LOGIN: { bg: "#fef2f2", text: "#dc2626" },
  LOGIN_LOCKED: { bg: "#fef2f2", text: "#dc2626" },
  DELETE: { bg: "#fdf2f8", text: "#9d174d" },
};

export default function SAAuditLogs() {
  const [user, setUser] = useState(null);
  const [logs] = useState(DUMMY_LOGS);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    api.auth
      .me()
      .then((u) => setUser({ ...u, role: u.role || "super_admin" }))
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const modules = ["all", ...new Set(DUMMY_LOGS.map((l) => l.module))];
  const actions = ["all", ...new Set(DUMMY_LOGS.map((l) => l.action_type))];

  const filtered = logs.filter((l) => {
    const matchSearch = `${l.user_id} ${l.module} ${l.action_type} ${l.ip_address}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchModule = filterModule === "all" || l.module === filterModule;
    const matchAction = filterAction === "all" || l.action_type === filterAction;
    return matchSearch && matchModule && matchAction;
  });

  return (
    <StaffinglyLayout
      user={user}
      currentPage="sa-audit-logs"
      title="Audit Logs"
      breadcrumbs={["Admin", "Audit Logs"]}
    >
      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Insert-Only Warning */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-300 bg-amber-50">
          <Lock className="w-4 h-4 text-amber-600" />
          <p className="text-amber-800 text-sm font-semibold">
            Insert-Only Table — Records are never updated or deleted. Full tamper-proof trail.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs…"
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none w-52"
              />
            </div>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m === "all" ? "All Modules" : m}
                </option>
              ))}
            </select>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a === "all" ? "All Actions" : a}
                </option>
              ))}
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    "Timestamp",
                    "User",
                    "Role",
                    "Action",
                    "Module",
                    "Record ID",
                    "Change",
                    "IP Address",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => {
                  const ac = ACTION_COLORS[log.action_type] || { bg: "#f8fafc", text: "#475569" };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {log.user_id}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{log.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: ac.bg, color: ac.text }}
                        >
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.module}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{log.record_id || "—"}</td>
                      <td className="px-4 py-3 max-w-xs">
                        {log.old_value && (
                          <p className="text-red-500 truncate">- {log.old_value}</p>
                        )}
                        {log.new_value && (
                          <p className="text-emerald-600 truncate">+ {log.new_value}</p>
                        )}
                        {!log.old_value && !log.new_value && (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{log.ip_address}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {logs.length} log entries
          </div>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
