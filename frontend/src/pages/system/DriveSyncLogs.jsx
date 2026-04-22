import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { RefreshCw, CheckCircle, XCircle, Loader2, Activity, Clock } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const STORAGE_LABELS = {
  google_drive: "Google Drive",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
  staffingly_portal: "Staffingly Portal",
};

export default function DriveSyncLogs() {
  const [triggering, setTriggering] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingUser } = useAuthUserQuery();
  const { data: logs = [], isLoading: loadingLogs } = useEntityListQuery(
    "DriveSyncLog",
    "-created_date",
    100,
    { enabled: Boolean(user), refetchInterval: 10000 }
  );

  const refreshLogs = () => queryClient.invalidateQueries({ queryKey: ["entity", "DriveSyncLog"] });

  const handleManualSync = async () => {
    setTriggering(true);
    await api.functions.invoke("documentIntakeSync", {});
    await refreshLogs();
    setTriggering(false);
  };

  const filtered = logs.filter((l) => filterStatus === "All" || l.status === filterStatus);

  // Summary stats
  const { last24h, totalFiles, totalMatched, totalUnmatched } = useMemo(() => {
    const recentLogs = logs.filter(
      (l) => l.sync_started_at && Date.now() - new Date(l.sync_started_at).getTime() < 86400000
    );
    return {
      last24h: recentLogs,
      totalFiles: recentLogs.reduce((s, l) => s + (l.files_detected || 0), 0),
      totalMatched: recentLogs.reduce((s, l) => s + (l.files_matched || 0), 0),
      totalUnmatched: recentLogs.reduce((s, l) => s + (l.files_unmatched || 0), 0),
    };
  }, [logs]);

  return (
    <StaffinglyLayout
      user={user}
      currentPage="drive-sync-logs"
      title="Drive Sync Logs"
      breadcrumbs={["Documents", "Sync Logs"]}
    >
      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Drive Sync Logs</h1>
              <p className="mt-2 text-sm text-slate-500">
                Track document synchronization from external storage providers and manage manual sync runs.
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={triggering}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-sm disabled:opacity-50 hover:opacity-90 transition-all"
              style={{ backgroundColor: "#293682" }}
            >
              {triggering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {triggering ? "Syncing…" : "Trigger Manual Sync"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Sync Runs (24h)",
              value: last24h.length,
              color: "#293682",
              bg: "#eef3ff",
              icon: Activity,
            },
            {
              label: "Files Detected (24h)",
              value: totalFiles,
              color: "#0a7e87",
              bg: "#f0fdfa",
              icon: Activity,
            },
            {
              label: "Auto-Matched (24h)",
              value: totalMatched,
              color: "#16a34a",
              bg: "#f0fdf4",
              icon: CheckCircle,
            },
            {
              label: "Unmatched (24h)",
              value: totalUnmatched,
              color: "#d97706",
              bg: "#fffbeb",
              icon: XCircle,
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm"
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

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-sm">
          <div className="flex flex-wrap gap-3 flex-1 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Status</span>
            <AppSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              options={["All", "Completed", "Running", "Failed"]}
              triggerClassName="h-9 w-[180px] rounded-xl px-3 py-2 text-xs"
            />
          </div>
          <button
            onClick={refreshLogs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loadingUser || loadingLogs ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No sync logs yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "Client",
                      "Storage",
                      "Started",
                      "Duration",
                      "Detected",
                      "Matched",
                      "Unmatched",
                      "Errors",
                      "Status",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const dur =
                      log.sync_started_at && log.sync_completed_at
                        ? (
                            (new Date(log.sync_completed_at).getTime() -
                              new Date(log.sync_started_at).getTime()) /
                            1000
                          ).toFixed(1) + "s"
                        : "—";

                    return (
                      <tr
                        key={log.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                          {log.client_name || log.client_id?.slice(-8)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            {STORAGE_LABELS[log.storage_type] || log.storage_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {log.sync_started_at
                              ? new Date(log.sync_started_at).toLocaleString()
                              : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">{dur}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">
                          {log.files_detected ?? 0}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">
                          {log.files_matched ?? 0}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-amber-600">
                          {log.files_unmatched ?? 0}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-red-500">
                          {log.files_errored ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              log.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : log.status === "Failed"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {log.status === "Completed" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : log.status === "Failed" ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            {log.status}
                          </span>
                          {log.error_message && (
                            <p className="text-[10px] text-red-500 mt-0.5 max-w-[150px] truncate">
                              {log.error_message}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StaffinglyLayout>
  );
}
