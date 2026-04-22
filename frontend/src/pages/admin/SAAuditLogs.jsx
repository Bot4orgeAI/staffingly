import { useState } from "react";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Search, Download, Lock, Loader2 } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const ACTION_COLORS = {
  UPDATE: { bg: "#fffbeb", text: "#b45309" },
  EXPORT: { bg: "#eff6ff", text: "#1d4ed8" },
  CREATE: { bg: "#f0fdf4", text: "#15803d" },
  APPROVE: { bg: "#f0fdfa", text: "#0f766e" },
  FAILED_LOGIN: { bg: "#fef2f2", text: "#dc2626" },
  LOGIN_LOCKED: { bg: "#fef2f2", text: "#dc2626" },
  DELETE: { bg: "#fdf2f8", text: "#9d174d" },
};

function parseLog(log) {
  let metadata = {};
  try {
    metadata = log.metadata ? JSON.parse(log.metadata) : {};
  } catch {
    metadata = {};
  }

  return {
    id: log.id,
    userId: log.userEmail || "—",
    role: metadata.role || "—",
    actionType: log.action,
    module: metadata.module || log.entityType || "—",
    recordId: log.entityId,
    oldValue: metadata.oldValue || null,
    newValue: metadata.newValue || null,
    ipAddress: metadata.ipAddress || "—",
    timestamp: log.createdAt ? new Date(log.createdAt).toLocaleString() : "—",
  };
}

export default function SAAuditLogs() {
  const { data: user } = useAuthUserQuery({ withDefaultRole: "super_admin" });
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const { data: rawLogs = [], isLoading } = useEntityListQuery(
    "StaffinglyAuditLog",
    { limit: 100 },
    null
  );
  const logs = rawLogs.map((log) => parseLog(log));

  const modules = ["all", ...new Set(logs.map((l) => l.module))];
  const actions = ["all", ...new Set(logs.map((l) => l.actionType))];

  const filtered = logs.filter((l) => {
    const matchSearch = `${l.userId} ${l.module} ${l.actionType} ${l.ipAddress}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchModule = filterModule === "all" || l.module === filterModule;
    const matchAction = filterAction === "all" || l.actionType === filterAction;
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
              <p className="mt-2 text-sm text-slate-500">
                Tamper-proof, insert-only trail of all critical system actions and identity events.
              </p>
            </div>
          </div>
        </div>

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
            <AppSelect
              value={filterModule}
              onValueChange={setFilterModule}
              options={modules.map((m) => ({ label: m === "all" ? "All Modules" : m, value: m }))}
              triggerClassName="w-[140px] h-8 text-xs"
            />
            <AppSelect
              value={filterAction}
              onValueChange={setFilterAction}
              options={actions.map((a) => ({ label: a === "all" ? "All Actions" : a, value: a }))}
              triggerClassName="w-[140px] h-8 text-xs"
            />
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
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading audit logs...
                      </span>
                    </td>
                  </tr>
                )}
                {filtered.map((log) => {
                  const ac = ACTION_COLORS[log.actionType] || { bg: "#f8fafc", text: "#475569" };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {log.userId}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{log.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: ac.bg, color: ac.text }}
                        >
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.module}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{log.recordId || "—"}</td>
                      <td className="px-4 py-3 max-w-xs">
                        {log.oldValue && (
                          <p className="text-red-500 truncate">- {log.oldValue}</p>
                        )}
                        {log.newValue && (
                          <p className="text-emerald-600 truncate">+ {log.newValue}</p>
                        )}
                        {!log.oldValue && !log.newValue && (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{log.ipAddress}</td>
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
