import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { createPageUrl } from "@/lib/utils/page";
import { derivePatientInitials } from "@/lib/utils/workflow";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle,
  ChevronRight,
  CreditCard,
  History,
  Loader2,
  Pill,
  Search,
  User,
  X,
  AlertTriangle,
} from "lucide-react";

const STATUS_COLORS = {
  Active: { bg: "#0a7e87", icon: CheckCircle },
  Inactive: { bg: "#dc2626", icon: AlertTriangle },
  Unknown: { bg: "#d97706", icon: AlertTriangle },
};

function normalizeEligibilityResult(data) {
  return {
    coverage_status: data.coverage_status || data.coverageStatus || "Unknown",
    plan_name: data.plan_name || data.planName || "",
    plan_type: data.plan_type || data.planType || "",
    group_number: data.group_number || data.groupNumber || "",
    member_id: data.member_id || data.memberId || "",
    network_status: data.network_status || data.networkStatus || "",
    effective_date: data.effective_date || data.effectiveDate || "",
    termination_date: data.termination_date || data.terminationDate || "",
    prior_auth_required: data.prior_auth_required ?? true,
    confidence_score: data.confidence_score || data.confidenceScore || 0,
    channel: data.channel_used || data.channelUsed || "n8n Master Gateway",
    response_time: data.response_time_seconds || data.responseTimeSeconds || "",
    check_id: data.check_id || data.checkId || "",
    gateway_patient_id: data.gateway_patient_id || data.gatewayPatientId || "",
  };
}

function TextField({
  label,
  value,
  onChange,
  placeholder = "",
  icon: Icon,
  type = "text",
  onBlur,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}
        <input
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none ${
            Icon ? "pl-9" : ""
          }`}
        />
      </div>
    </div>
  );
}

function SummaryField({ label, value }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-700">{value || "—"}</p>
    </div>
  );
}

export default function PAEligibilityCheck({ user, onCaseCreated, workflowContext, onClose }) {
  const prefill = useMemo(
    () => ({
      patient_name: workflowContext?.patientName || "",
      patient_initials:
        derivePatientInitials(workflowContext?.patientName || "") ||
        workflowContext?.patientName ||
        "",
      dob: workflowContext?.dob || "",
      insurance_id: workflowContext?.memberId || "",
      payer_name: workflowContext?.payer || "",
      procedure_requested: workflowContext?.procedureRequested || "",
    }),
    [workflowContext]
  );

  const [form, setForm] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [eligResult, setEligResult] = useState(null);
  const [creating, setCreating] = useState(false);
  const [recentVerif, setRecentVerif] = useState(null);
  const [recentDismissed, setRecentDismissed] = useState(false);
  const [_checkingRecent, setCheckingRecent] = useState(false);

  useEffect(() => {
    setForm(prefill);
  }, [prefill]);

  const handleMemberIdBlur = async () => {
    if (!form.insurance_id.trim()) return;
    setCheckingRecent(true);
    setRecentVerif(null);
    setRecentDismissed(false);
    const results = await api.entities.EligibilityHistory.filter({
      member_id: form.insurance_id,
    }).catch(() => []);
    if (results.length > 0) {
      const sorted = results.sort(
        (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      );
      const latest = sorted[0];
      const ageHours = (Date.now() - new Date(latest.created_date).getTime()) / 3600000;
      if (ageHours < 72) setRecentVerif(latest);
    }
    setCheckingRecent(false);
  };

  const handleCheck = async () => {
    setLoading(true);
    setEligResult(null);
    try {
      const res = await api.functions.invoke("availityEligibility", {
        patient_name: form.patient_name || form.patient_initials,
        dob: form.dob,
        member_id: form.insurance_id,
        payer_name: form.payer_name,
        service_type_code: "30",
        service_date: new Date().toISOString().slice(0, 10),
        submission_type: "manual",
      });
      setEligResult(normalizeEligibilityResult(res.data || {}));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setCreating(true);
    const newCase = await api.entities.PriorAuthCase.create({
      eligibility_check_id: eligResult.check_id,
      gateway_patient_id: eligResult.gateway_patient_id,
      patient_name: form.patient_name,
      patient_initials: form.patient_initials,
      patient_dob: form.dob,
      insurance_id: form.insurance_id,
      payer_name: form.payer_name,
      procedure_name: form.procedure_requested,
      plan_type: eligResult.plan_type,
      group_number: eligResult.group_number,
      eligibility_verified: true,
      status: "New",
      assigned_specialist_name: user?.full_name || "Unassigned",
    });
    setCreating(false);
    onCaseCreated(newCase.id);
  };

  const priorAuthRequired = eligResult?.prior_auth_required;
  const StatusIcon = eligResult
    ? STATUS_COLORS[eligResult.coverage_status]?.icon || CheckCircle
    : null;

  return (
    <motion.div
      className="fixed inset-0 z-50 h-screen min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button
        type="button"
        aria-label="Close prior auth drawer"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%", opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.9 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute right-0 top-0 flex h-screen min-h-screen w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-gradient-to-br from-[#f7fbfb] via-white to-[#eef7f8] px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0a7e87]">
                Prior Auth Intake
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">
                Start New Prior Authorization
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Use the same structured intake pattern as Patients: verify eligibility first, then
                continue with a case prefilled from the payer response.
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
          {workflowContext?.patientName ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-800">Workflow Context</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Patient and coverage details were carried forward from the existing workflow.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <Link
                  to={createPageUrl("patients")}
                  className="rounded-full bg-slate-50 px-3 py-1 hover:bg-slate-100"
                >
                  Patients
                </Link>
                <ArrowRight className="h-3.5 w-3.5" />
                <Link
                  to={createPageUrl(
                    `new-verification?${new URLSearchParams({
                      source: workflowContext.source || "patients",
                      intent: "prior-auth",
                      patientId: workflowContext.patientId || "",
                      patient_name: workflowContext.patientName || "",
                      first_name: workflowContext.firstName || "",
                      last_name: workflowContext.lastName || "",
                      dob: workflowContext.dob || "",
                      phone: workflowContext.phone || "",
                      email: workflowContext.email || "",
                      payer: workflowContext.payer || "",
                      payer_id: workflowContext.payerId || "",
                      member_id: workflowContext.memberId || "",
                      group_number: workflowContext.groupNumber || "",
                      plan_name: workflowContext.planName || "",
                      plan_type: workflowContext.planType || "",
                      subscriber_name: workflowContext.subscriberName || "",
                      subscriber_dob: workflowContext.subscriberDob || "",
                      subscriber_relationship: workflowContext.subscriberRelationship || "Self",
                      procedure_requested: workflowContext.procedureRequested || "",
                    }).toString()}`
                  )}
                  className="rounded-full bg-slate-50 px-3 py-1 hover:bg-slate-100"
                >
                  Eligibility
                </Link>
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-[#293682]">
                  Prior Auth
                </span>
              </div>
            </section>
          ) : null}

          {recentVerif && !recentDismissed ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <History className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold">Recent eligibility verification found</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Member <span className="font-mono font-semibold">{recentVerif.member_id}</span>{" "}
                    was already verified on{" "}
                    <span className="font-semibold">
                      {new Date(recentVerif.created_date).toLocaleString()}
                    </span>
                    . Use the cached result unless coverage changed.
                  </p>
                </div>
                <button
                  onClick={() => setRecentDismissed(true)}
                  className="text-amber-500 hover:text-amber-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Patient & Coverage</h4>
              <p className="mt-1 text-xs text-slate-500">
                Capture the patient, payer, and requested service details needed for the eligibility
                run.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Patient Name *"
                value={form.patient_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    patient_name: event.target.value,
                    patient_initials: derivePatientInitials(event.target.value),
                  }))
                }
                placeholder="Sarah Jane Miller"
                icon={User}
              />
              <TextField
                label="Date Of Birth *"
                type="date"
                value={form.dob}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dob: event.target.value }))
                }
                icon={Calendar}
              />
              <TextField
                label="Insurance ID / Member ID *"
                value={form.insurance_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, insurance_id: event.target.value }))
                }
                onBlur={handleMemberIdBlur}
                placeholder="Member ID"
                icon={CreditCard}
              />
              <TextField
                label="Payer Name *"
                value={form.payer_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, payer_name: event.target.value }))
                }
                placeholder="UnitedHealthcare"
                icon={Building2}
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Procedure Or Medication Requested *"
                  value={form.procedure_requested}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      procedure_requested: event.target.value,
                    }))
                  }
                  placeholder="MRI Lumbar Spine / Humira 40mg"
                  icon={Pill}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Case initials: {form.patient_initials || "Will be generated automatically"}
            </p>
          </section>

          {eligResult ? (
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <div
                className="flex items-center gap-4 px-6 py-5"
                style={{
                  backgroundColor: STATUS_COLORS[eligResult.coverage_status]?.bg || "#293682",
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  {StatusIcon ? <StatusIcon className="h-6 w-6 text-white" /> : null}
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold text-white">
                    {eligResult.coverage_status === "Active"
                      ? "Active Coverage Confirmed"
                      : `Coverage ${eligResult.coverage_status}`}
                  </p>
                  <p className="text-sm text-white/80">
                    {form.patient_name || form.patient_initials} · {form.payer_name} ·{" "}
                    {eligResult.plan_name || "Plan pending"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">AI Confidence</p>
                  <p className="text-2xl font-bold text-white">{eligResult.confidence_score}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 p-6 sm:grid-cols-4">
                {[
                  ["Plan", eligResult.plan_name],
                  ["Plan Type", eligResult.plan_type],
                  ["Network", eligResult.network_status],
                  ["Group #", eligResult.group_number],
                  ["Member ID", eligResult.member_id],
                  ["Effective", eligResult.effective_date],
                  ["Terminates", eligResult.termination_date],
                  ["Channel", eligResult.channel],
                ].map(([label, value]) => (
                  <SummaryField key={label} label={label} value={value} />
                ))}
              </div>

              <div className="p-5">
                {priorAuthRequired ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-2 font-bold text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      Prior Authorization Required
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      This payer requires prior authorization for {form.procedure_requested}.
                      Continue to create the case with the verified eligibility context.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 font-bold text-emerald-800">
                      <CheckCircle className="h-4 w-4" />
                      No Prior Authorization Required
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      This service does not appear to need prior auth based on the current payer
                      response.
                    </p>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>

        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          {!eligResult ? (
            <button
              onClick={handleCheck}
              disabled={loading || !form.patient_name || !form.insurance_id || !form.payer_name}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "#0a7e87" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Checking Eligibility..." : "Check Eligibility"}
            </button>
          ) : priorAuthRequired ? (
            <button
              onClick={handleContinue}
              disabled={creating}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "#0a7e87" }}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {creating ? "Creating Case..." : "Continue to Prior Auth"}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl py-3 text-sm font-bold text-white"
              style={{ backgroundColor: "#0a7e87" }}
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
