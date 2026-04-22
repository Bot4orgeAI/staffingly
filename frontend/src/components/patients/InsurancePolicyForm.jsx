import { useState } from "react";
import { X, Upload } from "lucide-react";
import InsuranceCardCapture from "./InsuranceCardCapture";

const PAYERS = [
  "UnitedHealthcare",
  "Aetna",
  "Cigna",
  "Humana",
  "Blue Cross Blue Shield",
  "Kaiser Permanente",
  "Anthem",
  "Medicare",
  "Medicaid",
  "Tricare",
  "Molina Healthcare",
  "Centene",
  "Oscar Health",
  "Other",
];

const PLAN_TYPES = [
  "PPO",
  "HMO",
  "EPO",
  "POS",
  "HDHP",
  "Medicare",
  "Medicare Advantage",
  "Medicare Supplement",
  "Medicaid",
  "Medicaid Managed Care",
  "Other",
];

const POLICY_TYPES = [
  { value: "PRIMARY", label: "Primary" },
  { value: "SECONDARY", label: "Secondary" },
  { value: "TERTIARY", label: "Tertiary" },
];

const RELATIONSHIPS = ["Self", "Spouse", "Child", "Other Dependent"];

function FormInput({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white";
const ringStyle = { "--tw-ring-color": "#293682" };

export default function InsurancePolicyForm({
  policy,
  patientId,
  clientId,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    policyType: policy?.policyType || "PRIMARY",
    payerName: policy?.payerName || "",
    payerId: policy?.payerId || "",
    memberId: policy?.memberId || "",
    groupNumber: policy?.groupNumber || "",
    subscriberName: policy?.subscriberName || "",
    subscriberDob: policy?.subscriberDob ? policy.subscriberDob.split("T")[0] : "",
    subscriberRelationship: policy?.subscriberRelationship || "Self",
    planName: policy?.planName || "",
    planType: policy?.planType || "",
    effectiveDate: policy?.effectiveDate ? policy.effectiveDate.split("T")[0] : "",
    terminationDate: policy?.terminationDate ? policy.terminationDate.split("T")[0] : "",
    rxBin: policy?.rxBin || "",
    rxPcn: policy?.rxPcn || "",
    rxGroup: policy?.rxGroup || "",
    copayPcp: policy?.copayPcp || "",
    copaySpecialist: policy?.copaySpecialist || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showCardCapture, setShowCardCapture] = useState(false);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    // Validate required fields
    if (!form.payerName.trim() || !form.memberId.trim()) {
      setError("Payer name and member ID are required");
      return;
    }

    if (!clientId) {
      setError("A valid client must be selected before saving insurance");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        ...form,
        copayPcp: form.copayPcp ? parseFloat(form.copayPcp) : null,
        copaySpecialist: form.copaySpecialist ? parseFloat(form.copaySpecialist) : null,
      });
    } catch (err) {
      setError(err.message || "Failed to save insurance policy");
      setSaving(false);
    }
  };

  const handleOcrExtraction = (extractedData) => {
    // Pre-fill form with extracted data
    setForm((prev) => ({
      ...prev,
      payerName: extractedData.payerName || prev.payerName,
      memberId: extractedData.memberId || prev.memberId,
      groupNumber: extractedData.groupNumber || prev.groupNumber,
      subscriberName: extractedData.subscriberName || prev.subscriberName,
      subscriberDob: extractedData.subscriberDob || prev.subscriberDob,
      planName: extractedData.planName || prev.planName,
      planType: extractedData.planType || prev.planType,
      rxBin: extractedData.rxBin || prev.rxBin,
      rxPcn: extractedData.rxPcn || prev.rxPcn,
      rxGroup: extractedData.rxGroup || prev.rxGroup,
      effectiveDate: extractedData.effectiveDate || prev.effectiveDate,
    }));
    setShowCardCapture(false);
  };

  if (showCardCapture) {
    return (
      <InsuranceCardCapture
        clientId={clientId}
        patientId={patientId}
        onExtracted={handleOcrExtraction}
        onClose={() => setShowCardCapture(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {policy ? "Edit Insurance Policy" : "Add Insurance Policy"}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Upload Card Button */}
          {!policy && (
            <button
              type="button"
              onClick={() => setShowCardCapture(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Upload className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-semibold text-slate-600">
                Upload Insurance Card to Auto-Fill
              </span>
            </button>
          )}

          {/* Policy Type */}
          <FormInput label="Policy Type" required>
            <div className="flex gap-2">
              {POLICY_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => update("policyType", pt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    form.policyType === pt.value
                      ? "text-white"
                      : "text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                  style={
                    form.policyType === pt.value ? { backgroundColor: "#293682" } : {}
                  }
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </FormInput>

          {/* Payer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Insurance Payer" required>
              <select
                className={inputClass}
                style={ringStyle}
                value={form.payerName}
                onChange={(e) => update("payerName", e.target.value)}
              >
                <option value="">Select payer...</option>
                {PAYERS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </FormInput>
            <FormInput label="Payer ID">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.payerId}
                onChange={(e) => update("payerId", e.target.value)}
                placeholder="e.g., 87726"
              />
            </FormInput>
          </div>

          {/* Member Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Member ID" required>
              <input
                className={inputClass}
                style={ringStyle}
                value={form.memberId}
                onChange={(e) => update("memberId", e.target.value)}
                placeholder="e.g., UHC-884720193"
              />
            </FormInput>
            <FormInput label="Group Number">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.groupNumber}
                onChange={(e) => update("groupNumber", e.target.value)}
                placeholder="e.g., GRP-44821"
              />
            </FormInput>
          </div>

          {/* Subscriber Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Subscriber Name">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.subscriberName}
                onChange={(e) => update("subscriberName", e.target.value)}
                placeholder="Name on card"
              />
            </FormInput>
            <FormInput label="Subscriber DOB">
              <input
                type="date"
                className={inputClass}
                style={ringStyle}
                value={form.subscriberDob}
                onChange={(e) => update("subscriberDob", e.target.value)}
              />
            </FormInput>
            <FormInput label="Relationship">
              <select
                className={inputClass}
                style={ringStyle}
                value={form.subscriberRelationship}
                onChange={(e) => update("subscriberRelationship", e.target.value)}
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </FormInput>
          </div>

          {/* Plan Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Plan Name">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.planName}
                onChange={(e) => update("planName", e.target.value)}
                placeholder="e.g., Choice Plus PPO"
              />
            </FormInput>
            <FormInput label="Plan Type">
              <select
                className={inputClass}
                style={ringStyle}
                value={form.planType}
                onChange={(e) => update("planType", e.target.value)}
              >
                <option value="">Select type...</option>
                {PLAN_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </FormInput>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Effective Date">
              <input
                type="date"
                className={inputClass}
                style={ringStyle}
                value={form.effectiveDate}
                onChange={(e) => update("effectiveDate", e.target.value)}
              />
            </FormInput>
            <FormInput label="Termination Date">
              <input
                type="date"
                className={inputClass}
                style={ringStyle}
                value={form.terminationDate}
                onChange={(e) => update("terminationDate", e.target.value)}
              />
            </FormInput>
          </div>

          {/* Rx Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Rx BIN">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.rxBin}
                onChange={(e) => update("rxBin", e.target.value)}
                placeholder="e.g., 610014"
              />
            </FormInput>
            <FormInput label="Rx PCN">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.rxPcn}
                onChange={(e) => update("rxPcn", e.target.value)}
                placeholder="e.g., OHCARD"
              />
            </FormInput>
            <FormInput label="Rx Group">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.rxGroup}
                onChange={(e) => update("rxGroup", e.target.value)}
                placeholder="e.g., OHRX"
              />
            </FormInput>
          </div>

          {/* Copays */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Copay (PCP)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  className={`${inputClass} pl-7`}
                  style={ringStyle}
                  value={form.copayPcp}
                  onChange={(e) => update("copayPcp", e.target.value)}
                  placeholder="0"
                />
              </div>
            </FormInput>
            <FormInput label="Copay (Specialist)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  className={`${inputClass} pl-7`}
                  style={ringStyle}
                  value={form.copaySpecialist}
                  onChange={(e) => update("copaySpecialist", e.target.value)}
                  placeholder="0"
                />
              </div>
            </FormInput>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: "#293682" }}
          >
            {saving ? "Saving..." : policy ? "Update Policy" : "Add Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}
