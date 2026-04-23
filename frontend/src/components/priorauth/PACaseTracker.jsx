import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { Search, Filter, AlertTriangle, ChevronRight } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

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

const STATUS_LABELS = {
  INTAKE: "New",
  PENDING_DOCUMENTS: "Awaiting Documents",
  READY_FOR_SUBMISSION: "Pending Supervisor Approval",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  DENIED: "Denied",
  APPEAL_IN_PROGRESS: "Appeal In Progress",
  PEER_TO_PEER_REQUESTED: "Peer To Peer Requested",
  CLOSED: "Closed",
};

const URGENCY_LABELS = {
  ROUTINE: "Routine",
  URGENT: "Urgent",
  EXPEDITED: "Urgent",
};

function formatStatus(status) {
  if (!status) return "New";
  return STATUS_LABELS[status] || status;
}

function formatUrgency(urgency) {
  if (!urgency) return "Routine";
  return URGENCY_LABELS[urgency] || urgency;
}

function normalizeCase(caseRecord) {
  const createdAt = caseRecord.createdAt || caseRecord.created_date || null;
  const now = Date.now();
  const normalizedStatus = formatStatus(caseRecord.status);
  const normalizedUrgency = formatUrgency(caseRecord.urgency);
  const patientLabel =
    caseRecord.patientName ||
    caseRecord.patient_name ||
    caseRecord.patientInitials ||
    caseRecord.patient_initials ||
    "—";
  const specialistName =
    caseRecord.assignedSpecialistName ||
    caseRecord.assigned_specialist_name ||
    caseRecord.assignedSpecialist?.name ||
    caseRecord.assignedSpecialist?.email ||
    "—";

  return {
    ...caseRecord,
    case_id: caseRecord.case_id || caseRecord.caseNumber || caseRecord.id?.slice(-6),
    patient_initials: patientLabel,
    payer_name: caseRecord.payer_name || caseRecord.payerName || "—",
    procedure_name:
      caseRecord.procedure_name ||
      caseRecord.procedureName ||
      caseRecord.serviceType ||
      caseRecord.service_type ||
      "—",
    assigned_specialist_name: specialistName,
    ai_confidence_score: caseRecord.ai_confidence_score ?? caseRecord.aiConfidenceScore ?? null,
    status: normalizedStatus,
    urgency: normalizedUrgency,
    days_pending: createdAt
      ? Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 86400000))
      : caseRecord.days_pending || 0,
  };
}

const MOCK_CASES = [
  {
    id: "pa-case-00412",
    case_id: "PA-00412",
    patient_initials: "SJM",
    payer_name: "UnitedHealthcare",
    procedure_name: "Specialist Visit",
    status: "Submitted",
    urgency: "Routine",
    days_pending: 3,
    ai_confidence_score: 88,
    created_date: "2026-03-01T08:45:00Z",
  },
  {
    id: "pa-case-00411",
    case_id: "PA-00411",
    patient_initials: "RTS",
    payer_name: "Medicaid",
    procedure_name: "Behavioral Health",
    status: "Approved",
    urgency: "Routine",
    days_pending: 0,
    ai_confidence_score: 92,
    created_date: "2026-03-01T06:50:00Z",
  },
  {
    id: "pa-case-00409",
    case_id: "PA-00409",
    patient_initials: "MAT",
    payer_name: "Medicare",
    procedure_name: "MRI Lumbar Spine",
    status: "Denied",
    urgency: "Urgent",
    days_pending: 5,
    ai_confidence_score: 45,
    created_date: "2026-02-28T15:20:00Z",
  },
  {
    id: "pa-case-00408",
    case_id: "PA-00408",
    patient_initials: "LKP",
    payer_name: "BCBS",
    procedure_name: "Physical Therapy",
    status: "Awaiting Documents",
    urgency: "Routine",
    days_pending: 2,
    ai_confidence_score: null,
    created_date: "2026-02-28T13:05:00Z",
  },
  {
    id: "pa-case-demo-002",
    case_id: "PA-01002",
    patient_initials: "JH",
    payer_name: "Aetna",
    procedure_name: "Orthopedic Consult",
    status: "Awaiting AI Review",
    urgency: "Urgent",
    days_pending: 1,
    ai_confidence_score: 76,
    created_date: "2026-03-05T13:25:00Z",
  },
];

export default function PACaseTracker({ user: _user, onStartNew }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterUrgency, setFilterUrgency] = useState("All");
  const [sortByDays, _setSortByDays] = useState(true);

  const { data: cases = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.entity.list("PriorAuthCase", { sortBy: "-createdAt", limit: 100 }),
    queryFn: async () => {
      const data = await api.entities.PriorAuthCase.list("-createdAt", 100);

      // If no real data exists, use MOCK_CASES for demo purposes
      const finalData = data.length > 0 ? data : MOCK_CASES;

      return finalData.map(normalizeCase);
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
            c.patient_initials?.toLowerCase().includes(q) ||
            c.patientName?.toLowerCase().includes(q) ||
            c.payer_name?.toLowerCase().includes(q);
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
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col gap-3 shadow-sm">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Case ID or patient initials…"
              className="w-full sm:w-72 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#293682]"
            />
          </div>
          <AppSelect
            value={filterStatus}
            onValueChange={setFilterStatus}
            options={["All", ...Object.keys(STATUS_STYLES)]}
            triggerClassName="h-9 w-[180px] rounded-xl px-3 py-2 text-xs"
          />
          <AppSelect
            value={filterUrgency}
            onValueChange={setFilterUrgency}
            options={["All", "Routine", "Urgent"]}
            triggerClassName="h-9 w-[140px] rounded-xl px-3 py-2 text-xs"
          />
        </div>
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
                        <span className="whitespace-nowrap">{c.case_id || c.id?.slice(-6)}</span>
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
                          className="inline-flex whitespace-nowrap items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
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
