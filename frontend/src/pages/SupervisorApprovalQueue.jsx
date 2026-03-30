import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { CheckCircle, ChevronRight, Loader2, MessageSquare, ArrowUp } from "lucide-react";

export default function SupervisorApprovalQueue() {
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState({});
  const [feedbackMap, setFeedbackMap] = useState({});
  const [showFeedback, setShowFeedback] = useState({});

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => api.auth.redirectToLogin());
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    const data = await api.entities.PriorAuthCase.filter({
      status: "Pending Supervisor Approval",
    });
    const sorted = data.sort((a, b) => {
      if (a.urgency === "Urgent" && b.urgency !== "Urgent") return -1;
      if (b.urgency === "Urgent" && a.urgency !== "Urgent") return 1;
      return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
    });
    setCases(sorted);
    setLoading(false);
  };

  const handleApprove = async (c) => {
    setActionState((s) => ({ ...s, [c.id]: "approving" }));
    await api.entities.PriorAuthCase.update(c.id, {
      status: "Submitted",
      supervisor_approved_by: user?.full_name || user?.email,
      supervisor_approved_at: new Date().toISOString(),
    });
    setCases((prev) => prev.filter((x) => x.id !== c.id));
    setActionState((s) => ({ ...s, [c.id]: "done" }));
  };

  const handleSendBack = async (c) => {
    const notes = feedbackMap[c.id];
    if (!notes) {
      setShowFeedback((s) => ({ ...s, [c.id]: true }));
      return;
    }
    setActionState((s) => ({ ...s, [c.id]: "sending" }));
    await api.entities.PriorAuthCase.update(c.id, {
      status: "In Progress",
      supervisor_notes: notes,
    });
    setCases((prev) => prev.filter((x) => x.id !== c.id));
    setActionState((s) => ({ ...s, [c.id]: "done" }));
  };

  const handleEscalate = async (c) => {
    setActionState((s) => ({ ...s, [c.id]: "escalating" }));
    await api.entities.PriorAuthCase.update(c.id, { status: "Peer To Peer Requested" });
    setCases((prev) => prev.filter((x) => x.id !== c.id));
    setActionState((s) => ({ ...s, [c.id]: "done" }));
  };

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#eef3ff" }}
      >
        <div className="w-8 h-8 border-2 border-slate-200 border-t-[#293682] rounded-full animate-spin" />
      </div>
    );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="prior-auth"
      title="Supervisor Approval Queue"
      breadcrumbs={["Prior Auth", "Approval Queue"]}
    >
      <div className="max-w-[1000px] mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Pending Supervisor Approval</h2>
            <p className="text-sm text-slate-400">
              {cases.length} case{cases.length !== 1 ? "s" : ""} awaiting review · sorted by urgency
              then age
            </p>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-bold text-slate-700">All clear — no cases pending approval.</p>
          </div>
        ) : (
          cases.map((c) => {
            const daysPending = c.created_date
              ? Math.floor((Date.now() - new Date(c.created_date).getTime()) / 86400000)
              : 0;
            const state = actionState[c.id];

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="p-5 flex flex-wrap items-start gap-4 justify-between border-b border-slate-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-700 text-sm">
                        {c.case_id || c.id?.slice(-6)}
                      </span>
                      {c.urgency === "Urgent" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
                          URGENT
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{daysPending}d pending</span>
                    </div>
                    <p className="font-semibold text-slate-800 mt-1">
                      {c.patient_initials} · {c.payer_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {c.procedure_name} · Assigned: {c.assigned_specialist_name || "—"}
                    </p>
                  </div>
                  {c.ai_confidence_score != null && (
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                        AI Score
                      </p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: c.ai_confidence_score >= 75 ? "#16a34a" : "#d97706" }}
                      >
                        {c.ai_confidence_score}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Checklist Summary */}
                {c.ai_review_result_json &&
                  (() => {
                    try {
                      const r = JSON.parse(c.ai_review_result_json);
                      const passed =
                        r.checklist_items?.filter((i) => i.status === "passed").length || 0;
                      const total = r.checklist_items?.length || 0;
                      return (
                        <div className="px-5 py-3 bg-slate-50 text-xs text-slate-600 flex items-center gap-4 border-b border-slate-100">
                          <span className="text-emerald-600 font-semibold">
                            {passed}/{total} items passed
                          </span>
                          {r.missing_items?.length > 0 && (
                            <span className="text-red-500">{r.missing_items.length} missing</span>
                          )}
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}

                {/* Feedback Input */}
                {showFeedback[c.id] && (
                  <div className="px-5 py-4 border-b border-slate-100">
                    <textarea
                      rows={2}
                      placeholder="Enter feedback for specialist…"
                      value={feedbackMap[c.id] || ""}
                      onChange={(e) => setFeedbackMap((m) => ({ ...m, [c.id]: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                  <Link to={createPageUrl(`PriorAuthCase?id=${c.id}`)}>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                      View Case <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleApprove(c)}
                    disabled={state === "approving"}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: "#16a34a" }}
                  >
                    {state === "approving" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleSendBack(c)}
                    disabled={state === "sending"}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: "#d97706" }}
                  >
                    {state === "sending" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                    Send Back
                  </button>
                  <button
                    onClick={() => handleEscalate(c)}
                    disabled={state === "escalating"}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: "#6366f1" }}
                  >
                    {state === "escalating" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5" />
                    )}
                    Escalate
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </StaffinglyLayout>
  );
}
