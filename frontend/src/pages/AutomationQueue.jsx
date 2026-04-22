import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import {
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Monitor,
  Image,
} from "lucide-react";

const STATUS_CONFIG = {
  queued: { color: "#94a3b8", bg: "#f1f5f9", label: "Queued", icon: Clock },
  running: { color: "#3b82f6", bg: "#eff6ff", label: "Running", icon: Loader2 },
  completed: { color: "#15803d", bg: "#f0fdf4", label: "Completed", icon: CheckCircle },
  failed: { color: "#dc2626", bg: "#fef2f2", label: "Failed", icon: XCircle },
  timeout: { color: "#d97706", bg: "#fffbeb", label: "Timeout", icon: AlertTriangle },
};

const JOB_TYPE_LABELS = {
  eligibility_fallback: "Eligibility Fallback",
  prior_auth_submission: "Prior Auth Submission",
  covermymeds_web: "CoverMyMeds Web",
};

const ERROR_GUIDANCE = {
  credential_error: "Credentials failed. Rotate in Google Secret Manager, then retry manually.",
  field_mapping_error: "Portal layout changed. Update field map in Payer Rules, then retry.",
  portal_error: "Unexpected portal response. See screenshot. Retry after checking payer portal.",
  timeout: "Job timed out (>3 min). Portal may be slow. Retry during off-peak hours.",
  unknown: "Unknown error. Review screenshot and contact support.",
};

function ScreenshotViewer({ urls, onClose }) {
  const [idx, setIdx] = useState(0);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">
            Automation Screenshots ({idx + 1} / {urls.length})
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
          >
            ×
          </button>
        </div>
        <img
          src={urls[idx]}
          alt={`Screenshot ${idx + 1}`}
          className="w-full rounded-xl border border-slate-200 max-h-[60vh] object-contain"
        />
        {urls.length > 1 && (
          <div className="flex gap-2 justify-center mt-3">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === idx ? "scale-125" : "opacity-40"}`}
                style={{ backgroundColor: "#293682" }}
              />
            ))}
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button
            disabled={idx === 0}
            onClick={() => setIdx((i) => i - 1)}
            className="flex-1 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-30"
          >
            ← Previous
          </button>
          <button
            disabled={idx === urls.length - 1}
            onClick={() => setIdx((i) => i + 1)}
            className="flex-1 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutomationQueue() {
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [screenshotJob, setScreenshotJob] = useState(null);
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingUser } = useAuthUserQuery();
  const { data: jobs = [], isLoading: loadingJobs } = useEntityListQuery(
    "AutomationJob",
    "-queued_at",
    100,
    { enabled: Boolean(user), refetchInterval: 10000 }
  );

  const load = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["entity", "AutomationJob"] });
    setRefreshing(false);
  };

  const filtered = filterStatus === "all" ? jobs : jobs.filter((j) => j.status === filterStatus);
  const active = jobs.filter((j) => ["queued", "running"].includes(j.status));
  const canView = [
    "staffingly_supervisor",
    "staffingly_admin",
    "super_admin",
    "finance_admin",
  ].includes(user?.role);

  if (loadingUser || loadingJobs)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="automation-queue"
        title="Automation Queue"
        breadcrumbs={["Admin", "Automation Queue"]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      </StaffinglyLayout>
    );

  if (!canView)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="automation-queue"
        title="Automation Queue"
        breadcrumbs={["Admin", "Automation Queue"]}
      >
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
          <p className="text-slate-600 font-semibold">Access Restricted</p>
          <p className="text-sm text-slate-400 mt-1">
            You do not have permission to view the automation queue.
          </p>
        </div>
      </StaffinglyLayout>
    );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="automation-queue"
      title="Browser Automation Queue"
      breadcrumbs={["Admin", "Automation Queue"]}
    >
      <div className="max-w-[1200px] mx-auto space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Active / Queued",
              value: active.length,
              color: active.length > 20 ? "#dc2626" : "#293682",
            },
            {
              label: "Running Now",
              value: jobs.filter((j) => j.status === "running").length,
              color: "#3b82f6",
            },
            {
              label: "Completed Today",
              value: jobs.filter(
                (j) =>
                  j.status === "completed" &&
                  new Date(j.completed_at || j.created_date).toDateString() ===
                    new Date().toDateString()
              ).length,
              color: "#15803d",
            },
            {
              label: "Failed",
              value: jobs.filter((j) => j.status === "failed").length,
              color: "#dc2626",
            },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-2xl font-bold" style={{ color: c.color }}>
                {c.value}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {active.length > 20 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              Queue exceeds 20 jobs. For urgent cases, consider manual portal submission.
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {["all", "queued", "running", "completed", "failed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filterStatus === s ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
                style={filterStatus === s ? { backgroundColor: "#293682" } : {}}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <p className="text-xs text-slate-400 ml-auto">Auto-refreshes every 10s</p>
        </div>

        {/* Job Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Monitor className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400">No automation jobs match filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[
                      "Job ID",
                      "Type",
                      "Payer",
                      "Case",
                      "Priority",
                      "Status",
                      "Queued",
                      "Duration",
                      "Error",
                      "Screenshots",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job) => {
                    const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                    const StatusIcon = sc.icon;
                    const durationMs =
                      job.started_at && job.completed_at
                        ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
                        : null;
                    const durationStr = durationMs
                      ? `${Math.round(durationMs / 1000)}s`
                      : job.status === "running"
                        ? "Running…"
                        : "—";
                    return (
                      <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-500">
                          {job.job_id?.slice(-12) || job.id?.slice(-8)}
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                          {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-slate-800">
                          {job.payer_name}
                        </td>
                        <td className="px-3 py-3">
                          {job.case_id ? (
                            <Link to={createPageUrl(`PriorAuthCase?id=${job.case_id}`)}>
                              <span className="text-[#293682] text-xs font-bold hover:underline">
                                {job.case_id.slice(-6)}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {job.urgency === "Urgent" ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              <Zap className="w-3 h-3" />
                              Urgent
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Routine</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold w-fit"
                            style={{ backgroundColor: sc.bg, color: sc.color }}
                          >
                            <StatusIcon
                              className={`w-3 h-3 ${job.status === "running" ? "animate-spin" : ""}`}
                            />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {job.queued_at ? new Date(job.queued_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{durationStr}</td>
                        <td className="px-3 py-3 max-w-[180px]">
                          {job.error_message && (
                            <div>
                              <p className="text-[10px] font-bold text-red-600">
                                {job.error_type?.replace("_", " ")}
                              </p>
                              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                {ERROR_GUIDANCE[job.error_type] || job.error_message}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {job.screenshot_urls?.length > 0 && (
                            <button
                              onClick={() => setScreenshotJob(job)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <Image className="w-3 h-3" /> {job.screenshot_urls.length}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[10px] text-slate-400">{job.triggered_by}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {screenshotJob && (
        <ScreenshotViewer
          urls={screenshotJob.screenshot_urls}
          onClose={() => setScreenshotJob(null)}
        />
      )}
    </StaffinglyLayout>
  );
}
