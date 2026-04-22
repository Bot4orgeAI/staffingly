import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import { useAuthUserQuery } from "@/lib/query";
import AppHeader from "@/components/insuverif/AppHeader";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  User,
  ShieldCheck,
  Building2,
  Landmark,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Basic Info", icon: User, description: "Name, specialty & contact" },
  { id: 2, label: "Credentials", icon: ShieldCheck, description: "License, NPI & expiry" },
  { id: 3, label: "Payer Enrollment", icon: Building2, description: "Insurance payer status" },
  { id: 4, label: "Bank Details", icon: Landmark, description: "Reimbursement info" },
];

const PAYER_LIST = [
  "UnitedHealthcare",
  "Aetna",
  "Cigna",
  "Humana",
  "Blue Cross Blue Shield",
  "Medicare",
  "Medicaid",
  "Tricare",
  "Molina Healthcare",
  "Oscar Health",
];

const SPECIALTY_LIST = [
  "Internal Medicine",
  "Family Medicine",
  "Pediatrics",
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Neurology",
  "Psychiatry",
  "Oncology",
  "Radiology",
  "Emergency Medicine",
  "Anesthesiology",
  "OB/GYN",
  "Urology",
  "Other",
];

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      {msg}
    </p>
  );
}

function Field({ label, required = false, children, error = null }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      <FieldError msg={error} />
    </div>
  );
}

const inputCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all";
const errCls = "border-red-300 focus:ring-red-200";

// ── Step 1: Basic Info ──────────────────────────────────────────────────────
function Step1({ data, onChange, errors }) {
  const f = (field) => (e) => onChange({ ...data, [field]: e.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Field label="First Name" required error={errors.first_name}>
        <input
          value={data.first_name}
          onChange={f("first_name")}
          placeholder="John"
          className={`${inputCls} ${errors.first_name ? errCls : ""}`}
        />
      </Field>
      <Field label="Last Name" required error={errors.last_name}>
        <input
          value={data.last_name}
          onChange={f("last_name")}
          placeholder="Smith"
          className={`${inputCls} ${errors.last_name ? errCls : ""}`}
        />
      </Field>
      <Field label="Provider Type" required error={errors.provider_type}>
        <select
          value={data.provider_type}
          onChange={f("provider_type")}
          className={`${inputCls} ${errors.provider_type ? errCls : ""}`}
        >
          {["MD", "DO", "NP", "PA", "LCSW", "PT", "OT", "DDS", "Other"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="Specialty" required error={errors.specialty}>
        <select
          value={data.specialty}
          onChange={f("specialty")}
          className={`${inputCls} ${errors.specialty ? errCls : ""}`}
        >
          <option value="">Select specialty…</option>
          {SPECIALTY_LIST.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Email" required error={errors.email}>
        <input
          value={data.email}
          onChange={f("email")}
          type="email"
          placeholder="john@clinic.com"
          className={`${inputCls} ${errors.email ? errCls : ""}`}
        />
      </Field>
      <Field label="Phone" required error={errors.phone}>
        <input
          value={data.phone}
          onChange={f("phone")}
          placeholder="(555) 000-0000"
          className={`${inputCls} ${errors.phone ? errCls : ""}`}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Office Address" error={errors.address}>
          <input
            value={data.address}
            onChange={f("address")}
            placeholder="123 Medical Center Dr, Suite 100"
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

// ── Step 2: Credentials ──────────────────────────────────────────────────────
function Step2({ data, onChange, errors }) {
  const f = (field) => (e) => onChange({ ...data, [field]: e.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Field label="NPI Number" required error={errors.npi}>
        <input
          value={data.npi}
          onChange={f("npi")}
          placeholder="1234567890"
          maxLength={10}
          className={`${inputCls} font-mono ${errors.npi ? errCls : ""}`}
        />
      </Field>
      <Field label="Tax ID / EIN" error={errors.tax_id}>
        <input
          value={data.tax_id}
          onChange={f("tax_id")}
          placeholder="12-3456789"
          className={`${inputCls} font-mono`}
        />
      </Field>
      <Field label="License Number" required error={errors.license_number}>
        <input
          value={data.license_number}
          onChange={f("license_number")}
          placeholder="MED-12345"
          className={`${inputCls} ${errors.license_number ? errCls : ""}`}
        />
      </Field>
      <Field label="License State" required error={errors.license_state}>
        <input
          value={data.license_state}
          onChange={f("license_state")}
          placeholder="TX"
          maxLength={2}
          className={`${inputCls} ${errors.license_state ? errCls : ""}`}
        />
      </Field>
      <Field label="License Expiry Date" required error={errors.license_expiry}>
        <input
          value={data.license_expiry}
          onChange={f("license_expiry")}
          type="date"
          className={`${inputCls} ${errors.license_expiry ? errCls : ""}`}
        />
      </Field>
      <Field label="DEA Number" error={errors.dea_number}>
        <input
          value={data.dea_number}
          onChange={f("dea_number")}
          placeholder="AB1234563"
          className={`${inputCls} font-mono`}
        />
      </Field>
      <div className="sm:col-span-2 bg-blue-50 rounded-xl p-4 text-xs text-blue-700 border border-blue-100">
        <strong>Note:</strong> Your NPI must be exactly 10 digits and is required for payer
        enrollment. License info will be verified during the credentialing process.
      </div>
    </div>
  );
}

// ── Step 3: Payer Enrollment ─────────────────────────────────────────────────
function Step3({ data, onChange, errors }) {
  const togglePayer = (payer) => {
    const current = data.enrolled_payers || [];
    const updated = current.includes(payer)
      ? current.filter((p) => p !== payer)
      : [...current, payer];
    onChange({ ...data, enrolled_payers: updated });
  };

  const enrolled = data.enrolled_payers || [];

  return (
    <div className="space-y-5">
      {errors.enrolled_payers && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errors.enrolled_payers}
        </div>
      )}
      <div>
        <p className="text-sm text-slate-600 mb-3">
          Select all payers this provider is currently enrolled with or actively seeking enrollment:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAYER_LIST.map((payer) => {
            const checked = enrolled.includes(payer);
            return (
              <button
                key={payer}
                onClick={() => togglePayer(payer)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${checked ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${checked ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}
                >
                  {checked && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`text-sm font-medium ${checked ? "text-blue-800" : "text-slate-700"}`}
                >
                  {payer}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Field label="Enrollment Status">
          <select
            value={data.enrollment_status || "In Progress"}
            onChange={(e) => onChange({ ...data, enrollment_status: e.target.value })}
            className={inputCls}
          >
            {["In Progress", "Pending Approval", "Active", "Not Started"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Additional Payers / Notes" error={undefined}>
        <textarea
          value={data.enrollment_notes || ""}
          onChange={(e) => onChange({ ...data, enrollment_notes: e.target.value })}
          rows={2}
          placeholder="List any other payers or notes about enrollment status…"
          className={`${inputCls} resize-none`}
        />
      </Field>
    </div>
  );
}

// ── Step 4: Bank Details ─────────────────────────────────────────────────────
function Step4({ data, onChange, errors }) {
  const f = (field) => (e) => onChange({ ...data, [field]: e.target.value });
  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Banking information is encrypted and stored securely. It is used solely for insurance
          reimbursement disbursements.
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Bank Name" required error={errors.bank_name}>
          <input
            value={data.bank_name}
            onChange={f("bank_name")}
            placeholder="Chase Bank"
            className={`${inputCls} ${errors.bank_name ? errCls : ""}`}
          />
        </Field>
        <Field label="Account Holder Name" required error={errors.account_holder}>
          <input
            value={data.account_holder}
            onChange={f("account_holder")}
            placeholder="John A. Smith MD"
            className={`${inputCls} ${errors.account_holder ? errCls : ""}`}
          />
        </Field>
        <Field label="Account Type" required error={errors.account_type}>
          <select
            value={data.account_type || ""}
            onChange={f("account_type")}
            className={`${inputCls} ${errors.account_type ? errCls : ""}`}
          >
            <option value="">Select type…</option>
            <option>Checking</option>
            <option>Savings</option>
          </select>
        </Field>
        <Field label="Routing Number" required error={errors.routing_number}>
          <input
            value={data.routing_number}
            onChange={f("routing_number")}
            placeholder="021000021"
            maxLength={9}
            className={`${inputCls} font-mono ${errors.routing_number ? errCls : ""}`}
          />
        </Field>
        <Field label="Account Number" required error={errors.account_number}>
          <input
            value={data.account_number}
            onChange={f("account_number")}
            placeholder="••••••••••••"
            type="password"
            className={`${inputCls} ${errors.account_number ? errCls : ""}`}
          />
        </Field>
        <Field label="Confirm Account Number" required error={errors.account_number_confirm}>
          <input
            value={data.account_number_confirm}
            onChange={f("account_number_confirm")}
            placeholder="••••••••••••"
            type="password"
            className={`${inputCls} ${errors.account_number_confirm ? errCls : ""}`}
          />
        </Field>
      </div>
    </div>
  );
}

// ── Validators ───────────────────────────────────────────────────────────────
function validateStep(step, data) {
  const errors = {};
  if (step === 1) {
    if (!data.first_name?.trim()) errors.first_name = "First name is required";
    if (!data.last_name?.trim()) errors.last_name = "Last name is required";
    if (!data.specialty?.trim()) errors.specialty = "Please select a specialty";
    if (!data.email?.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = "Enter a valid email address";
    if (!data.phone?.trim()) errors.phone = "Phone number is required";
  }
  if (step === 2) {
    if (!data.npi?.trim()) errors.npi = "NPI is required";
    else if (!/^\d{10}$/.test(data.npi)) errors.npi = "NPI must be exactly 10 digits";
    if (!data.license_number?.trim()) errors.license_number = "License number is required";
    if (!data.license_state?.trim()) errors.license_state = "License state is required";
    if (!data.license_expiry?.trim()) errors.license_expiry = "License expiry is required";
    else if (new Date(data.license_expiry) < new Date())
      errors.license_expiry = "License appears to be expired";
  }
  if (step === 3) {
    if (!data.enrolled_payers?.length) errors.enrolled_payers = "Please select at least one payer";
  }
  if (step === 4) {
    if (!data.bank_name?.trim()) errors.bank_name = "Bank name is required";
    if (!data.account_holder?.trim()) errors.account_holder = "Account holder name is required";
    if (!data.account_type?.trim()) errors.account_type = "Please select account type";
    if (!data.routing_number?.trim()) errors.routing_number = "Routing number is required";
    else if (!/^\d{9}$/.test(data.routing_number))
      errors.routing_number = "Routing number must be 9 digits";
    if (!data.account_number?.trim()) errors.account_number = "Account number is required";
    if (data.account_number !== data.account_number_confirm)
      errors.account_number_confirm = "Account numbers do not match";
  }
  return errors;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProviderOnboarding() {
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("client_id") || "";

  const { data: user } = useAuthUserQuery();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [basic, setBasic] = useState({
    first_name: "",
    last_name: "",
    provider_type: "MD",
    specialty: "",
    email: "",
    phone: "",
    address: "",
  });
  const [creds, setCreds] = useState({
    npi: "",
    tax_id: "",
    license_number: "",
    license_state: "",
    license_expiry: "",
    dea_number: "",
  });
  const [payers, setPayers] = useState({
    enrolled_payers: [],
    enrollment_status: "In Progress",
    enrollment_notes: "",
  });
  const [bank, setBank] = useState({
    bank_name: "",
    account_holder: "",
    account_type: "",
    routing_number: "",
    account_number: "",
    account_number_confirm: "",
  });

  const dataByStep = { 1: basic, 2: creds, 3: payers, 4: bank };

  const handleNext = () => {
    const errs = validateStep(step, dataByStep[step]);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const errs = validateStep(4, bank);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    const providerData = {
      client_id: clientId,
      first_name: basic.first_name,
      last_name: basic.last_name,
      provider_type: basic.provider_type,
      specialty: basic.specialty,
      email: basic.email,
      phone: basic.phone,
      npi: creds.npi,
      license_number: creds.license_number,
      license_state: creds.license_state,
      license_expiry: creds.license_expiry,
      status: "Credentialing",
      notes: [
        payers.enrolled_payers.length ? `Payers: ${payers.enrolled_payers.join(", ")}` : "",
        payers.enrollment_notes ? `Enrollment notes: ${payers.enrollment_notes}` : "",
        bank.bank_name ? `Bank: ${bank.bank_name} (${bank.account_type})` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    };
    await api.entities.Provider.create(providerData);
    setSaving(false);
    setDone(true);
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (done) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "#eef3ff", fontFamily: "'DM Sans', sans-serif" }}
      >
        <AppHeader
          user={user}
          breadcrumbs={[
            { label: "Dashboard", href: createPageUrl("dashboard") },
            { label: "Provider Onboarding" },
          ]}
        />
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-10 text-center max-w-md w-full">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: "#f0fdf4" }}
            >
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Onboarding Complete!</h2>
            <p className="text-slate-500 text-sm mb-2">
              <strong>
                {basic.first_name} {basic.last_name}
              </strong>{" "}
              has been successfully onboarded.
            </p>
            <p className="text-slate-400 text-xs mb-8">
              Status set to <span className="font-semibold text-blue-700">Credentialing</span>.
              You'll be notified once verification is complete.
            </p>
            <div className="flex gap-3 justify-center">
              {clientId && (
                <Link to={createPageUrl(`ClientDetail?id=${clientId}`)}>
                  <button
                    className="px-5 py-2.5 rounded-xl text-white text-sm font-bold"
                    style={{ backgroundColor: "#293682" }}
                  >
                    View Client
                  </button>
                </Link>
              )}
              <Link to={createPageUrl("dashboard")}>
                <button className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                  Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#eef3ff", fontFamily: "'DM Sans', sans-serif" }}
    >
      <AppHeader
        user={user}
        breadcrumbs={[
          { label: "Dashboard", href: createPageUrl("dashboard") },
          { label: "Provider Onboarding" },
        ]}
      />

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Provider Onboarding</h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete all 4 steps to enroll a new provider.
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isComplete = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isComplete
                          ? "border-emerald-500 bg-emerald-500"
                          : isCurrent
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <s.icon
                          className={`w-4 h-4 ${isCurrent ? "text-white" : "text-slate-400"}`}
                        />
                      )}
                    </div>
                    <p
                      className={`text-[11px] font-bold mt-2 text-center whitespace-nowrap ${isCurrent ? "text-blue-700" : isComplete ? "text-emerald-600" : "text-slate-400"}`}
                    >
                      {s.label}
                    </p>
                    <p className="text-[10px] text-slate-400 text-center hidden sm:block">
                      {s.description}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${step > s.id ? "bg-emerald-400" : "bg-slate-200"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div
            className="px-6 py-4 border-b border-slate-100"
            style={{ backgroundColor: "#f8faff" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: "#293682" }}
              >
                {(() => {
                  const S = STEPS[step - 1];
                  return <S.icon className="w-4 h-4" />;
                })()}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Step {step} of {STEPS.length}
                </p>
                <h2 className="font-bold text-slate-800">{STEPS[step - 1].label}</h2>
              </div>
            </div>
          </div>

          <div className="p-6">
            {step === 1 && <Step1 data={basic} onChange={setBasic} errors={errors} />}
            {step === 2 && <Step2 data={creds} onChange={setCreds} errors={errors} />}
            {step === 3 && <Step3 data={payers} onChange={setPayers} errors={errors} />}
            {step === 4 && <Step4 data={bank} onChange={setBank} errors={errors} />}
          </div>

          <div className="px-6 pb-6 flex justify-between items-center border-t border-slate-100 pt-5">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-xs text-slate-400">
              {step} / {STEPS.length}
            </span>
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#293682" }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                style={{ backgroundColor: "#0a7e87" }}
              >
                {saving ? (
                  "Submitting…"
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Complete Onboarding
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
