import { useState } from "react";
import { createPageUrl } from "@/lib/utils/page";
import { useAuthUserQuery } from "@/lib/query";
import AppHeader from "@/components/insuverif/AppHeader";
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
} from "lucide-react";

const INITIAL_QUEUE = [
  {
    id: "q1",
    patient_name: "Robert T. Sanchez",
    payer: "Medicaid",
    confidence_score: 58,
    flag_reason: "Coverage termination today",
    time_waiting: "15 min",
    assigned_to: "Unassigned",
    priority: "HIGH",
    status: "Pending",
  },
  {
    id: "q2",
    patient_name: "Patricia M. Owens",
    payer: "UnitedHealthcare",
    confidence_score: 67,
    flag_reason: "Prior auth required, not initiated",
    time_waiting: "1 hr",
    assigned_to: "Unassigned",
    priority: "HIGH",
    status: "Pending",
  },
  {
    id: "q3",
    patient_name: "Angela B. Torres",
    payer: "Aetna",
    confidence_score: 72,
    flag_reason: "HMO — no PCP referral on file",
    time_waiting: "2 hrs",
    assigned_to: "Maria S.",
    priority: "MEDIUM",
    status: "In Progress",
  },
  {
    id: "q4",
    patient_name: "Kevin M. Rhodes",
    payer: "BCBS",
    confidence_score: 69,
    flag_reason: "Member ID format mismatch",
    time_waiting: "3 hrs",
    assigned_to: "Unassigned",
    priority: "MEDIUM",
    status: "Pending",
  },
  {
    id: "q5",
    patient_name: "Janet F. Williams",
    payer: "Humana",
    confidence_score: 74,
    flag_reason: "Coverage gap detected — 4 day lapse",
    time_waiting: "4 hrs",
    assigned_to: "Unassigned",
    priority: "LOW",
    status: "Pending",
  },
];

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
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = queue.filter(
    (q) =>
      q.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      q.payer.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = (id, action, note, reviewerName) => {
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
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#eef3ff", fontFamily: "'DM Sans', sans-serif" }}
    >
      <AppHeader
        user={user}
        breadcrumbs={[
          { label: "Dashboard", href: createPageUrl("dashboard") },
          { label: "Human Review Queue" },
        ]}
      />

      {selected && (
        <ReviewPanel
          item={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          user={user}
        />
      )}

      <main className="p-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">Human Review Queue</h1>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#dc2626" }}
            >
              {pendingCount} Pending
            </span>
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search queue..."
              className="pl-3 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none w-48 bg-white"
            />
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
      </main>
    </div>
  );
}
