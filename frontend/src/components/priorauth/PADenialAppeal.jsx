import { useState } from "react";
import { api } from "@/lib/api";
import { FileText, Loader2, Save, Users, Clock, CheckCircle, XCircle } from "lucide-react";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function PADenialAppeal({ paCase, onUpdate }) {
  const [denialForm, setDenialForm] = useState({
    denial_date: paCase.denial_date || "",
    denial_reason: paCase.denial_reason || "",
    denial_code: paCase.denial_code || "",
  });
  const [appealLetter, setAppealLetter] = useState(paCase.appeal_letter || "");
  const [p2pForm, setP2pForm] = useState({
    p2p_physician_name: paCase.p2p_physician_name || "",
    p2p_physician_npi: paCase.p2p_physician_npi || "",
    p2p_reviewer_name: paCase.p2p_reviewer_name || "",
    p2p_scheduled_at: paCase.p2p_scheduled_at || "",
    p2p_contact_number: paCase.p2p_contact_number || "",
    p2p_outcome: paCase.p2p_outcome || "",
  });
  const [generatingAppeal, setGeneratingAppeal] = useState(false);
  const [savingDenial, setSavingDenial] = useState(false);
  const [savingP2P, setSavingP2P] = useState(false);

  const appealDeadlineDays = daysUntil(paCase.appeal_deadline);
  const isDenied = paCase.status === "Denied" || paCase.status === "Appeal In Progress";

  const handleSaveDenial = async () => {
    setSavingDenial(true);
    // Calculate appeal deadline (default 30 days from denial)
    const deadline = denialForm.denial_date
      ? new Date(new Date(denialForm.denial_date).getTime() + 30 * 86400000)
          .toISOString()
          .split("T")[0]
      : "";
    await onUpdate({
      ...denialForm,
      appeal_deadline: deadline,
      status: "Denied",
    });
    setSavingDenial(false);
  };

  const handleGenerateAppeal = async () => {
    setGeneratingAppeal(true);
    const letter = await api.integrations.Core.InvokeLLM({
      prompt: `You are a senior prior authorization appeal specialist. Draft a formal, persuasive appeal letter for the following denied prior authorization case. The letter should be 4-6 paragraphs, use formal clinical and insurance language, cite medical necessity clearly, and request reconsideration.

Case Details:
- Patient Initials: ${paCase.patient_initials}
- Payer: ${paCase.payer_name}
- Procedure/Medication: ${paCase.procedure_name} (CPT: ${paCase.cpt_code || "N/A"})
- Diagnosis Codes: ${(paCase.diagnosis_codes || []).join(", ")}
- Ordering Physician: ${paCase.ordering_physician_name} (NPI: ${paCase.ordering_physician_npi})
- Denial Date: ${denialForm.denial_date || paCase.denial_date}
- Denial Reason: ${denialForm.denial_reason || paCase.denial_reason}
- Denial Code: ${denialForm.denial_code || paCase.denial_code}
- Original Medical Necessity Summary: ${paCase.medical_necessity_summary?.substring(0, 800) || "Not available"}

Write the full appeal letter text only, starting with "Dear Medical Director," — no preamble or explanation.`,
    });
    setAppealLetter(letter);
    await onUpdate({ appeal_letter: letter, status: "Appeal In Progress" });
    setGeneratingAppeal(false);
  };

  const handleSaveP2P = async () => {
    setSavingP2P(true);
    await onUpdate({
      ...p2pForm,
      status: p2pForm.p2p_outcome ? paCase.status : "Peer To Peer Requested",
    });
    setSavingP2P(false);
  };

  const alertColor =
    appealDeadlineDays <= 1
      ? "red"
      : appealDeadlineDays <= 3
        ? "orange"
        : appealDeadlineDays <= 7
          ? "amber"
          : "emerald";
  const alertColorMap = {
    red: { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },
    orange: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    amber: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    emerald: { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  };
  const ac = alertColorMap[alertColor];

  return (
    <div className="space-y-4">
      {/* Denial Entry */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-500" /> Denial Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Denial Date</label>
            <input
              type="date"
              value={denialForm.denial_date}
              onChange={(e) => setDenialForm((f) => ({ ...f, denial_date: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Denial Code</label>
            <input
              value={denialForm.denial_code}
              onChange={(e) => setDenialForm((f) => ({ ...f, denial_code: e.target.value }))}
              placeholder="e.g. CO-96"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Denial Reason</label>
            <textarea
              value={denialForm.denial_reason}
              rows={2}
              onChange={(e) => setDenialForm((f) => ({ ...f, denial_reason: e.target.value }))}
              placeholder="Reason as stated by payer…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
            />
          </div>
        </div>
        <button
          onClick={handleSaveDenial}
          disabled={savingDenial}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#dc2626" }}
        >
          {savingDenial ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savingDenial ? "Saving…" : "Save Denial"}
        </button>
      </div>

      {/* Appeal Deadline Alert */}
      {paCase.appeal_deadline && (
        <div
          className="rounded-xl p-4 flex items-center gap-3 border-2"
          style={{ backgroundColor: ac.bg, borderColor: ac.border }}
        >
          <Clock className="w-5 h-5 flex-shrink-0" style={{ color: ac.text }} />
          <div>
            <p className="font-bold text-sm" style={{ color: ac.text }}>
              Appeal Deadline: {new Date(paCase.appeal_deadline).toLocaleDateString()}
              {appealDeadlineDays !== null &&
                ` — ${appealDeadlineDays} day${appealDeadlineDays !== 1 ? "s" : ""} remaining`}
            </p>
            {appealDeadlineDays <= 7 && (
              <p className="text-xs" style={{ color: ac.text }}>
                Urgent: Appeal deadline approaching.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Appeal Letter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800">Appeal Letter</h3>
            <p className="text-xs text-slate-400">
              AI drafts a formal appeal — review and edit before submitting
            </p>
          </div>
          <button
            onClick={handleGenerateAppeal}
            disabled={generatingAppeal || !denialForm.denial_reason}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#6d28d9" }}
          >
            {generatingAppeal ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {generatingAppeal ? "Drafting…" : appealLetter ? "Re-Draft" : "Draft Appeal Letter"}
          </button>
        </div>
        <textarea
          value={appealLetter}
          onChange={(e) => setAppealLetter(e.target.value)}
          rows={12}
          placeholder="Enter denial reason above, then click 'Draft Appeal Letter' to generate…"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#293682]/30 leading-relaxed"
        />
        {appealLetter && (
          <button
            onClick={() =>
              onUpdate({
                appeal_letter: appealLetter,
                appeal_submitted_at: new Date().toISOString(),
                status: "Appeal In Progress",
              })
            }
            className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90"
            style={{ backgroundColor: "#ea580c" }}
          >
            <CheckCircle className="w-4 h-4" /> Mark Appeal Submitted
          </button>
        )}
      </div>

      {/* Peer to Peer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" /> Peer-to-Peer Review
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            ["Requesting Physician Name", "p2p_physician_name", "text", "Physician name"],
            ["Requesting Physician NPI", "p2p_physician_npi", "text", "10-digit NPI"],
            ["Payer Clinical Reviewer", "p2p_reviewer_name", "text", "Reviewer name"],
            ["Scheduled Date & Time", "p2p_scheduled_at", "datetime-local", ""],
            ["Contact Number", "p2p_contact_number", "tel", "Phone number"],
          ].map(([label, key, type, placeholder]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
              <input
                type={type}
                value={p2pForm[key]}
                placeholder={placeholder}
                onChange={(e) => setP2pForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">P2P Outcome</label>
            <select
              value={p2pForm.p2p_outcome}
              onChange={(e) => setP2pForm((f) => ({ ...f, p2p_outcome: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"
            >
              <option value="">— Not yet completed —</option>
              <option>Approved</option>
              <option>Denied</option>
              <option>Pending Further Review</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveP2P}
          disabled={savingP2P}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#3730a3" }}
        >
          {savingP2P ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          {savingP2P ? "Saving…" : "Save P2P Details"}
        </button>
      </div>
    </div>
  );
}
