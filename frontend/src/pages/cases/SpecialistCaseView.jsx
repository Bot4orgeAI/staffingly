import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityFilterQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import {
  ChevronLeft,
  Search,
  Loader2,
  CheckSquare,
  Square,
  UserCheck,
  AlertTriangle,
  Activity,
} from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const STATUS_STYLES = {
  New: { bg: "#f1f5f9", text: "#475569" },
  "In Progress": { bg: "#eff6ff", text: "#1d4ed8" },
  "Awaiting Documents": { bg: "#fffbeb", text: "#92400e" },
  Submitted: { bg: "#f0fdfa", text: "#0f766e" },
  Approved: { bg: "#f0fdf4", text: "#15803d" },
  Denied: { bg: "#fef2f2", text: "#b91c1c" },
  Closed: { bg: "#f8fafc", text: "#64748b" },
};

const SLA_TARGETS = { Urgent: 2, Routine: 5 };

function daysBetween(a, b) {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function SpecialistCaseView() {
  const params = new URLSearchParams(window.location.search);
  const specialistId = params.get("specialist_id");
  const specialistName = params.get("specialist_name") || "Specialist";
  const activeTab = params.get("tab") || "cases";

  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingAuth } = useAuthUserQuery();

  const { data: cData = [], isLoading: loadingC } = useEntityFilterQuery(
    "PriorAuthCase",
    { assigned_specialist_id: specialistId },
    { enabled: Boolean(user && specialistId) }
  );

  const { data: sData = [], isLoading: loadingS } = useEntityFilterQuery(
    "StaffinglyUser",
    { role: "staffingly_specialist" },
    { enabled: Boolean(user) }
  );

  const { data: aData = [], isLoading: loadingA } = useEntityFilterQuery(
    "DailyActivityLog",
    { specialist_id: specialistId },
    { enabled: Boolean(user && specialistId) }
  );

  const cases = [...cData].sort(
    (a, b) =>
      new Date(b.updated_date || b.created_date).getTime() -
      new Date(a.updated_date || a.created_date).getTime()
  );
  
  const specialists = sData.filter((s) => s.id !== specialistId);
  const activityLogs = [...aData].sort(
    (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
  );

  const loading = loadingAuth || loadingC || loadingS || loadingA;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedCases, setSelectedCases] = useState([]);
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignNotes, setReassignNotes] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [currentTab, setCurrentTab] = useState(activeTab);

  const filtered = cases.filter((c) => {
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (c.case_id || c.id)?.toLowerCase().includes(q) ||
      c.patient_initials?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const toggleSelect = (id) => {
    setSelectedCases((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const reassignMutation = useMutation({
    mutationFn: async ({ targetSpec }) => {
      await Promise.all(
        selectedCases.map(async (caseDbId) => {
          await api.entities.PriorAuthCase.update(caseDbId, {
            assigned_specialist_id: reassignTo,
            assigned_specialist_name: targetSpec?.full_name || "Unknown",
          });
          await api.entities.StaffinglyAuditLog.create({
            user_id: user.id,
            role: user.role,
            action_type: "case_reassigned",
            module: "StaffTracker",
            record_id: caseDbId,
            new_value: JSON.stringify({ to: reassignTo, notes: reassignNotes }),
            timestamp: new Date().toISOString(),
          });
          await api.entities.ClientNotification.create({
            client_id: reassignTo,
            user_id: reassignTo,
            type: "general",
            title: "Case Reassigned to You",
            body: `A case has been reassigned to you. Reason: ${reassignNotes}`,
            read: false,
          });
        })
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "PriorAuthCase"] });
    },
  });

  const handleReassign = async () => {
    if (!reassignTo || !reassignNotes.trim()) return;
    setReassigning(true);
    const targetSpec = specialists.find((s) => s.id === reassignTo);
    await reassignMutation.mutateAsync({ targetSpec });
    setSelectedCases([]);
    setReassignModal(false);
    setReassignTo("");
    setReassignNotes("");
    setReassigning(false);
  };

  if (loading)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="staff-tracker"
        title={`${specialistName}'s Cases`}
        breadcrumbs={["Staff Tracker", specialistName]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      </StaffinglyLayout>
    );

  const canReassign = ["staffingly_supervisor", "staffingly_admin", "super_admin"].includes(
    user?.role
  );

  const TABS = [
    { key: "cases", label: "Cases", icon: CheckSquare },
    { key: "activity", label: "Activity Log", icon: Activity },
  ];

  return (
    <StaffinglyLayout
      user={user}
      currentPage="staff-tracker"
      title={`${specialistName} — Cases`}
      breadcrumbs={["Staff Tracker", specialistName]}
    >
      <div className="max-w-[1200px] mx-auto space-y-5">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("staff-tracker")}>
            <button className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{specialistName}</h1>
            <p className="text-sm text-slate-500">{cases.length} total cases</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setCurrentTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${currentTab === t.key ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
              style={currentTab === t.key ? { backgroundColor: "#293682" } : {}}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* CASES TAB */}
        {currentTab === "cases" && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Case ID or patient…"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
              <AppSelect
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={["All", ...Object.keys(STATUS_STYLES)]}
                triggerClassName="w-[180px]"
              />
              {canReassign && selectedCases.length > 0 && (
                <button
                  onClick={() => setReassignModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                  style={{ backgroundColor: "#d97706" }}
                >
                  <UserCheck className="w-4 h-4" /> Reassign {selectedCases.length} Cases
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No cases match filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {canReassign && <th className="px-4 py-3 w-8" />}
                        {[
                          "Case ID",
                          "Patient",
                          "Procedure",
                          "Payer",
                          "Status",
                          "Days Open",
                          "SLA",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => {
                        const st = STATUS_STYLES[c.status] || STATUS_STYLES["New"];
                        const daysOpen = daysBetween(c.created_date, new Date().toISOString());
                        const slaTarget =
                          c.urgency === "Urgent" ? SLA_TARGETS.Urgent : SLA_TARGETS.Routine;
                        const isSLABreached =
                          !["Approved", "Denied", "Closed"].includes(c.status) &&
                          daysOpen > slaTarget;
                        const isSelected = selectedCases.includes(c.id);
                        return (
                          <tr
                            key={c.id}
                            className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}
                          >
                            {canReassign && (
                              <td
                                className="px-4 py-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(c.id);
                                }}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 cursor-pointer" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 cursor-pointer" />
                                )}
                              </td>
                            )}
                            <td className="px-4 py-3 font-bold text-sm text-[#293682]">
                              {c.case_id || c.id?.slice(-6)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{c.patient_initials}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs max-w-[140px] truncate">
                              {c.procedure_name}
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{c.payer_name}</td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                                style={{ backgroundColor: st.bg, color: st.text }}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3 text-sm font-semibold"
                              style={{ color: daysOpen > slaTarget ? "#dc2626" : "#64748b" }}
                            >
                              {daysOpen}d
                            </td>
                            <td className="px-4 py-3">
                              {isSLABreached ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3" /> Breached
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  On Track
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Link to={createPageUrl(`prior-auth-case?id=${c.id}`)}>
                                <button className="text-xs font-semibold text-[#293682] hover:underline">
                                  Open
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
          </>
        )}

        {/* ACTIVITY LOG TAB */}
        {currentTab === "activity" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Daily Activity Log</h3>
            </div>
            {activityLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">No activity logged yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {[
                        "Date",
                        "Cases Created",
                        "Docs Uploaded",
                        "AI Reviews",
                        "Submissions",
                        "Denials",
                        "Appeals",
                        "Messages",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{log.log_date}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-800">
                          {log.cases_created || 0}
                        </td>
                        <td className="px-4 py-3 text-center">{log.documents_uploaded || 0}</td>
                        <td className="px-4 py-3 text-center">{log.ai_reviews_run || 0}</td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-700">
                          {log.submissions_made || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-red-600">
                          {log.denials_logged || 0}
                        </td>
                        <td className="px-4 py-3 text-center">{log.appeals_filed || 0}</td>
                        <td className="px-4 py-3 text-center">{log.messages_sent || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-4">
              Reassign {selectedCases.length} Case{selectedCases.length > 1 ? "s" : ""}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Assign To *
                </label>
                <AppSelect
                  value={reassignTo}
                  onValueChange={setReassignTo}
                  options={specialists.map((s) => ({ label: s.full_name || s.email, value: s.id }))}
                  placeholder="— Select specialist —"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Reason for Reassignment *
                </label>
                <textarea
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  rows={3}
                  placeholder="Required — explain why cases are being reassigned…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setReassignModal(false);
                  setReassignTo("");
                  setReassignNotes("");
                }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={!reassignTo || !reassignNotes.trim() || reassigning}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: "#293682" }}
              >
                {reassigning ? "Reassigning…" : "Confirm Reassign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffinglyLayout>
  );
}
