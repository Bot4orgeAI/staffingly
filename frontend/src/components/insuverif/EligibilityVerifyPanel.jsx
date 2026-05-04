import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  X,
  ShieldCheck,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const COVERAGE_COLORS = {
  Active: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  Inactive: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  Unknown: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
};

function HistoryRow({ record, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const cc = COVERAGE_COLORS[record.coverage_status] || COVERAGE_COLORS.Unknown;
  const flags = record.flags_json ? JSON.parse(record.flags_json) : [];
  const date = new Date(record.created_date).toLocaleString();

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: cc.bg, color: cc.text, border: `1px solid ${cc.border}` }}
          >
            {record.coverage_status || "Unknown"}
          </span>
          <span className="text-xs text-slate-600">{record.payer}</span>
          <span className="text-[11px] text-slate-400">· {record.member_id}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">{date}</span>
          {record.confidence_score != null && (
            <span
              className="text-[11px] font-bold"
              style={{ color: record.confidence_score >= 80 ? "#15803d" : "#d97706" }}
            >
              {record.confidence_score}%
            </span>
          )}
          {open ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {flags.length > 0 && (
            <div className="space-y-1">
              {flags.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  {f}
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            {[
              ["Plan", record.plan_name],
              ["Plan Type", record.plan_type],
              ["Network", record.network_status],
              ["Effective", record.effective_date],
              ["Terminates", record.termination_date],
              [
                "Deductible",
                record.deductible_individual_total != null
                  ? `$${record.deductible_individual_total} total / $${record.deductible_individual_met ?? 0} met`
                  : null,
              ],
              ["OOP Max", record.oop_max_individual ? `$${record.oop_max_individual}` : null],
              ["Copay (PCP)", record.copay_pcp != null ? `$${record.copay_pcp}` : null],
              [
                "Copay (Spec)",
                record.copay_specialist != null ? `$${record.copay_specialist}` : null,
              ],
              ["Coinsurance", record.coinsurance_in != null ? `${record.coinsurance_in}%` : null],
              [
                "Response Time",
                record.response_time_seconds ? `${record.response_time_seconds}s` : null,
              ],
              ["Verified By", record.verified_by],
            ]
              .filter(([, v]) => v)
              .map(([label, val]) => (
                <div key={label} className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-medium text-slate-700">{val}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EligibilityVerifyPanel({ subscriber, provider, onClose, onVerified }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [subscriber.id]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const records = await api.entities.EligibilityHistory.filter(
      { subscriber_id: subscriber.id },
      "-created_date",
      20
    );
    setHistory(records);
    setLoadingHistory(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    setResult(null);

    const user = await api.auth.me();
    const serviceDate = new Date().toISOString().split("T")[0];

    const res = await api.functions.invoke("availityEligibility", {
      patient_name: `${subscriber.first_name || ""} ${subscriber.last_name}`.trim(),
      dob: subscriber.dob || "",
      member_id: subscriber.member_id || "",
      payer_id: "", // will use payer name fallback
      provider_npi: provider?.npi || "",
      service_date: serviceDate,
      service_type_code: "30",
      payer_name: subscriber.payer || "",
    });

    const data = res.data;

    if (!data || data.error) {
      setError(data?.error || "Verification failed");
      setVerifying(false);
      return;
    }

    setResult(data);

    // Parse benefits
    const benefits = data.benefits_raw || [];
    const findAmt = (codes, infoCode) => {
      const b = benefits.find(
        (b) => b.serviceTypeCodes?.some((c) => codes.includes(c)) && b.code === infoCode
      );
      return b?.benefitAmount ? parseFloat(b.benefitAmount) : null;
    };
    const findPct = (codes, infoCode) => {
      const b = benefits.find(
        (b) => b.serviceTypeCodes?.some((c) => codes.includes(c)) && b.code === infoCode
      );
      return b?.benefitPercent ? parseFloat(b.benefitPercent) * 100 : null;
    };

    const flags = data.flags || [];

    // Save to history
    await api.entities.EligibilityHistory.create({
      subscriber_id: subscriber.id,
      client_id: subscriber.client_id,
      provider_id: provider?.id || "",
      subscriber_name: `${subscriber.first_name || ""} ${subscriber.last_name}`.trim(),
      payer: subscriber.payer || "",
      member_id: subscriber.member_id || "",
      provider_npi: provider?.npi || "",
      service_date: serviceDate,
      coverage_status: data.coverage_status,
      plan_name: data.plan_name,
      plan_type: data.plan_type,
      network_status: data.network_status,
      effective_date: data.effective_date,
      termination_date: data.termination_date,
      deductible_individual_total: findAmt(["30"], "C"),
      deductible_individual_met: findAmt(["30"], "CB"),
      oop_max_individual: findAmt(["30"], "G"),
      copay_pcp: findAmt(["98", "35"], "B"),
      copay_specialist: findAmt(["98", "33"], "B"),
      coinsurance_in: findPct(["30"], "A"),
      confidence_score: data.confidence_score,
      flags_json: JSON.stringify(flags),
      requires_human_review: data.requires_human_review || false,
      raw_response_json: JSON.stringify(data),
      channel_used: data.channel_used,
      response_time_seconds: data.response_time_seconds,
      verified_by: user?.full_name || user?.email || "System",
    });

    // Update subscriber's last coverage status
    await api.entities.Subscriber.update(subscriber.id, {
      last_coverage_status: data.coverage_status,
      last_verified_date: serviceDate,
      last_confidence_score: data.confidence_score,
    });

    setVerifying(false);
    await loadHistory();
    if (onVerified) onVerified();
  };

  const cc = result ? COVERAGE_COLORS[result.coverage_status] || COVERAGE_COLORS.Unknown : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#eef3ff" }}
            >
              <ShieldCheck className="w-5 h-5" style={{ color: "#293682" }} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Eligibility Verification</h3>
              <p className="text-xs text-slate-400">
                {subscriber.first_name} {subscriber.last_name} · {subscriber.payer}
              </p>
            </div>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Subscriber Info */}
          <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-2 text-xs">
            {[
              ["Member ID", subscriber.member_id || "—"],
              ["Payer", subscriber.payer || "—"],
              ["DOB", subscriber.dob || "—"],
              ["Plan Type", subscriber.plan_type || "—"],
              ["Provider NPI", provider?.npi || "—"],
              ["Provider", provider ? `${provider.first_name || ""} ${provider.last_name}` : "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <span className="text-slate-400">{label}: </span>
                <span className="font-semibold text-slate-700">{val}</span>
              </div>
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#293682" }}
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying via n8n gateway...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Run Eligibility Check
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Verification Failed</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Latest Result */}
          {result && (
            <div
              className="rounded-xl border-2 p-4 space-y-3"
              style={{ backgroundColor: cc.bg, borderColor: cc.border }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" style={{ color: cc.text }} />
                  <span className="font-bold text-sm" style={{ color: cc.text }}>
                    {result.coverage_status}
                  </span>
                </div>
                <span
                  className="text-xs font-bold"
                  style={{ color: result.confidence_score >= 80 ? "#15803d" : "#d97706" }}
                >
                  {result.confidence_score}% confidence
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Plan", result.plan_name],
                  ["Network", result.network_status],
                  ["Effective", result.effective_date],
                  ["Terminates", result.termination_date],
                ].map(([l, v]) =>
                  v ? (
                    <div key={l}>
                      <span className="text-slate-500">{l}: </span>
                      <span className="font-semibold text-slate-800">{v}</span>
                    </div>
                  ) : null
                )}
              </div>
              {result.flags?.length > 0 && (
                <div className="space-y-1">
                  {result.flags.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                      <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Verification History
            </h4>
            {loadingHistory ? (
              <div className="py-6 text-center text-slate-400 text-xs">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No verification history yet
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((r, i) => (
                  <HistoryRow key={r.id} record={r} defaultOpen={i === 0 && !result} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
