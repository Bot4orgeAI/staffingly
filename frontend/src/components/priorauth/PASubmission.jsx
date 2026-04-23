import { useState } from "react";
import { api } from "@/lib/api";
import { Send, CheckCircle, Globe, Phone, FileText, Loader2 } from "lucide-react";

const METHOD_ICONS = { "Payer Portal": Globe, CoverMyMeds: FileText, Fax: Send, Phone: Phone };
const METHODS = [
  {
    key: "Payer Portal",
    label: "Payer Portal",
    desc: "Submit via automated portal login (Puppeteer)",
  },
  {
    key: "CoverMyMeds",
    label: "CoverMyMeds",
    desc: "Route through CoverMyMeds (for supported payers)",
  },
  { key: "Fax", label: "Fax", desc: "Submit by fax to payer" },
  { key: "Phone", label: "Phone", desc: "Manual phone submission" },
];

export default function PASubmission({ paCase, onUpdate }) {
  const [method, setMethod] = useState(paCase.submission_method || "");
  const [confirmNumber, setConfirmNumber] = useState(paCase.confirmation_number || "");
  const [cmReference, setCmReference] = useState(paCase.covermymeds_reference || "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(!!paCase.confirmation_number);
  const [cmData, setCmData] = useState(null);
  const [loadingCm, setLoadingCm] = useState(false);

  const canSubmit =
    paCase.status === "Pending Supervisor Approval" || paCase.status === "Submitted";

  const handleFormatCM = async () => {
    setLoadingCm(true);
    const formatted = await api.integrations.Core.InvokeLLM({
      prompt: `Format this prior authorization case for CoverMyMeds submission. Return structured JSON with all required CoverMyMeds fields.

Case data:
- Patient Initials: ${paCase.patient_initials}, DOB: ${paCase.patient_dob}
- Insurance ID: ${paCase.insurance_id}, Payer: ${paCase.payer_name}
- Procedure: ${paCase.procedure_name}, CPT: ${paCase.cpt_code}, NDC: ${paCase.ndc_code || "N/A"}
- Diagnosis: ${(paCase.diagnosis_codes || []).join(", ")}
- Physician: ${paCase.ordering_physician_name} (NPI: ${paCase.ordering_physician_npi})
- Medication: ${paCase.medication_name || "N/A"}, Days Supply: ${paCase.days_supply || "N/A"}, Qty: ${paCase.quantity_requested || "N/A"}
- Pharmacy NPI: ${paCase.pharmacy_npi || "N/A"}, Step Therapy: ${paCase.step_therapy_confirmed ? "Yes" : "No"}
- Summary: ${paCase.medical_necessity_summary?.substring(0, 500) || "Not available"}`,
      response_json_schema: {
        type: "object",
        properties: {
          patient_name_initials: { type: "string" },
          dob: { type: "string" },
          member_id: { type: "string" },
          drug_name: { type: "string" },
          ndc: { type: "string" },
          days_supply: { type: "string" },
          quantity: { type: "string" },
          prescriber_npi: { type: "string" },
          pharmacy_npi: { type: "string" },
          diagnosis_codes: { type: "array", items: { type: "string" } },
          clinical_rationale: { type: "string" },
          step_therapy_note: { type: "string" },
          clinical_criteria_responses: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
        },
      },
    });
    setCmData(formatted);
    setLoadingCm(false);
  };

  const handleLogSubmission = async () => {
    setSubmitting(true);
    try {
      await api.priorAuth.runAction(paCase.id, "submit_to_cmm", {
        gatewayPatientId: paCase.gateway_patient_id || paCase.gatewayPatientId,
        procedureName: paCase.procedure_name,
        icd10: paCase.diagnosis_codes?.[0] || "",
        extractedDocumentText:
          cmData?.clinical_rationale ||
          paCase.medical_necessity_summary ||
          paCase.intake_notes ||
          "",
      });
      await onUpdate({
        submission_method: method,
        submission_timestamp: new Date().toISOString(),
        confirmation_number: confirmNumber,
        covermymeds_reference: cmReference,
        status: "Submitted",
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!canSubmit && paCase.status !== "Submitted") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#eef3ff" }}
        >
          <Send className="w-7 h-7" style={{ color: "#293682" }} />
        </div>
        <h3 className="font-bold text-slate-700">Supervisor Approval Required</h3>
        <p className="text-sm text-slate-400 mt-1">
          This case must be approved by a supervisor before submission.
        </p>
        <p
          className="text-xs font-semibold mt-3 px-3 py-1.5 rounded-full inline-block"
          style={{ backgroundColor: "#fff7ed", color: "#c2410c" }}
        >
          Status: {paCase.status}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {done && (
        <div className="rounded-xl p-4 flex items-center gap-3 border-2 border-emerald-300 bg-emerald-50">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">
              Submission Logged — {paCase.submission_method}
            </p>
            {paCase.confirmation_number && (
              <p className="text-xs text-emerald-700">Confirmation: {paCase.confirmation_number}</p>
            )}
          </div>
        </div>
      )}

      {/* Method Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4">Select Submission Method</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {METHODS.map((m) => {
            const Icon = METHOD_ICONS[m.key] || Send;
            return (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  method === m.key ? "border-[#293682]" : "border-slate-200 hover:border-slate-300"
                }`}
                style={method === m.key ? { backgroundColor: "#eef3ff" } : {}}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: method === m.key ? "#293682" : "#f1f5f9" }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: method === m.key ? "#fff" : "#64748b" }}
                  />
                </div>
                <div>
                  <p
                    className="font-bold text-sm"
                    style={{ color: method === m.key ? "#293682" : "#1e293b" }}
                  >
                    {m.label}
                  </p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CoverMyMeds Card */}
      {method === "CoverMyMeds" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800">CoverMyMeds Formatting</h4>
              <p className="text-xs text-slate-400">AI formats case data into CoverMyMeds fields</p>
            </div>
            <button
              onClick={handleFormatCM}
              disabled={loadingCm}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#293682" }}
            >
              {loadingCm ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {loadingCm ? "Formatting…" : cmData ? "Reformat" : "Format for CoverMyMeds"}
            </button>
          </div>
          {cmData && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {Object.entries(cmData)
                  .filter(([, val]) => !Array.isArray(val))
                  .map(([key, val]) => (
                    <div key={key} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 break-words">
                        {String(val)}
                      </p>
                    </div>
                  ))}
              </div>
              {cmData.clinical_criteria_responses?.map((cr, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-600 font-semibold">{cr.question}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{cr.answer}</p>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  CoverMyMeds Reference Number
                </label>
                <input
                  value={cmReference}
                  onChange={(e) => setCmReference(e.target.value)}
                  placeholder="CMM-XXXXXXXX"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Submission */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="font-bold text-slate-800 mb-4">Log Submission Details</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Confirmation Number
            </label>
            <input
              value={confirmNumber}
              onChange={(e) => setConfirmNumber(e.target.value)}
              placeholder="Payer confirmation number"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
            />
          </div>
          <button
            onClick={handleLogSubmission}
            disabled={!method || !confirmNumber || submitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#0a7e87" }}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {submitting ? "Logging…" : "Log Submission"}
          </button>
        </div>
      </div>
    </div>
  );
}
