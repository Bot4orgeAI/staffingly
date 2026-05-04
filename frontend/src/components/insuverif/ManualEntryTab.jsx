import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEntityListQuery } from "@/lib/query";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const PLAN_TYPES = [
  "PPO",
  "HMO",
  "EPO",
  "POS",
  "HDHP",
  "Medicare Advantage",
  "Medicaid Managed Care",
  "Unknown",
];
const SERVICE_TYPES = [
  "Primary Care Visit",
  "Specialist Visit",
  "Urgent Care",
  "Emergency Room",
  "Lab/Diagnostics",
  "Imaging/Radiology",
  "Mental Health/Behavioral",
  "Physical Therapy",
  "Chiropractic",
  "Surgery",
  "Preventive/Wellness",
  "Pharmacy",
  "Other",
];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const RELATIONSHIPS = ["Self", "Spouse", "Child", "Other Dependent"];
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const today = new Date().toISOString().split("T")[0];

function getPrimaryPolicy(patient) {
  return patient?.insurancePolicies?.find((policy) => policy.policyType === "PRIMARY");
}

function buildFormFromPatient(patient, currentForm) {
  const primaryPolicy = getPrimaryPolicy(patient);

  return {
    ...currentForm,
    patient_id: patient?.id || currentForm.patient_id || "",
    first_name: patient?.firstName || currentForm.first_name || "",
    last_name: patient?.lastName || currentForm.last_name || "",
    middle_name: patient?.middleName || currentForm.middle_name || "",
    dob: patient?.dob ? patient.dob.split("T")[0] : currentForm.dob || "",
    gender: patient?.gender || currentForm.gender || "",
    phone: patient?.phone || currentForm.phone || "",
    email: patient?.email || currentForm.email || "",
    address: patient?.address || currentForm.address || "",
    city: patient?.city || currentForm.city || "",
    state: patient?.state || currentForm.state || "",
    zip: patient?.zip || currentForm.zip || "",
    payer: primaryPolicy?.payerName || currentForm.payer || "",
    payer_id: primaryPolicy?.payerId || currentForm.payer_id || "",
    member_id: primaryPolicy?.memberId || currentForm.member_id || "",
    group_number: primaryPolicy?.groupNumber || currentForm.group_number || "",
    plan_name: primaryPolicy?.planName || currentForm.plan_name || "",
    plan_type: primaryPolicy?.planType || currentForm.plan_type || "",
    effective_date: primaryPolicy?.effectiveDate
      ? primaryPolicy.effectiveDate.split("T")[0]
      : currentForm.effective_date || "",
    termination_date: primaryPolicy?.terminationDate
      ? primaryPolicy.terminationDate.split("T")[0]
      : currentForm.termination_date || "",
    rx_bin: primaryPolicy?.rxBin || currentForm.rx_bin || "",
    rx_pcn: primaryPolicy?.rxPcn || currentForm.rx_pcn || "",
    rx_group: primaryPolicy?.rxGroup || currentForm.rx_group || "",
    copay_pcp:
      primaryPolicy?.copayPcp != null
        ? String(primaryPolicy.copayPcp)
        : currentForm.copay_pcp || "",
    copay_specialist:
      primaryPolicy?.copaySpecialist != null
        ? String(primaryPolicy.copaySpecialist)
        : currentForm.copay_specialist || "",
    subscriber_name: primaryPolicy?.subscriberName || currentForm.subscriber_name || "",
    subscriber_dob: primaryPolicy?.subscriberDob
      ? primaryPolicy.subscriberDob.split("T")[0]
      : currentForm.subscriber_dob || "",
    subscriber_relationship:
      primaryPolicy?.subscriberRelationship || currentForm.subscriber_relationship || "Self",
  };
}

function FormInput({ label, required = false, children }) {
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
/** @type {any} */
const ringStyle = { "--tw-ring-color": "#293682" };

export default function ManualEntryTab({ onSubmit, prefill = {} }) {
  const { data: payerRules = [] } = useEntityListQuery("PayerRule", { limit: 100 }, null);
  const { data: patientsResponse } = useQuery({
    queryKey: ["patients", "manual-entry-selector"],
    queryFn: () => api.patients.list({ page: 1, limit: 100 }),
  });
  const [form, setForm] = useState({
    patient_id: prefill.patient_id || "",
    first_name: prefill.first_name || "",
    last_name: prefill.last_name || "",
    middle_name: prefill.middle_name || "",
    dob: prefill.dob || "",
    gender: prefill.gender || "",
    phone: prefill.phone || "",
    email: prefill.email || "",
    address: prefill.address || "",
    city: prefill.city || "",
    state: prefill.state || "",
    zip: prefill.zip || "",
    payer: prefill.payer || "",
    payer_id: prefill.payer_id || "",
    member_id: prefill.member_id || "",
    group_number: prefill.group_number || "",
    plan_name: prefill.plan_name || "",
    plan_type: prefill.plan_type || "",
    effective_date: prefill.effective_date || "",
    termination_date: prefill.termination_date || "",
    rx_bin: prefill.rx_bin || "",
    rx_pcn: prefill.rx_pcn || "",
    rx_group: prefill.rx_group || "",
    copay_pcp: prefill.copay_pcp || "",
    copay_specialist: prefill.copay_specialist || "",
    subscriber_name: prefill.subscriber_name || "",
    subscriber_dob: prefill.subscriber_dob || "",
    subscriber_relationship: prefill.subscriber_relationship || "Self",
    provider_npi: prefill.provider_npi || "",
    service_date: prefill.service_date || today,
    service_type: prefill.service_type || "",
    cpt_code: prefill.cpt_code || "",
    facility_name: prefill.facility_name || "",
    notes: prefill.notes || "",
  });
  const [showSecondary, setShowSecondary] = useState(false);
  const patients = patientsResponse?.data || [];
  const patientOptions = patients.map((patient) => {
    const primaryPolicy = getPrimaryPolicy(patient);
    const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(" ");

    return {
      label: primaryPolicy?.memberId
        ? `${patientName} (${primaryPolicy.memberId})`
        : patientName || "Unnamed patient",
      value: patient.id,
    };
  });
  const payerOptions = [
    ...new Set(
      payerRules
        .map((rule) => rule.payerName)
        .filter(Boolean)
        .concat("Other")
    ),
  ].map((payer) => ({ label: payer, value: payer }));

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, patient_name: `${form.first_name} ${form.last_name}` });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Select Existing Patient">
        <div className="grid grid-cols-1 gap-4">
          <FormInput label="Patient">
            <AppSelect
              value={form.patient_id}
              onValueChange={(value) => {
                const selectedPatient = patients.find((patient) => patient.id === value);
                if (!selectedPatient) return;
                setForm((current) => buildFormFromPatient(selectedPatient, current));
              }}
              options={patientOptions}
              placeholder="Choose an existing patient to auto-fill"
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
          </FormInput>
        </div>
      </Section>

      {/* Patient Info */}
      <Section title="Patient Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="First Name" required>
            <input
              className={inputClass}
              style={ringStyle}
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              required
            />
          </FormInput>
          <FormInput label="Middle Name">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.middle_name}
              onChange={(e) => update("middle_name", e.target.value)}
            />
          </FormInput>
          <FormInput label="Last Name" required>
            <input
              className={inputClass}
              style={ringStyle}
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              required
            />
          </FormInput>
          <FormInput label="Date of Birth" required>
            <input
              type="date"
              className={inputClass}
              style={ringStyle}
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              required
            />
          </FormInput>
          <FormInput label="Gender">
            <AppSelect
              value={form.gender}
              onValueChange={(value) => update("gender", value)}
              options={GENDERS.map((gender) => ({ label: gender, value: gender }))}
              placeholder="Select..."
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
          </FormInput>
          <FormInput label="Phone">
            <input
              type="tel"
              className={inputClass}
              style={ringStyle}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(555) 000-0000"
            />
          </FormInput>
          <FormInput label="Email">
            <input
              type="email"
              className={inputClass}
              style={ringStyle}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="patient@email.com"
            />
          </FormInput>
          <div className="sm:col-span-2">
            <FormInput label="Street Address">
              <textarea
                className={inputClass}
                style={ringStyle}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                rows={2}
                placeholder="123 Main Street"
              />
            </FormInput>
          </div>
          <FormInput label="City">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Austin"
            />
          </FormInput>
          <FormInput label="State">
            <AppSelect
              value={form.state}
              onValueChange={(value) => update("state", value)}
              options={US_STATES.map((state) => ({ label: state, value: state }))}
              placeholder="Select..."
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
          </FormInput>
          <FormInput label="ZIP">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              placeholder="78701"
            />
          </FormInput>
        </div>
      </Section>

      {/* Insurance */}
      <Section title="Insurance Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Insurance Payer" required>
            <AppSelect
              value={form.payer}
              onValueChange={(value) => update("payer", value)}
              options={payerOptions}
              placeholder="Select payer..."
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
          </FormInput>
          <FormInput label="Member ID" required>
            <input
              className={inputClass}
              style={ringStyle}
              value={form.member_id}
              onChange={(e) => update("member_id", e.target.value)}
              required
              placeholder="e.g. UHC-884720193"
            />
          </FormInput>
          <FormInput label="Payer ID">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.payer_id}
              onChange={(e) => update("payer_id", e.target.value)}
              placeholder="e.g. 87726"
            />
          </FormInput>
          <FormInput label="Group Number">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.group_number}
              onChange={(e) => update("group_number", e.target.value)}
              placeholder="GRP-XXXXX"
            />
          </FormInput>
          <FormInput label="Plan Name">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.plan_name}
              onChange={(e) => update("plan_name", e.target.value)}
            />
          </FormInput>
          <FormInput label="Plan Type">
            <AppSelect
              value={form.plan_type}
              onValueChange={(value) => update("plan_type", value)}
              options={PLAN_TYPES.map((type) => ({ label: type, value: type }))}
              placeholder="Select type..."
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
          </FormInput>
          <FormInput label="Effective Date">
            <input
              type="date"
              className={inputClass}
              style={ringStyle}
              value={form.effective_date}
              onChange={(e) => update("effective_date", e.target.value)}
            />
          </FormInput>
          <FormInput label="Termination Date">
            <input
              type="date"
              className={inputClass}
              style={ringStyle}
              value={form.termination_date}
              onChange={(e) => update("termination_date", e.target.value)}
            />
          </FormInput>
          <FormInput label="Subscriber Name">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.subscriber_name}
              onChange={(e) => update("subscriber_name", e.target.value)}
              placeholder="If different from patient"
            />
          </FormInput>
          <FormInput label="Subscriber DOB">
            <input
              type="date"
              className={inputClass}
              style={ringStyle}
              value={form.subscriber_dob}
              onChange={(e) => update("subscriber_dob", e.target.value)}
            />
          </FormInput>
          <FormInput label="Subscriber Relationship">
            <AppSelect
              value={form.subscriber_relationship}
              onValueChange={(value) => update("subscriber_relationship", value)}
              options={RELATIONSHIPS.map((relationship) => ({
                label: relationship,
                value: relationship,
              }))}
              placeholder="Select relationship..."
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
          </FormInput>
          <FormInput label="Rx BIN">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.rx_bin}
              onChange={(e) => update("rx_bin", e.target.value)}
              placeholder="e.g. 610014"
            />
          </FormInput>
          <FormInput label="Rx PCN">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.rx_pcn}
              onChange={(e) => update("rx_pcn", e.target.value)}
              placeholder="e.g. OHCARD"
            />
          </FormInput>
          <FormInput label="Rx Group">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.rx_group}
              onChange={(e) => update("rx_group", e.target.value)}
              placeholder="e.g. OHRX"
            />
          </FormInput>
          <FormInput label="Copay (PCP)">
            <input
              type="number"
              className={inputClass}
              style={ringStyle}
              value={form.copay_pcp}
              onChange={(e) => update("copay_pcp", e.target.value)}
              placeholder="0"
            />
          </FormInput>
          <FormInput label="Copay (Specialist)">
            <input
              type="number"
              className={inputClass}
              style={ringStyle}
              value={form.copay_specialist}
              onChange={(e) => update("copay_specialist", e.target.value)}
              placeholder="0"
            />
          </FormInput>
        </div>
      </Section>

      {/* Secondary Insurance */}
      <div className="border border-dashed border-slate-300 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSecondary((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Secondary Insurance
          </span>
          {showSecondary ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {showSecondary && (
          <div className="p-4 border-t border-dashed border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Secondary Payer",
              "Secondary Member ID",
              "Secondary Group #",
              "Secondary Plan Name",
            ].map((label) => (
              <FormInput key={label} label={label}>
                <input className={inputClass} style={ringStyle} />
              </FormInput>
            ))}
          </div>
        )}
      </div>

      {/* Visit Info */}
      <Section title="Visit Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Provider NPI" required>
            <input
              className={inputClass}
              style={ringStyle}
              value={form.provider_npi}
              onChange={(e) => update("provider_npi", e.target.value)}
              required
              placeholder="10-digit NPI"
            />
          </FormInput>
          <FormInput label="Service Date">
            <input
              type="date"
              className={inputClass}
              style={ringStyle}
              value={form.service_date}
              onChange={(e) => update("service_date", e.target.value)}
            />
          </FormInput>
          <FormInput label="Service Type">
            <AppSelect
              value={form.service_type}
              onValueChange={(value) => update("service_type", value)}
              options={SERVICE_TYPES.map((serviceType) => ({
                label: serviceType,
                value: serviceType,
              }))}
              placeholder="Select type..."
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
          </FormInput>
          <FormInput label="CPT Code">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.cpt_code}
              onChange={(e) => update("cpt_code", e.target.value)}
              placeholder="Optional"
            />
          </FormInput>
          <FormInput label="Facility Name">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.facility_name}
              onChange={(e) => update("facility_name", e.target.value)}
              placeholder="Optional"
            />
          </FormInput>
          <FormInput label="Notes">
            <textarea
              className={inputClass}
              style={ringStyle}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
            />
          </FormInput>
        </div>
      </Section>

      <div className="flex justify-start">
        <button
          type="submit"
          className="px-6 py-4 rounded-xl text-white font-bold text-base"
          style={{ backgroundColor: "#293682" }}
        >
          Run Eligibility Check
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-700 text-sm mb-4 pb-3 border-b border-slate-100">
        {title}
      </h3>
      {children}
    </div>
  );
}
