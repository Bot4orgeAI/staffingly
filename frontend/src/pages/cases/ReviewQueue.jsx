import { useEffect, useState } from "react";
import { createPageUrl } from "@/lib/utils/page";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import StatusBadge from "@/components/insuverif/StatusBadge";
import ConfidenceGauge from "@/components/insuverif/ConfidenceGauge";
import {
  X,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  MessageSquare,
  Edit3,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
} from "lucide-react";

const ACTIONS = [
  { key: "approve", icon: CheckCircle, label: "Approve & Mark Active", color: "#16a34a" },
  { key: "inactive", icon: XCircle, label: "Mark as Inactive", color: "#dc2626" },
  { key: "escalate", icon: ArrowUpCircle, label: "Escalate to Supervisor", color: "#d97706" },
  { key: "request", icon: MessageSquare, label: "Request Update from Patient", color: "#0a7e87" },
  { key: "override", icon: Edit3, label: "Override with Manual Entry", color: "#293682" },
];

function ReviewPanel({ item, onClose, onAction, user }) {
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!note.trim()) return alert("Please enter a reason note.");
    onAction(item.id, action, note, user?.full_name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
        <div
          className="p-5 border-b border-slate-200 flex items-center justify-between"
          style={{ backgroundColor: "#002082" }}
        >
          <h2 className="text-white font-bold">Review: {item.patient_name}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="rounded-xl p-4 bg-slate-50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Payer</span>
              <span className="font-semibold">{item.payer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Confidence</span>
              <ConfidenceGauge score={item.confidence_score} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Priority</span>
              <StatusBadge status={item.priority} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={item.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waiting</span>
              <span className="font-medium">{item.time_waiting}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 block mb-1">Flag Reason</span>
              <p className="text-amber-700 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {item.flag_reason}
              </p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-slate-700 text-sm mb-3">Choose Action</p>
            <div className="space-y-2">
              {ACTIONS.map(({ key, icon: Icon, label, color }) => (
                <button
                  key={key}
                  onClick={() => setAction(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    action === key ? "border-current" : "border-slate-200"
                  }`}
                  style={{
                    color: action === key ? color : "#64748b",
                    backgroundColor: action === key ? `${color}10` : "white",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {action && (
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Reason Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter reason for this action..."
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2"
                rows={4}
              />
              <p className="text-xs text-slate-400 mt-1">
                Reviewer: {user?.full_name} · {new Date().toLocaleString()}
              </p>
            </div>
          )}

          {action && (
            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{ backgroundColor: "#293682" }}
            >
              Submit Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewQueue() {
  const { data: user } = useAuthUserQuery();
  const { data: history = [], isLoading } = useEntityListQuery("EligibilityHistory", { limit: 100 }, null);
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const nextQueue = history
      .filter(
        (item) =>
          item.requiresHumanReview ||
          item.coverageStatus === "Unknown" ||
          (item.confidenceScore != null && item.confidenceScore < 75)
      )
      .map((item) => {
        let flags = [];
        try {
          flags = item.flagsJson ? JSON.parse(item.flagsJson) : [];
        } catch {
          flags = [];
        }

        return {
          id: item.id,
          patient_name: item.subscriberName || "Unknown patient",
          payer: item.payer || "Unknown payer",
          confidence_score: item.confidenceScore || 0,
          flag_reason: flags[0] || "Requires manual review",
          time_waiting: item.createdAt ? new Date(item.createdAt).toLocaleString() : "—",
          assigned_to: item.verifiedBy || "Unassigned",
          priority:
            item.confidenceScore < 65 || item.coverageStatus === "Inactive"
              ? "HIGH"
              : item.confidenceScore < 75
                ? "MEDIUM"
                : "LOW",
          status: item.requiresHumanReview ? "Pending" : "In Progress",
        };
      });

    setQueue(nextQueue);
  }, [history]);

  const filtered = queue.filter(
    (q) =>
      q.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      q.payer.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = async (id, action, note, reviewerName) => {
    await api.entities.EligibilityHistory.update(id, {
      requires_human_review: action === "escalate",
      verified_by: reviewerName,
      flags_json: JSON.stringify([note]),
    });

    setQueue((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status:
                action === "escalate"
                  ? "Escalated"
                  : action === "approve"
                    ? "Resolved"
                    : action === "inactive"
                      ? "Resolved"
                      : "In Progress",
              reviewer_action: action,
              reviewer_note: note,
              reviewed_by: reviewerName,
            }
          : q
      )
    );
  };

  const pendingCount = queue.filter((q) => q.status === "Pending").length;

  return (
    <StaffinglyLayout
      user={user}
      currentPage="human-review"
      title="Human Review Queue"
      breadcrumbs={["Eligibility", "Review Queue"]}
    >
      {selected && (
        <ReviewPanel
          item={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          user={user}
        />
      )}

      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Human Review Queue</h1>
              <p className="mt-2 text-sm text-slate-500">
                Audit and resolve eligibility verifications that require manual attention.
              </p>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-sm font-bold shadow-sm"
              style={{ backgroundColor: "#dc2626" }}
            >
              <AlertTriangle className="w-4 h-4" /> {pendingCount} Pending
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-sm">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search queue..."
                className="w-full sm:w-72 pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#0a7e87]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    "Patient Name",
                    "Payer",
                    "Confidence",
                    "Flag Reason",
                    "Waiting",
                    "Assigned To",
                    "Priority",
                    "Status",
                    "Action",
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
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading review queue...
                      </span>
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {row.patient_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.payer}</td>
                    <td className="px-4 py-3">
                      <ConfidenceGauge score={row.confidence_score} />
                    </td>
                    <td className="px-4 py-3 text-amber-700 max-w-[200px]">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        {row.flag_reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {row.time_waiting}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.assigned_to}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      {row.status !== "Resolved" ? (
                        <button
                          onClick={() => setSelected(row)}
                          className="px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-opacity hover:opacity-90"
                          style={{
                            backgroundColor: row.status === "In Progress" ? "#0a7e87" : "#293682",
                          }}
                        >
                          {row.status === "In Progress" ? "View" : "Review"}
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Done
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
