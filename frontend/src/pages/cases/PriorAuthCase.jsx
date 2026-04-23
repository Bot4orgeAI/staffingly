import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys, useEntityDetailQuery } from "@/lib/query";
import PACaseIntake from "@/components/priorauth/PACaseIntake.jsx";
import PADocumentsTab from "@/components/documents/CaseDocumentsTab.jsx";
import PAAIReview from "@/components/priorauth/PAAIReview.jsx";
import PASubmission from "@/components/priorauth/PASubmission.jsx";
import PADenialAppeal from "@/components/priorauth/PADenialAppeal.jsx";
import { FileText, FolderOpen, Cpu, Send, AlertTriangle, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { normalizePriorAuthCase } from "@/lib/utils/priorAuth";

const STATUS_STYLES = {
  New: { bg: "#f1f5f9", text: "#475569" },
  "In Progress": { bg: "#eff6ff", text: "#1d4ed8" },
  "Awaiting Documents": { bg: "#fffbeb", text: "#92400e" },
  "Awaiting AI Review": { bg: "#f5f3ff", text: "#6d28d9" },
  "Pending Supervisor Approval": { bg: "#fff7ed", text: "#c2410c" },
  Submitted: { bg: "#f0fdfa", text: "#0f766e" },
  Approved: { bg: "#f0fdf4", text: "#15803d" },
  Denied: { bg: "#fef2f2", text: "#b91c1c" },
  "Appeal In Progress": { bg: "#fff7ed", text: "#9a3412" },
  "Peer To Peer Requested": { bg: "#eef2ff", text: "#3730a3" },
  Closed: { bg: "#f8fafc", text: "#64748b" },
};

const TABS = [
  { key: "intake", label: "Case Intake", icon: FileText },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "ai_review", label: "AI Review", icon: Cpu },
  { key: "submission", label: "Submission", icon: Send },
  { key: "denial", label: "Denial & Appeal", icon: AlertTriangle },
];

function PriorAuthCaseContent({ caseId }) {
  const [activeTab, setActiveTab] = useState("intake");
  const queryClient = useQueryClient();
  const { data: paCase = null, isLoading: loadingCase } = useEntityDetailQuery(
    "PriorAuthCase",
    caseId,
    { enabled: Boolean(caseId) }
  );
  const updateCase = async (updates) => {
    await api.entities.PriorAuthCase.update(caseId, updates);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.entity.detail("PriorAuthCase", caseId),
    });
  };

  const normalizedCase = normalizePriorAuthCase(paCase);
  const st = normalizedCase
    ? STATUS_STYLES[normalizedCase.status] || STATUS_STYLES["New"]
    : STATUS_STYLES["New"];

  return (
    <div className="w-full max-w-none space-y-4">
      {loadingCase ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-100" />
                <div className="space-y-2">
                  <div className="h-6 w-48 rounded bg-slate-200" />
                  <div className="h-4 w-72 rounded bg-slate-100" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="ml-auto h-3 w-24 rounded bg-slate-100" />
                <div className="ml-auto h-8 w-16 rounded bg-slate-200" />
              </div>
            </div>
          </div>

          <div className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-9 w-28 rounded-lg bg-slate-100" />
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-slate-200 border-t-[#293682] animate-spin" />
            <p className="mt-4 text-center text-sm text-slate-500">Loading case details...</p>
          </div>
        </div>
      ) : !normalizedCase ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-slate-500">Case not found.</p>
        </div>
      ) : (
        <>
          {/* Case Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div className="flex items-center gap-3">
                <Link to={createPageUrl("prior-auth")}>
                  <button className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="whitespace-nowrap text-xl font-bold text-slate-800">
                      Case {normalizedCase.case_id || normalizedCase.id?.slice(-6)}
                    </h1>
                    <span
                      className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: st.bg, color: st.text }}
                    >
                      {normalizedCase.status}
                    </span>
                    {normalizedCase.urgency === "Urgent" && (
                      <span className="whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
                        URGENT
                      </span>
                    )}
                    {normalizedCase.p2p_physician_name && (
                      <span className="whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                        P2P Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {normalizedCase.patient_name || normalizedCase.patient_initials} ·{" "}
                    {normalizedCase.payer_name} · {normalizedCase.procedure_name}
                  </p>
                </div>
              </div>
              {normalizedCase.ai_confidence_score != null && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    AI Confidence
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{
                      color: normalizedCase.ai_confidence_score >= 75 ? "#16a34a" : "#d97706",
                    }}
                  >
                    {normalizedCase.ai_confidence_score}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? "text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                style={activeTab === tab.key ? { backgroundColor: "#293682" } : {}}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "intake" && <PACaseIntake paCase={normalizedCase} onUpdate={updateCase} />}
          {activeTab === "documents" && (
            <PADocumentsTab paCase={normalizedCase} onUpdate={updateCase} />
          )}
          {activeTab === "ai_review" && (
            <PAAIReview paCase={normalizedCase} onUpdate={updateCase} />
          )}
          {activeTab === "submission" && (
            <PASubmission paCase={normalizedCase} onUpdate={updateCase} />
          )}
          {activeTab === "denial" && (
            <PADenialAppeal paCase={normalizedCase} onUpdate={updateCase} />
          )}
        </>
      )}
    </div>
  );
}

export default function PriorAuthCase() {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get("id");

  return <PriorAuthCaseContent caseId={caseId} />;
}
