import { useState } from "react";
import { api } from "@/lib/api";
import { Cpu, CheckCircle, XCircle, AlertTriangle, Loader2, Send, Edit3 } from "lucide-react";

function unwrapGatewayPayload(response) {
  const payload = response?.data?.gatewayResponse || response?.gatewayResponse || response || {};

  if (Array.isArray(payload)) {
    return payload[0] || {};
  }

  return payload;
}

function normalizeAiReviewResponse(response) {
  const payload = unwrapGatewayPayload(response);
  return {
    checklist_items: payload.checklist_items || payload.checklistItems || null,
    missing_items: payload.missing_items || payload.missingItems || null,
    confidence_score: payload.confidence_score || payload.confidenceScore || null,
    medical_necessity_summary:
      payload.medical_necessity_summary || payload.medicalNecessitySummary || null,
  };
}

export default function PAAIReview({ paCase, onUpdate }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(() => {
    if (!paCase.ai_review_result_json) return null;
    try {
      return normalizeAiReviewResponse(JSON.parse(paCase.ai_review_result_json));
    } catch {
      return null;
    }
  });
  const [summary, setSummary] = useState(paCase.medical_necessity_summary || "");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleRunAI = async () => {
    setRunning(true);
    try {
      const gatewayResponse = await api.priorAuth.runAction(paCase.id, "run_ai_review", {
        gatewayPatientId: paCase.gateway_patient_id || paCase.gatewayPatientId,
        procedureName: paCase.procedure_name,
        icd10: paCase.diagnosis_codes?.[0] || "",
        extractedDocumentText: paCase.intake_notes || "",
      });
      const gatewayResult = normalizeAiReviewResponse(gatewayResponse);
      if (
        !gatewayResult.checklist_items ||
        gatewayResult.confidence_score == null ||
        !gatewayResult.medical_necessity_summary
      ) {
        throw new Error("The n8n prior auth review workflow returned an incomplete response.");
      }

      setResult(gatewayResult);
      setSummary(gatewayResult.medical_necessity_summary || "");
      await onUpdate({
        ai_review_result_json: JSON.stringify(gatewayResult),
        ai_confidence_score: gatewayResult.confidence_score,
        medical_necessity_summary: gatewayResult.medical_necessity_summary,
        status: "Awaiting AI Review",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitForApproval = async () => {
    const anyFlagged = result?.checklist_items?.some((i) => i.status === "flagged");
    if (anyFlagged) return;
    setSubmitting(true);
    await onUpdate({
      status: "Pending Supervisor Approval",
      medical_necessity_summary: summary,
    });
    setSaved(true);
    setSubmitting(false);
  };

  const statusConfig = {
    passed: { icon: CheckCircle, color: "#16a34a", bg: "#f0fdf4", label: "Passed" },
    flagged: { icon: XCircle, color: "#dc2626", bg: "#fef2f2", label: "Flagged" },
    attention: { icon: AlertTriangle, color: "#d97706", bg: "#fffbeb", label: "Needs Attention" },
  };

  const anyFlagged = result?.checklist_items?.some((i) => i.status === "flagged");

  return (
    <div className="space-y-4">
      {/* Run AI Button */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800">AI Review Module</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gemini reviews the full case package and drafts a medical necessity summary.
          </p>
        </div>
        <button
          onClick={handleRunAI}
          disabled={running}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: "#6d28d9" }}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
          {running ? "Analyzing Case…" : result ? "Re-Run AI Review" : "Review with AI"}
        </button>
      </div>

      {/* AI Results */}
      {result && (
        <>
          {/* Confidence */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-6">
            <div>
              <h4 className="font-bold text-slate-700 text-sm">AI Approval Likelihood</h4>
              <p className="text-xs text-slate-400">
                Based on clinical documentation and payer patterns
              </p>
            </div>
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={
                    result.confidence_score >= 75
                      ? "#16a34a"
                      : result.confidence_score >= 50
                        ? "#f59e0b"
                        : "#dc2626"
                  }
                  strokeWidth="3"
                  strokeDasharray={`${result.confidence_score} ${100 - result.confidence_score}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-800">{result.confidence_score}%</span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-700 text-sm">Document & Criteria Checklist</h4>
            </div>
            <div className="divide-y divide-slate-50">
              {(result.checklist_items || []).map((item, i) => {
                const cfg = statusConfig[item.status] || statusConfig.attention;
                const Icon = cfg.icon;
                return (
                  <div
                    key={i}
                    className="p-4 flex items-start gap-3"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{item.item}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missing Items */}
          {result.missing_items?.length > 0 && (
            <div className="rounded-xl p-4 border-2 border-red-300 bg-red-50 space-y-2">
              <p className="font-bold text-red-700 text-sm">Missing Items</p>
              {result.missing_items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Medical Necessity Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Edit3 className="w-4 h-4 text-slate-500" />
              <h4 className="font-bold text-slate-700 text-sm">
                Medical Necessity Summary (AI Drafted — Editable)
              </h4>
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#293682]/30 leading-relaxed"
            />
          </div>

          {/* Submission Gate */}
          {anyFlagged && (
            <div className="rounded-xl p-4 flex items-center gap-3 border-2 border-red-300 bg-red-50">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 font-semibold">
                Submission is blocked — resolve all flagged items before proceeding.
              </p>
            </div>
          )}

          <button
            onClick={handleSubmitForApproval}
            disabled={anyFlagged || submitting || saved}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: saved ? "#16a34a" : "#f97316" }}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {saved ? "Sent to Supervisor Approval!" : "Submit for Supervisor Approval"}
          </button>
        </>
      )}
    </div>
  );
}
