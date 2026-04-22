import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { api } from "@/lib/api";
import { queryKeys, useAuthUserQuery, useEntityDetailQuery, useEntityListQuery } from "@/lib/query";
import PACaseIntake from "@/components/priorauth/PACaseIntake.jsx";
import PADocumentsTab from "@/components/documents/CaseDocumentsTab.jsx";
import PAAIReview from "@/components/priorauth/PAAIReview.jsx";
import PASubmission from "@/components/priorauth/PASubmission.jsx";
import PADenialAppeal from "@/components/priorauth/PADenialAppeal.jsx";
import { FileText, FolderOpen, Cpu, Send, AlertTriangle, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";

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

export default function PriorAuthCase() {
  const [activeTab, setActiveTab] = useState("intake");

  const params = new URLSearchParams(window.location.search);
  const caseId = params.get("id");
  const queryClient = useQueryClient();
  const { data: user } = useAuthUserQuery();
  const { data: paCase = null, isLoading: loadingCase } = useEntityDetailQuery(
    "PriorAuthCase",
    caseId,
    { enabled: Boolean(caseId) }
  );
  const { data: payerRules = [] } = useEntityListQuery("PayerRule", null, null, {
    enabled: Boolean(user),
  });

  const updateCase = async (updates) => {
    await api.entities.PriorAuthCase.update(caseId, updates);
    await queryClient.invalidateQueries({ queryKey: queryKeys.entity.detail("PriorAuthCase", caseId) });
  };

  if (loadingCase)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#eef3ff" }}
      >
        <div className="w-8 h-8 border-2 border-slate-200 border-t-[#293682] rounded-full animate-spin" />
      </div>
    );

  if (!paCase)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#eef3ff" }}
      >
        <p className="text-slate-500">Case not found.</p>
      </div>
    );

  const st = STATUS_STYLES[paCase.status] || STATUS_STYLES["New"];

  return (
    <StaffinglyLayout
      user={user}
      currentPage="prior-auth"
      title="Prior Authorization Case"
      breadcrumbs={["Prior Auth", paCase.case_id || paCase.id?.slice(-6)]}
      chatbotContext="case"
      chatbotContextData={paCase}
      chatbotPayerRules={payerRules}
    >
      <div className="max-w-[1200px] mx-auto space-y-4">
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
                  <h1 className="text-xl font-bold text-slate-800">
                    Case {paCase.case_id || paCase.id?.slice(-6)}
                  </h1>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: st.bg, color: st.text }}
                  >
                    {paCase.status}
                  </span>
                  {paCase.urgency === "Urgent" && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
                      URGENT
                    </span>
                  )}
                  {paCase.p2p_physician_name && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                      P2P Scheduled
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {paCase.patient_initials} · {paCase.payer_name} · {paCase.procedure_name}
                </p>
              </div>
            </div>
            {paCase.ai_confidence_score != null && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">AI Confidence</p>
                <p
                  className="text-3xl font-bold"
                  style={{ color: paCase.ai_confidence_score >= 75 ? "#16a34a" : "#d97706" }}
                >
                  {paCase.ai_confidence_score}%
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
        {activeTab === "intake" && <PACaseIntake paCase={paCase} onUpdate={updateCase} />}
        {activeTab === "documents" && <PADocumentsTab paCase={paCase} onUpdate={updateCase} />}
        {activeTab === "ai_review" && <PAAIReview paCase={paCase} onUpdate={updateCase} />}
        {activeTab === "submission" && <PASubmission paCase={paCase} onUpdate={updateCase} />}
        {activeTab === "denial" && <PADenialAppeal paCase={paCase} onUpdate={updateCase} />}
      </div>
    </StaffinglyLayout>
  );
}
