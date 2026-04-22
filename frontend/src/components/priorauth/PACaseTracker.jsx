import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { Search, Filter, Plus, AlertTriangle, ChevronRight } from "lucide-react";

const STATUS_STYLES = {
  New: { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" },
  "In Progress": { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  "Awaiting Documents": { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  "Awaiting AI Review": { bg: "#f5f3ff", text: "#6d28d9", dot: "#8b5cf6" },
  "Pending Supervisor Approval": { bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  Submitted: { bg: "#f0fdfa", text: "#0f766e", dot: "#14b8a6" },
  Approved: { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  Denied: { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444" },
  "Appeal In Progress": { bg: "#fff7ed", text: "#9a3412", dot: "#ea580c" },
  "Peer To Peer Requested": { bg: "#eef2ff", text: "#3730a3", dot: "#6366f1" },
  Closed: { bg: "#f8fafc", text: "#64748b", dot: "#94a3b8" },
};

const URGENCY_STYLES = {
  Urgent: { bg: "#fef2f2", text: "#b91c1c" },
  Routine: { bg: "#f0fdf4", text: "#166534" },
};

export default function PACaseTracker({ user: _user, onStartNew }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterUrgency, setFilterUrgency] = useState("All");
  const [sortByDays, _setSortByDays] = useState(true);

  const { data: cases = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.entity.list("PriorAuthCase", { sortBy: "-created_date", limit: 100 }),
    queryFn: async () => {
      const data = await api.entities.PriorAuthCase.list("-created_date", 100);
      const now = Date.now();
      return data.map((c) => ({
        ...c,
        days_pending: c.created_date
          ? Math.floor((now - new Date(c.created_date).getTime()) / 86400000)
          : 0,
      }));
    },
  });

  const filtered = useMemo(
    () =>
      cases
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        c.case_id?.toLowerCase().includes(q) ||
        c.patient_initials?.toLowerCase().includes(q);
      const matchStatus = filterStatus === "All" || c.status === filterStatus;
      const matchUrgency = filterUrgency === "All" || c.urgency === filterUrgency;
      return matchSearch && matchStatus && matchUrgency;
    })
    .sort((a, b) => (sortByDays ? b.days_pending - a.days_pending : 0)),
    [cases, filterStatus, filterUrgency, search, sortByDays]
  );

  const getRowBorder = (days) => {
    if (days >= 3) return "border-l-4 border-l-red-400";
    if (days >= 2) return "border-l-4 border-l-amber-400";
    return "";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-[#293682] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading cases…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Case ID or patient initials…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none"
        >
          <option>All</option>
          {Object.keys(STATUS_STYLES).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none"
        >
          <option>All</option>
          <option>Routine</option>
          <option>Urgent</option>
        </select>
        <button
          onClick={onStartNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#293682" }}
        >
          <Plus className="w-4 h-4" /> New PA
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: "#eef3ff" }}
            >
              <Filter className="w-6 h-6" style={{ color: "#293682" }} />
            </div>
            <p className="font-semibold text-slate-700">No cases found</p>
            <p className="text-sm text-slate-400 mt-1">
              Start a new prior authorization to get started.
            </p>
            <button
              onClick={onStartNew}
              className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
              style={{ backgroundColor: "#293682" }}
            >
              Start Prior Auth
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {[
                    "Case ID",
                    "Patient",
                    "Payer",
                    "Procedure",
                    "Specialist",
                    "Status",
                    "Urgency",
                    "Days Pending",
                    "AI Score",
                    "",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const st = STATUS_STYLES[c.status] || STATUS_STYLES["New"];
                  const urg = URGENCY_STYLES[c.urgency] || URGENCY_STYLES["Routine"];
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${getRowBorder(c.days_pending)}`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 text-xs">
                        {c.case_id || c.id?.slice(-6)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {c.patient_initials}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.payer_name}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">
                        {c.procedure_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {c.assigned_specialist_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: st.bg, color: st.text }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: st.dot }}
                          />
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: urg.bg, color: urg.text }}
                        >
                          {c.urgency || "Routine"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {c.days_pending >= 2 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span
                            className={
                              c.days_pending >= 3
                                ? "text-red-600 font-bold"
                                : c.days_pending >= 2
                                  ? "text-amber-600 font-semibold"
                                  : "text-slate-600"
                            }
                          >
                            {c.days_pending}d
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.ai_confidence_score != null ? (
                          <span
                            className={`font-bold ${c.ai_confidence_score >= 75 ? "text-emerald-600" : "text-amber-600"}`}
                          >
                            {c.ai_confidence_score}%
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={createPageUrl(`PriorAuthCase?id=${c.id}`)}>
                          <button
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: "#293682" }}
                          >
                            Open <ChevronRight className="w-3 h-3" />
                          </button>
                        </Link>
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
  );
}
