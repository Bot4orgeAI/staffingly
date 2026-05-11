import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ShieldCheck, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";

const FIELD_HELP = [
  {
    label: "Client ID",
    key: "AVAILITY_CLIENT_ID",
    hint: "Found in your Availity Developer Portal app settings.",
  },
  {
    label: "Client Secret",
    key: "AVAILITY_CLIENT_SECRET",
    hint: "Treat this like a password — never share it.",
    type: "password",
  },
];

export default function AvailityApiSection({ statusData = null }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const environmentRows = useMemo(
    () => [
      ["Token URL", statusData?.tokenUrl || "https://api.availity.com/availity/v1/token"],
      [
        "Eligibility API URL",
        statusData?.eligibilityUrl || "https://api.availity.com/availity/v1/coverages",
      ],
      ["Auth Method", statusData?.authMethod || "OAuth 2.0 Client Credentials (scope: hipaa)"],
      ["Transaction Type", "EDI 270 / 271 (Real-Time Eligibility)"],
      ["Provider NPI", "Configurable per request"],
    ],
    [statusData]
  );

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.functions.invoke("availityEligibility", {
        patient_name: "Test Patient",
        dob: "01/01/1980",
        member_id: "TEST123",
        payer_id: "87726",
        provider_npi: "1234567890",
        service_date: new Date().toISOString().split("T")[0],
        service_type_code: "30",
      });
      const data = res.data;
      if (
        data?.error?.includes("token") ||
        data?.error?.includes("401") ||
        data?.error?.includes("Availity")
      ) {
        setTestResult({
          success: false,
          message: data.error || "Authentication failed — check your Client ID and Secret.",
        });
      } else {
        setTestResult({
          success: true,
          message: "Connection successful — Availity API is reachable and credentials are valid.",
        });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || "Connection failed." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Status Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#eef3ff" }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: "#293682" }} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Availity Real-Time Eligibility</h3>
            <p className="text-xs text-slate-500">EDI 270/271 transactions via Availity REST API</p>
          </div>
          <span
            className={`ml-auto rounded-full border px-3 py-1 text-xs font-bold ${
              statusData?.configured === false
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {statusData?.configured === false ? "Needs Credentials" : "Configured"}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
          <p className="font-semibold text-slate-700 mb-1">How it works</p>
          <ul className="space-y-1.5 list-disc list-inside text-xs">
            <li>
              When a verification is submitted, the app calls the Availity Eligibility API in real
              time.
            </li>
            <li>Availity routes the request to the appropriate payer using the EDI Payer ID.</li>
            <li>The payer returns a 271 response with coverage, benefits, and deductible data.</li>
            <li>Results are normalized and a confidence score is calculated automatically.</li>
            <li>Low-confidence responses (&lt;75%) are automatically flagged for human review.</li>
          </ul>
        </div>
      </div>

      {/* Credentials (read-only display — set via secrets) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-700 text-sm mb-1">API Credentials</h3>
        <p className="text-xs text-slate-400 mb-4">
          Credentials are stored as encrypted secrets. To update them, contact your administrator or
          use the platform's Secrets Manager.
        </p>
        <div className="space-y-3">
          {FIELD_HELP.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                {f.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  type={f.type || "text"}
                  value={f.type === "password" ? "••••••••••••••••" : `${f.key} (stored as secret)`}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-500 focus:outline-none"
                />
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 whitespace-nowrap">
                  <CheckCircle className="w-3 h-3" /> Set
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{f.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Environment */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-700 text-sm mb-3">Environment Settings</h3>
        <div className="space-y-3 text-sm">
          {environmentRows.map(([label, val]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">{label}</span>
              <span className="font-mono text-xs text-slate-700 text-right max-w-xs truncate">
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Test Connection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-700 text-sm mb-2">Test Connection</h3>
        <p className="text-xs text-slate-400 mb-4">
          Sends a test request to Availity to verify credentials and API reachability.
        </p>
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
          style={{ backgroundColor: "#293682" }}
        >
          {testing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {testing ? "Testing..." : "Test Connection"}
        </button>

        {testResult && (
          <div
            className={`mt-4 flex items-start gap-3 p-3 rounded-xl border ${testResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
          >
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm font-medium ${testResult.success ? "text-emerald-700" : "text-red-700"}`}
            >
              {testResult.message}
            </p>
          </div>
        )}
      </div>

      {/* Get Credentials CTA */}
      <div className="rounded-xl p-4 border-2 border-dashed border-slate-200 text-center text-sm text-slate-500">
        Don't have Availity API credentials?{" "}
        <a
          href="https://developer.availity.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
          style={{ color: "#293682" }}
        >
          Register at developer.availity.com →
        </a>
      </div>
    </div>
  );
}
