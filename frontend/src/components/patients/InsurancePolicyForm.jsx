import { useState } from "react";
import { useEntityListQuery } from "@/lib/query";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, FileImage, Upload, X } from "lucide-react";
import AppSelect from "@/components/ui/app-select";
import InsuranceCardCapture from "./InsuranceCardCapture";
import { getPatientEvDraft, savePatientEvDraft } from "@/lib/utils/workflow";

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

function normalizeSelectValue(value, options) {
  if (!value) return "";

  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? option : option.value
  );
  const matched = normalizedOptions.find(
    (option) => option.toLowerCase() === String(value).toLowerCase()
  );

  return matched || value;
}

function withCurrentOption(options, value) {
  if (!value) return options;
  return options.includes(value) ? options : [...options, value];
}

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
  patient,
  patientId,
  clientId,
  onClose,
  onSave,
}) {
  const { data: payerRules = [] } = useEntityListQuery("PayerRule", { limit: 100 }, null);
  const knownPayerNames = [...new Set(payerRules.map((rule) => rule.payerName).filter(Boolean))];
  const initialCustomPayerName =
    policy?.payerName && !knownPayerNames.includes(policy.payerName) ? policy.payerName : "";
  const evDraft = getPatientEvDraft(patientId);
  const [form, setForm] = useState({
    policyType: policy?.policyType || "PRIMARY",
    payerName: initialCustomPayerName ? "Other" : policy?.payerName || "",
    customPayerName: initialCustomPayerName,
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
    providerNpi: evDraft.provider_npi || "",
    serviceDate: evDraft.service_date || new Date().toISOString().split("T")[0],
    serviceType: evDraft.service_type || "",
    cptCode: evDraft.cpt_code || "",
    facilityName: evDraft.facility_name || "",
    notes: evDraft.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showCardCapture, setShowCardCapture] = useState(false);
  const [captureReview, setCaptureReview] = useState(null);
  const resolvedPayerName =
    form.payerName === "Other" ? form.customPayerName.trim() : form.payerName.trim();
  const payerOptions = withCurrentOption([
    ...new Set(knownPayerNames.concat("Other")),
  ], form.payerName);
  const planTypeOptions = withCurrentOption(PLAN_TYPES, form.planType);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = async () => {
    if (!resolvedPayerName || !form.memberId.trim()) {
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
      savePatientEvDraft(patientId, {
        provider_npi: form.providerNpi,
        service_date: form.serviceDate,
        service_type: form.serviceType,
        cpt_code: form.cptCode,
        facility_name: form.facilityName,
        notes: form.notes,
      });

      await onSave({
        ...form,
        payerName: resolvedPayerName,
        copayPcp: form.copayPcp ? parseFloat(form.copayPcp) : null,
        copaySpecialist: form.copaySpecialist ? parseFloat(form.copaySpecialist) : null,
        insuranceCardCapture: captureReview,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save insurance policy");
      setSaving(false);
    }
  };

  const handleOcrExtraction = (captureResult) => {
    const extractedData = captureResult?.fields || {};
    setForm((prev) => ({
      ...prev,
      payerName: normalizeSelectValue(extractedData.payerName, payerOptions) || prev.payerName,
      payerId: extractedData.payerId || prev.payerId,
      memberId: extractedData.memberId || prev.memberId,
      groupNumber: extractedData.groupNumber || prev.groupNumber,
      subscriberName: extractedData.subscriberName || prev.subscriberName,
      subscriberDob: extractedData.subscriberDob || prev.subscriberDob,
      planName: extractedData.planName || prev.planName,
      planType: normalizeSelectValue(extractedData.planType, PLAN_TYPES) || prev.planType,
      rxBin: extractedData.rxBin || prev.rxBin,
      rxPcn: extractedData.rxPcn || prev.rxPcn,
      rxGroup: extractedData.rxGroup || prev.rxGroup,
      copayPcp: extractedData.copay
        ? extractedData.copay.replace(/[^0-9.]/g, "") || prev.copayPcp
        : prev.copayPcp,
      effectiveDate: extractedData.effectiveDate || prev.effectiveDate,
    }));
    setCaptureReview(captureResult);
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
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
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
                Capture payer, subscriber, and benefit details for the selected patient in one
                place.
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

          <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowCardCapture(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
            >
              <Upload className="h-5 w-5 text-slate-500" />
              {captureReview ? "Replace Insurance Card Scan" : "Upload Insurance Card to Auto-Fill"}
            </button>

            {captureReview ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 ${
                  captureReview.requiresReview
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {captureReview.requiresReview ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        captureReview.requiresReview ? "text-amber-800" : "text-emerald-800"
                      }`}
                    >
                      {captureReview.scannedSides?.length
                        ? `${captureReview.scannedSides.length} card side${
                            captureReview.scannedSides.length === 1 ? "" : "s"
                          } captured`
                        : "Insurance card captured"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      OCR confidence {captureReview.overallConfidence ?? "--"}%
                      {captureReview.lowConfidenceFields?.length
                        ? ` • Review ${captureReview.lowConfidenceFields.length} highlighted field(s) before saving`
                        : " • Ready to attach to this policy"}
                    </p>
                    {captureReview.scannedSides?.length ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Saved sides: {captureReview.scannedSides.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {captureReview?.uploads && captureReview.scannedSides?.length ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {captureReview.scannedSides.map((side) => {
                  const upload = captureReview.uploads?.[side];
                  const title = side === "FRONT" ? "Front of card" : "Back of card";

                  return (
                    <div
                      key={side}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {title}
                        </p>
                        {upload?.originalFileName ? (
                          <span className="truncate text-[11px] text-slate-400">
                            {upload.originalFileName}
                          </span>
                        ) : null}
                      </div>

                      {upload?.preview && upload.preview !== "pdf" ? (
                        <img
                          src={upload.preview}
                          alt={title}
                          className="h-40 w-full object-contain bg-slate-50"
                        />
                      ) : (
                        <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
                          <FileImage className="h-8 w-8 text-slate-300" />
                          <p className="text-xs text-slate-500">
                            {upload?.originalFileName || "No preview available"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          {patient ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3">
                <h4 className="text-sm font-bold text-slate-800">Patient Details</h4>
                <p className="mt-1 text-xs text-slate-500">
                  This insurance policy will be attached to the patient below.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Patient Name
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {patient.firstName} {patient.middleName ? `${patient.middleName} ` : ""}
                    {patient.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Date of Birth
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {patient.dob ? new Date(patient.dob).toLocaleDateString() : "Not available"}
                  </p>
                </div>
                {patient.email ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Email
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{patient.email}</p>
                  </div>
                ) : null}
                {patient.phone ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Phone
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{patient.phone}</p>
                  </div>
                ) : null}
              </div>
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
                      onClick={() =>
                        setForm((current) => ({ ...current, policyType: policyType.value }))
                      }
                      className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition-all ${
                        form.policyType === policyType.value
                          ? "text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                      style={
                        form.policyType === policyType.value ? { backgroundColor: "#0a7e87" } : {}
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
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      payerName: value,
                      customPayerName:
                        value === "Other"
                          ? current.customPayerName
                          : value !== current.customPayerName
                            ? current.customPayerName
                            : "",
                    }))
                  }
                  options={payerOptions}
                  placeholder="Select payer..."
                />
                <TextField
                  label="Payer ID"
                  value={form.payerId}
                  onChange={updateField("payerId")}
                  placeholder="e.g., 87726"
                />
                {form.payerName === "Other" ? (
                  <TextField
                    label="Other Payer Name *"
                    value={form.customPayerName}
                    onChange={updateField("customPayerName")}
                    placeholder="Enter payer name"
                  />
                ) : null}
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
                options={planTypeOptions}
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

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">EV Visit Details</h4>
              <p className="mt-1 text-xs text-slate-500">
                Keep the same visit details available when launching eligibility verification from
                the Patients workflow.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Provider NPI"
                value={form.providerNpi}
                onChange={updateField("providerNpi")}
                placeholder="10-digit NPI"
              />
              <TextField
                label="Service Date"
                type="date"
                value={form.serviceDate}
                onChange={updateField("serviceDate")}
              />
              <TextField
                label="Service Type"
                value={form.serviceType}
                onChange={updateField("serviceType")}
                placeholder="e.g., Specialist Visit"
              />
              <TextField
                label="CPT Code"
                value={form.cptCode}
                onChange={updateField("cptCode")}
                placeholder="e.g., 72148"
              />
              <TextField
                label="Facility Name"
                value={form.facilityName}
                onChange={updateField("facilityName")}
                placeholder="Optional"
              />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={updateField("notes")}
                  rows={3}
                  placeholder="Any additional visit notes..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
              </div>
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
