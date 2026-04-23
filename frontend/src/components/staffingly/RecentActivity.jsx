import { useEntityListQuery } from "@/lib/query";
import { Activity } from "lucide-react";

const STATUS_STYLE = {
  Approved: { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a" },
  Denied: { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
  Pending: { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  Submitted: { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  Flagged: { bg: "#fdf4ff", text: "#7e22ce", dot: "#a855f7" },
  "In Progress": { bg: "#f0fdfa", text: "#0f766e", dot: "#0d9488" },
};

function getRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function buildEligibilityActivity(record, clientName) {
  let action = "Eligibility Checked";
  let status = "Approved";

  if (record.requiresHumanReview || record.coverageStatus === "Unknown") {
    action = "Coverage Flagged";
    status = "Flagged";
  } else if (record.coverageStatus === "Inactive") {
    action = "Coverage Inactive";
    status = "Denied";
  } else if (record.coverageStatus === "Active") {
    action = "Eligibility Verified";
    status = "Approved";
  }

  return {
    id: record.id,
    action,
    client: clientName,
    time: getRelativeTime(record.createdAt),
    status,
    sortDate: record.createdAt,
  };
}

function buildPriorAuthActivity(record) {
  const statusMap = {
    SUBMITTED: { action: "Prior Auth Submitted", status: "Submitted" },
    APPROVED: { action: `PA Approved by ${record.payerName || "payer"}`, status: "Approved" },
    DENIED: { action: `PA Denied by ${record.payerName || "payer"}`, status: "Denied" },
    PENDING_DOCUMENTS: { action: "Additional Info Requested", status: "Pending" },
    READY_FOR_SUBMISSION: { action: "Prior Auth Ready", status: "Pending" },
    INTAKE: { action: "Prior Auth In Review", status: "In Progress" },
  };

  const derived = statusMap[record.status] || {
    action: "Prior Auth Updated",
    status: "In Progress",
  };

  return {
    id: record.caseNumber || record.id,
    action: derived.action,
    client: record.client?.name || "—",
    time: getRelativeTime(record.createdAt),
    status: derived.status,
    sortDate: record.createdAt,
  };
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 animate-pulse">
      <div className="w-16 h-3 bg-slate-100 rounded-full" />
      <div className="flex-1 h-3 bg-slate-100 rounded-full" />
      <div className="w-24 h-3 bg-slate-100 rounded-full" />
      <div className="w-16 h-3 bg-slate-100 rounded-full" />
      <div className="w-16 h-5 bg-slate-100 rounded-full" />
    </div>
  );
}

export default function RecentActivity({ loading = false }) {
  const { data: history = [], isLoading: loadingHistory } = useEntityListQuery(
    "EligibilityHistory",
    { limit: 20 },
    null
  );
  const { data: priorAuthCases = [], isLoading: loadingCases } = useEntityListQuery(
    "PriorAuthCase",
    { page: 1, limit: 20 },
    null
  );
  const { data: clients = [] } = useEntityListQuery("Client", { limit: 100 }, null);

  const clientNames = Object.fromEntries(
    clients.map((client) => [client.id, client.practiceName || client.name || client.id])
  );

  const realActivities = [
    ...history.map((record) =>
      buildEligibilityActivity(record, clientNames[record.clientId] || record.clientId || "—")
    ),
    ...priorAuthCases.map((record) => buildPriorAuthActivity(record)),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  const activities = realActivities.slice(0, 10);

  const isLoading = loading || loadingHistory || loadingCases;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-800">Recent Activity</h3>
        </div>
        <span className="text-xs text-slate-400">Last 10 actions</span>
      </div>

      {isLoading ? (
        <div>
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#eef3ff" }}
          >
            <Activity className="w-8 h-8" style={{ color: "#293682" }} />
          </div>
          <p className="font-semibold text-slate-700">No activity yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Your recent eligibility checks and prior auths will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wider">
                  Case ID
                </th>
                <th className="px-5 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wider">
                  Action
                </th>
                <th className="px-5 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wider">
                  Client
                </th>
                <th className="px-5 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wider">
                  Time
                </th>
                <th className="px-5 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((row) => {
                const st = STATUS_STYLE[row.status] || STATUS_STYLE.Pending;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-slate-700">{row.id}</td>
                    <td className="px-5 py-3 text-slate-700">{row.action}</td>
                    <td className="px-5 py-3 text-slate-500">{row.client}</td>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{row.time}</td>
                    <td className="px-5 py-3">
                      <span
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit text-[10px] font-bold"
                        style={{ backgroundColor: st.bg, color: st.text }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: st.dot }}
                        />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
