import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload } from "lucide-react";
import AppSelect from "@/components/ui/app-select";
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

function TextField({ label, value, onChange, type = "text", placeholder = "", prefix = null }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        {prefix ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {prefix}
          </span>
        ) : null}
        <input
          value={value}
          onChange={onChange}
          type={type}
          placeholder={placeholder}
          className={`h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none ${
            prefix ? "pl-7" : ""
          }`}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onValueChange, options, placeholder = "Select..." }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <AppSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder={placeholder}
        triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:ring-0 focus:border-slate-300"
      />
    </div>
  );
}

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

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = async () => {
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
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save insurance policy");
      setSaving(false);
    }
  };

  const handleOcrExtraction = (extractedData) => {
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
    <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.button
        type="button"
        aria-label="Close insurance drawer"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%", opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.9 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-gradient-to-br from-[#f7fbfb] via-white to-[#eef7f8] px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0a7e87]">
                Insurance Registry
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">
                {policy ? "Edit Insurance Policy" : "Add Insurance Policy"}
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Capture payer, subscriber, and benefit details for the selected patient in one place.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/60 px-6 py-6">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!policy ? (
            <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-5 shadow-sm">
              <button
                type="button"
                onClick={() => setShowCardCapture(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
              >
                <Upload className="h-5 w-5 text-slate-500" />
                Upload Insurance Card to Auto-Fill
              </button>
            </section>
          ) : null}

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Coverage Setup</h4>
              <p className="mt-1 text-xs text-slate-500">
                Define how this policy is classified and which payer is responsible.
              </p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Policy Type
                </label>
                <div className="flex gap-2">
                  {POLICY_TYPES.map((policyType) => (
                    <button
                      key={policyType.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, policyType: policyType.value }))}
                      className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition-all ${
                        form.policyType === policyType.value
                          ? "text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                      style={
                        form.policyType === policyType.value
                          ? { backgroundColor: "#0a7e87" }
                          : {}
                      }
                    >
                      {policyType.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Insurance Payer *"
                  value={form.payerName}
                  onValueChange={(value) => setForm((current) => ({ ...current, payerName: value }))}
                  options={PAYERS}
                  placeholder="Select payer..."
                />
                <TextField
                  label="Payer ID"
                  value={form.payerId}
                  onChange={updateField("payerId")}
                  placeholder="e.g., 87726"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Member Information</h4>
              <p className="mt-1 text-xs text-slate-500">
                Store the cardholder identifiers and group details used in eligibility workflows.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Member ID *"
                value={form.memberId}
                onChange={updateField("memberId")}
                placeholder="e.g., UHC-884720193"
              />
              <TextField
                label="Group Number"
                value={form.groupNumber}
                onChange={updateField("groupNumber")}
                placeholder="e.g., GRP-44821"
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Subscriber Details</h4>
              <p className="mt-1 text-xs text-slate-500">
                Record the subscriber demographics when they differ from the patient.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField
                label="Subscriber Name"
                value={form.subscriberName}
                onChange={updateField("subscriberName")}
                placeholder="Name on card"
              />
              <TextField
                label="Subscriber DOB"
                type="date"
                value={form.subscriberDob}
                onChange={updateField("subscriberDob")}
              />
              <SelectField
                label="Relationship"
                value={form.subscriberRelationship}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, subscriberRelationship: value }))
                }
                options={RELATIONSHIPS}
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Plan Details</h4>
              <p className="mt-1 text-xs text-slate-500">
                Capture plan labels, dates, and pharmacy information returned by the payer.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Plan Name"
                value={form.planName}
                onChange={updateField("planName")}
                placeholder="e.g., Choice Plus PPO"
              />
              <SelectField
                label="Plan Type"
                value={form.planType}
                onValueChange={(value) => setForm((current) => ({ ...current, planType: value }))}
                options={PLAN_TYPES}
                placeholder="Select type..."
              />
              <TextField
                label="Effective Date"
                type="date"
                value={form.effectiveDate}
                onChange={updateField("effectiveDate")}
              />
              <TextField
                label="Termination Date"
                type="date"
                value={form.terminationDate}
                onChange={updateField("terminationDate")}
              />
              <TextField
                label="Rx BIN"
                value={form.rxBin}
                onChange={updateField("rxBin")}
                placeholder="e.g., 610014"
              />
              <TextField
                label="Rx PCN"
                value={form.rxPcn}
                onChange={updateField("rxPcn")}
                placeholder="e.g., OHCARD"
              />
              <TextField
                label="Rx Group"
                value={form.rxGroup}
                onChange={updateField("rxGroup")}
                placeholder="e.g., OHRX"
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Benefit Amounts</h4>
              <p className="mt-1 text-xs text-slate-500">
                Track the common office-visit copays associated with this plan.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Copay (PCP)"
                type="number"
                value={form.copayPcp}
                onChange={updateField("copayPcp")}
                placeholder="0"
                prefix="$"
              />
              <TextField
                label="Copay (Specialist)"
                type="number"
                value={form.copaySpecialist}
                onChange={updateField("copaySpecialist")}
                placeholder="0"
                prefix="$"
              />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/10 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#0a7e87" }}
          >
            {saving ? "Saving..." : policy ? "Update Policy" : "Add Policy"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
