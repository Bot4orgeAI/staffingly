import { Activity } from "lucide-react";

const STATUS_STYLE = {
  Approved: { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a" },
  Denied: { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
  Pending: { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  Submitted: { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  Flagged: { bg: "#fdf4ff", text: "#7e22ce", dot: "#a855f7" },
  "In Progress": { bg: "#f0fdfa", text: "#0f766e", dot: "#0d9488" },
};

const DUMMY_ACTIVITY = [
  {
    id: "PA-00412",
    action: "Prior Auth Submitted",
    client: "Sunrise Family Clinic",
    time: "3 min ago",
    status: "Submitted",
  },
  {
    id: "EL-03891",
    action: "Eligibility Verified",
    client: "Lakeview Orthopedics",
    time: "8 min ago",
    status: "Approved",
  },
  {
    id: "PA-00411",
    action: "PA Approved by Aetna",
    client: "Metro Mental Health",
    time: "22 min ago",
    status: "Approved",
  },
  {
    id: "EL-03888",
    action: "Coverage Flagged",
    client: "Sunrise Family Clinic",
    time: "34 min ago",
    status: "Flagged",
  },
  {
    id: "PA-00409",
    action: "PA Denied by UHC",
    client: "Lakeview Orthopedics",
    time: "1 hr ago",
    status: "Denied",
  },
  {
    id: "EL-03882",
    action: "Eligibility Checked",
    client: "Metro Mental Health",
    time: "1 hr ago",
    status: "Approved",
  },
  {
    id: "PA-00408",
    action: "Prior Auth In Review",
    client: "Sunrise Family Clinic",
    time: "2 hr ago",
    status: "In Progress",
  },
  {
    id: "EL-03875",
    action: "Eligibility Checked",
    client: "Lakeview Orthopedics",
    time: "3 hr ago",
    status: "Approved",
  },
  {
    id: "PA-00405",
    action: "Additional Info Requested",
    client: "Metro Mental Health",
    time: "4 hr ago",
    status: "Pending",
  },
  {
    id: "EL-03860",
    action: "Coverage Inactive",
    client: "Sunrise Family Clinic",
    time: "5 hr ago",
    status: "Denied",
  },
];

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
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-800">Recent Activity</h3>
        </div>
        <span className="text-xs text-slate-400">Last 10 actions</span>
      </div>

      {loading ? (
        <div>
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : DUMMY_ACTIVITY.length === 0 ? (
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
              {DUMMY_ACTIVITY.map((row, i) => {
                const st = STATUS_STYLE[row.status] || STATUS_STYLE.Pending;
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
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
