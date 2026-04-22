import { useState } from "react";
import { api } from "@/lib/api";
import {
  Search,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Loader2,
  User,
  Calendar,
  CreditCard,
  Building2,
  Pill,
  History,
  X,
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

export default function PAEligibilityCheck({ user, onCaseCreated }) {
  const [form, setForm] = useState({
    patient_initials: "",
    dob: "",
    insurance_id: "",
    payer_name: "",
    procedure_requested: "",
  });
  const [loading, setLoading] = useState(false);
  const [eligResult, setEligResult] = useState(null);
  const [creating, setCreating] = useState(false);
  const [recentVerif, setRecentVerif] = useState(null); // recent EligibilityHistory record
  const [recentDismissed, setRecentDismissed] = useState(false);
  const [_checkingRecent, setCheckingRecent] = useState(false);

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
      if (ageHours < 72) setRecentVerif(latest); // warn if within 72 hours
    }
    setCheckingRecent(false);
  };

  const handleCheck = async () => {
    setLoading(true);
    setEligResult(null);
    try {
      const res = await api.functions.invoke("availityEligibility", {
        patient_name: form.patient_initials,
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
    const prefix = "PA";
    const caseId = `${prefix}-${Date.now().toString().slice(-6)}`;
    const newCase = await api.entities.PriorAuthCase.create({
      case_id: caseId,
      eligibility_check_id: eligResult.check_id,
      gateway_patient_id: eligResult.gateway_patient_id,
      patient_initials: form.patient_initials,
      patient_dob: form.dob,
      insurance_id: form.insurance_id,
      payer_name: form.payer_name,
      procedure_name: form.procedure_requested,
      plan_type: eligResult.plan_type,
      group_number: eligResult.group_number,
      eligibility_verified: true,
      eligibility_data_json: JSON.stringify(eligResult),
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
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Eligibility Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Eligibility Verification</h2>
        <p className="text-sm text-slate-500 mb-5">
          Every prior authorization starts with an eligibility check.
        </p>

        {/* Recent Verification Alert */}
        {recentVerif && !recentDismissed && (
          <div className="mb-5 flex items-start gap-3 p-4 rounded-xl border-2 border-amber-300 bg-amber-50">
            <History className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-800 text-sm">
                Recent Eligibility Verification Found
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Member <span className="font-mono font-bold">{recentVerif.member_id}</span> was
                already verified
                {recentVerif.subscriber_name ? ` for ${recentVerif.subscriber_name}` : ""} via{" "}
                <strong>{recentVerif.channel_used || "EDI"}</strong> on{" "}
                <strong>{new Date(recentVerif.created_date).toLocaleString()}</strong> — result:{" "}
                <strong
                  className={
                    recentVerif.coverage_status === "Active" ? "text-emerald-700" : "text-red-700"
                  }
                >
                  {recentVerif.coverage_status}
                </strong>
                .
              </p>
              <p className="text-xs text-amber-600 mt-1 font-semibold">
                ⚠ Re-running eligibility too frequently may cause duplicate EDI transactions. Use
                the cached result above unless coverage has changed.
              </p>
            </div>
            <button
              onClick={() => setRecentDismissed(true)}
              className="text-amber-500 hover:text-amber-700 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Patient Initials *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.patient_initials}
                onChange={(e) => setForm((f) => ({ ...f, patient_initials: e.target.value }))}
                placeholder="e.g. S.J.M."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Date of Birth *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Insurance ID / Member ID *
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.insurance_id}
                onChange={(e) => setForm((f) => ({ ...f, insurance_id: e.target.value }))}
                onBlur={handleMemberIdBlur}
                placeholder="Member ID"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Payer Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.payer_name}
                onChange={(e) => setForm((f) => ({ ...f, payer_name: e.target.value }))}
                placeholder="e.g. UnitedHealthcare"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Procedure or Medication Requested *
            </label>
            <div className="relative">
              <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.procedure_requested}
                onChange={(e) => setForm((f) => ({ ...f, procedure_requested: e.target.value }))}
                placeholder="e.g. MRI Lumbar Spine / Humira 40mg"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleCheck}
          disabled={loading || !form.patient_initials || !form.insurance_id || !form.payer_name}
          className="mt-5 flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#293682" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Checking Eligibility…" : "Check Eligibility"}
        </button>
      </div>

      {/* Eligibility Result */}
      {eligResult && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Status Banner */}
          <div
            className="py-5 px-6 flex items-center gap-4"
            style={{ backgroundColor: STATUS_COLORS[eligResult.coverage_status]?.bg || "#293682" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              {StatusIcon && <StatusIcon className="w-6 h-6 text-white" />}
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-xl">
                {eligResult.coverage_status === "Active"
                  ? "Active Coverage Confirmed"
                  : `Coverage ${eligResult.coverage_status}`}
              </p>
              <p className="text-white/80 text-sm">
                {form.patient_initials} · {form.payer_name} · {eligResult.plan_name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">AI Confidence</p>
              <p className="text-white font-bold text-2xl">{eligResult.confidence_score}%</p>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-b border-slate-100">
            {[
              ["Plan", eligResult.plan_name],
              ["Plan Type", eligResult.plan_type],
              ["Network", eligResult.network_status],
              ["Group #", eligResult.group_number],
              ["Member ID", eligResult.member_id],
              ["Effective", eligResult.effective_date],
              ["Terminates", eligResult.termination_date],
              ["Channel", eligResult.channel],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  {label}
                </p>
                <p className="font-semibold text-slate-800 text-xs">{val}</p>
              </div>
            ))}
          </div>

          {/* Prior Auth Required Banner */}
          <div className="p-5">
            {priorAuthRequired ? (
              <div
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl p-4 border-2 border-amber-300"
                style={{ backgroundColor: "#fffbeb" }}
              >
                <div className="flex-1">
                  <p className="font-bold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Prior Authorization Required
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This payer requires prior authorization for {form.procedure_requested}. Click
                    below to open a PA case pre-populated with all eligibility data.
                  </p>
                </div>
                <button
                  onClick={handleContinue}
                  disabled={creating}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                  style={{ backgroundColor: "#293682" }}
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  {creating ? "Creating Case…" : "Continue to Prior Auth"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800 font-semibold">
                  No Prior Authorization Required — patient may proceed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
