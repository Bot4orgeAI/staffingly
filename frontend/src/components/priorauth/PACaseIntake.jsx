import { useState } from "react";
import { api } from "@/lib/api";
import { Save, Plus, X, Loader2 } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const URGENCY_OPTIONS = ["Routine", "Urgent"];

export default function PACaseIntake({ paCase, onUpdate }) {
  const [form, setForm] = useState({
    procedure_name: paCase.procedure_name || "",
    cpt_code: paCase.cpt_code || "",
    ndc_code: paCase.ndc_code || "",
    diagnosis_codes: paCase.diagnosis_codes || [],
    urgency: paCase.urgency || "Routine",
    ordering_physician_name: paCase.ordering_physician_name || "",
    ordering_physician_npi: paCase.ordering_physician_npi || "",
    facility_name: paCase.facility_name || "",
    facility_npi: paCase.facility_npi || "",
    intake_notes: paCase.intake_notes || "",
    is_medication_pa: paCase.is_medication_pa || false,
    medication_name: paCase.medication_name || "",
    days_supply: paCase.days_supply || "",
    quantity_requested: paCase.quantity_requested || "",
    pharmacy_npi: paCase.pharmacy_npi || "",
    step_therapy_confirmed: paCase.step_therapy_confirmed || false,
  });
  const [diagInput, setDiagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addDiag = () => {
    if (diagInput.trim()) {
      setForm((f) => ({
        ...f,
        diagnosis_codes: [...f.diagnosis_codes, diagInput.trim().toUpperCase()],
      }));
      setDiagInput("");
    }
  };

  const removeDiag = (idx) => {
    setForm((f) => ({ ...f, diagnosis_codes: f.diagnosis_codes.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ ...form, status: paCase.status === "New" ? "In Progress" : paCase.status });
      await api.priorAuth.runAction(paCase.id, "save_intake", {
        gatewayPatientId: paCase.gateway_patient_id || paCase.gatewayPatientId,
        procedureName: form.procedure_name,
        icd10: form.diagnosis_codes[0] || "",
        extractedDocumentText: form.intake_notes || "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children, className = "" }) => (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );

  const inputCls =
    "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30";

  return (
    <div className="space-y-4">
      {/* Pre-populated from eligibility */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-700 text-sm mb-1">
          Patient & Insurance (from Eligibility)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Pre-populated from eligibility check — read only.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {[
            ["Patient Initials", paCase.patient_initials],
            ["Date of Birth", paCase.patient_dob],
            ["Insurance ID", paCase.insurance_id],
            ["Payer", paCase.payer_name],
            ["Plan Type", paCase.plan_type],
            ["Group Number", paCase.group_number],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                {label}
              </p>
              <p className="font-semibold text-slate-700">{val || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-700 text-sm mb-4">Clinical Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Procedure Name *">
            <input
              value={form.procedure_name}
              onChange={(e) => setForm((f) => ({ ...f, procedure_name: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="CPT Code">
            <input
              value={form.cpt_code}
              onChange={(e) => setForm((f) => ({ ...f, cpt_code: e.target.value }))}
              placeholder="e.g. 72148"
              className={inputCls}
            />
          </Field>
          <Field label="NDC Code (if medication)">
            <input
              value={form.ndc_code}
              onChange={(e) => setForm((f) => ({ ...f, ndc_code: e.target.value }))}
              placeholder="e.g. 00310-0751-10"
              className={inputCls}
            />
          </Field>
            <AppSelect
              value={form.urgency}
              onValueChange={(v) => setForm((f) => ({ ...f, urgency: v }))}
              options={URGENCY_OPTIONS}
            />

          {/* Diagnosis Codes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Diagnosis Codes (ICD-10)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={diagInput}
                onChange={(e) => setDiagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDiag()}
                placeholder="e.g. M54.5 — press Enter"
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
              />
              <button
                onClick={addDiag}
                className="px-3 py-2.5 rounded-xl text-white text-sm font-bold"
                style={{ backgroundColor: "#293682" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.diagnosis_codes.map((code, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700"
                >
                  {code}
                  <button onClick={() => removeDiag(i)}>
                    <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Physician & Facility */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-700 text-sm mb-4">Ordering Physician & Facility</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ordering Physician Name *">
            <input
              value={form.ordering_physician_name}
              onChange={(e) => setForm((f) => ({ ...f, ordering_physician_name: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Ordering Physician NPI *">
            <input
              value={form.ordering_physician_npi}
              onChange={(e) => setForm((f) => ({ ...f, ordering_physician_npi: e.target.value }))}
              placeholder="10-digit NPI"
              className={inputCls}
            />
          </Field>
          <Field label="Facility Name">
            <input
              value={form.facility_name}
              onChange={(e) => setForm((f) => ({ ...f, facility_name: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Facility NPI">
            <input
              value={form.facility_npi}
              onChange={(e) => setForm((f) => ({ ...f, facility_npi: e.target.value }))}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Medication PA Fields */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="is_med"
            checked={form.is_medication_pa}
            onChange={(e) => setForm((f) => ({ ...f, is_medication_pa: e.target.checked }))}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="is_med" className="font-bold text-slate-700 text-sm">
            This is a Medication Prior Authorization
          </label>
        </div>
        {form.is_medication_pa && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Medication Name">
              <input
                value={form.medication_name}
                onChange={(e) => setForm((f) => ({ ...f, medication_name: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="Days Supply">
              <input
                type="number"
                value={form.days_supply}
                onChange={(e) => setForm((f) => ({ ...f, days_supply: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="Quantity Requested">
              <input
                type="number"
                value={form.quantity_requested}
                onChange={(e) => setForm((f) => ({ ...f, quantity_requested: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="Pharmacy NPI">
              <input
                value={form.pharmacy_npi}
                onChange={(e) => setForm((f) => ({ ...f, pharmacy_npi: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="step_therapy"
                checked={form.step_therapy_confirmed}
                onChange={(e) =>
                  setForm((f) => ({ ...f, step_therapy_confirmed: e.target.checked }))
                }
                className="w-4 h-4 rounded"
              />
              <label htmlFor="step_therapy" className="text-sm text-slate-700">
                Step therapy documentation confirmed
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Intake Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <Field label="Intake Notes">
          <textarea
            value={form.intake_notes}
            onChange={(e) => setForm((f) => ({ ...f, intake_notes: e.target.value }))}
            rows={4}
            className={inputCls}
            placeholder="Additional notes, context, or special instructions…"
          />
        </Field>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: saved ? "#16a34a" : "#293682" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving…" : saved ? "Saved!" : "Save Case"}
      </button>
    </div>
  );
}
