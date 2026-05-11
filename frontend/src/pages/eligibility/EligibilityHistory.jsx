import { useState } from "react";
import { useAuthUserQuery, useEntityFilterQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import ConnectionMethodBadge from "@/components/eligibility/ConnectionMethodBadge";
import {
  AlertTriangle,
  CheckCircle,
  Search,
  Download,
  Eye,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const STATUS_STYLE = {
  Active: { label: "Active", bg: "#f0fdf4", text: "#15803d" },
  Inactive: { label: "Inactive", bg: "#fef2f2", text: "#dc2626" },
  Unknown: { label: "Unverified", bg: "#fffbeb", text: "#b45309" },
};

function formatHistoryDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function wasConvertedToPa(row) {
  const flags = (() => {
    if (!row.flagsJson) return [];
    try {
      return JSON.parse(row.flagsJson);
    } catch {
      return [];
    }
  })();

  if (flags.some((flag) => `${flag}`.toLowerCase().includes("converted to prior authorization"))) {
    return true;
  }

  if (!row.rawResponseJson) return false;

  try {
    return Boolean(JSON.parse(row.rawResponseJson)?.convertedToPa);
  } catch {
    return false;
  }
}

function getGatewayResponseMeta(row) {
  if (!row.rawResponseJson) {
    return {
      checkId: null,
      gatewayPatientId: null,
      priorAuthRequired: null,
      submissionType: null,
    };
  }

  try {
    const parsed = JSON.parse(row.rawResponseJson);
    const payload = parsed.response || parsed;
    const routingHeader = parsed.routing_header || parsed.routingHeader || {};

    return {
      checkId: payload.checkId || payload.check_id || null,
      gatewayPatientId:
        payload.gatewayPatientId || payload.gateway_patient_id || parsed.patient_id || null,
      priorAuthRequired:
        payload.priorAuthRequired ??
        payload.prior_auth_required ??
        parsed.prior_auth_required ??
        null,
      submissionType:
        routingHeader.submission_type ||
        routingHeader.submissionType ||
        parsed.submissionType ||
        null,
    };
  } catch {
    return {
      checkId: null,
      gatewayPatientId: null,
      priorAuthRequired: null,
      submissionType: null,
    };
  }
}

function formatRawResult(row) {
  if (!row.rawResponseJson) {
    return "No stored gateway response for this verification.";
  }

  try {
    return JSON.stringify(JSON.parse(row.rawResponseJson), null, 2);
  } catch {
    return row.rawResponseJson;
  }
}

function getHumanReadableResult(row) {
  const flags = (() => {
    if (!row.flagsJson) return [];
    try {
      const parsed = JSON.parse(row.flagsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const gatewayMeta = getGatewayResponseMeta(row);
  const coverageStatus = row.coverageStatus || "Unknown";
  const statusTone = STATUS_STYLE[coverageStatus] || STATUS_STYLE.Unknown;

  const nextSteps = [];
  if (coverageStatus === "Inactive") {
    nextSteps.push("Do not schedule until updated insurance is collected from the patient.");
  } else if (coverageStatus === "Unknown") {
    nextSteps.push("Escalate for manual follow-up before confirming the visit.");
  } else {
    nextSteps.push("Coverage appears active for the requested date of service.");
  }

  if (gatewayMeta.priorAuthRequired === true) {
    nextSteps.push("Tell the care team that prior authorization is required before treatment.");
  }

  if (row.requiresHumanReview) {
    nextSteps.push(
      "A staff member should review this verification before finalizing the appointment."
    );
  }

  return {
    flags,
    gatewayMeta,
    coverageStatus,
    statusTone,
    nextSteps,
  };
}

function SummaryField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value || "—"}</p>
    </div>
  );
}

function escapeCsvValue(value) {
  if (value == null) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatCsvDate(value, { includeTime = false } = {}) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const formatted = includeTime
    ? date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("en-CA");

  // Force spreadsheet apps to keep these as text so they do not render as #######.
  return `="${formatted}"`;
}

function FullResultModal({ row, clientName, onClose }) {
  const resultText = formatRawResult(row);
  const { flags, gatewayMeta, coverageStatus, statusTone, nextSteps } = getHumanReadableResult(row);
  const StatusIcon =
    coverageStatus === "Active"
      ? CheckCircle
      : coverageStatus === "Inactive"
        ? AlertTriangle
        : ShieldCheck;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Eligibility Result
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {row.subscriberName || "Unknown Patient"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {row.payer || "Unknown payer"} · {clientName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div
              className="rounded-3xl border p-5"
              style={{ backgroundColor: statusTone.bg, borderColor: statusTone.text }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/80 p-3">
                    <StatusIcon className="h-6 w-6" style={{ color: statusTone.text }} />
                  </div>
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.18em]"
                      style={{ color: statusTone.text }}
                    >
                      Summary
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">
                      Coverage {coverageStatus}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm text-slate-700">
                      {coverageStatus === "Active"
                        ? "The patient appears eligible for the requested service date. Review any warnings below before final scheduling."
                        : coverageStatus === "Inactive"
                          ? "The patient does not appear eligible on the requested service date. Updated insurance or manual follow-up is needed."
                          : "The verification could not fully confirm eligibility. A manual review is needed before the visit is finalized."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Verification confidence</p>
                  <p className="mt-1 text-2xl font-bold" style={{ color: statusTone.text }}>
                    {row.confidenceScore != null ? `${row.confidenceScore}%` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Coverage Details
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <SummaryField label="Member ID" value={row.memberId} />
                  <SummaryField label="Plan Name" value={row.planName} />
                  <SummaryField label="Plan Type" value={row.planType} />
                    <SummaryField label="Network" value={row.networkStatus} />
                    <SummaryField label="Effective Date" value={row.effectiveDate} />
                    <SummaryField label="Termination Date" value={row.terminationDate} />
                    <SummaryField label="Service Date" value={row.serviceDate} />
                    <SummaryField
                      label="Prior Auth Required"
                      value={
                        gatewayMeta.priorAuthRequired == null
                          ? "Not specified"
                          : gatewayMeta.priorAuthRequired
                            ? "Yes"
                            : "No"
                      }
                    />
                    <SummaryField label="Connection Method" value={row.channelUsed} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Recommended Next Steps
                  </p>
                  <div className="mt-4 space-y-3">
                    {nextSteps.map((step) => (
                      <div
                        key={step}
                        className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3"
                      >
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0a7e87]" />
                        <p className="text-sm text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {flags.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Important Notes
                    </p>
                    <div className="mt-4 space-y-3">
                      {flags.map((flag) => (
                        <div key={flag} className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                          <p className="text-sm text-amber-900">{flag}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Verification Record
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold">History ID:</span> {row.id}
                    </p>
                    <p>
                      <span className="font-semibold">Check ID:</span> {gatewayMeta.checkId || "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Gateway Patient ID:</span>{" "}
                      {gatewayMeta.gatewayPatientId || "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Submission Type:</span>{" "}
                      {gatewayMeta.submissionType || "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Verified By:</span> {row.verifiedBy || "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Created:</span>{" "}
                      {formatHistoryDate(row.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Stored Gateway Response
                  </p>
                  <pre className="mt-3 max-h-[40vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                    <code>{resultText}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ row, clientName, onViewFullResult }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_STYLE[row.coverageStatus] || STATUS_STYLE.Unknown;
  const convertedToPa = wasConvertedToPa(row);
  const gatewayMeta = getGatewayResponseMeta(row);

  return (
    <>
      <tr
        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
          {row.id}
        </td>
        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
          {row.subscriberName || "—"}
        </td>
        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.payer || "—"}</td>
        <td className="px-4 py-3">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: st.bg, color: st.text }}
          >
            {st.label || row.coverageStatus}
          </span>
        </td>
        <td className="px-4 py-3">
          <ConnectionMethodBadge
            method={row.channelUsed || "Unknown"}
            responseTimeMs={row.responseTimeSeconds ? row.responseTimeSeconds * 1000 : null}
          />
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs">{row.verifiedBy || "—"}</td>
        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
          {formatHistoryDate(row.createdAt)}
        </td>
        <td className="px-4 py-3">
          {convertedToPa ? (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
              PA Case
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
              Standalone
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Member ID</span>
                <br />
                <span className="font-mono font-semibold text-slate-700">
                  {row.memberId || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Client</span>
                <br />
                <span className="font-semibold text-slate-700">{clientName}</span>
              </div>
              <div>
                <span className="text-slate-400">Gateway Patient ID</span>
                <br />
                <span className="font-mono font-semibold text-slate-700">
                  {gatewayMeta.gatewayPatientId || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">AI Confidence</span>
                <br />
                <span
                  className="font-bold"
                  style={{ color: row.confidenceScore >= 85 ? "#15803d" : "#b45309" }}
                >
                  {row.confidenceScore ?? "—"}
                  {row.confidenceScore != null ? "%" : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Check ID</span>
                <br />
                <span className="font-mono font-semibold text-slate-700">
                  {gatewayMeta.checkId || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Submission Type</span>
                <br />
                <span className="font-semibold text-slate-700">
                  {gatewayMeta.submissionType || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Service Date</span>
                <br />
                <span className="font-semibold text-slate-700">{row.serviceDate || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400">Prior Auth Required</span>
                <br />
                <span className="font-semibold text-slate-700">
                  {gatewayMeta.priorAuthRequired == null
                    ? "—"
                    : gatewayMeta.priorAuthRequired
                      ? "Yes"
                      : "No"}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewFullResult(row);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white"
                >
                  <Eye className="w-3 h-3" /> View Full Result
                </button>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold"
                  style={{ backgroundColor: "#293682" }}
                >
                  <ClipboardList className="w-3 h-3" /> Start PA
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function EligibilityHistory() {
  const { data: user } = useAuthUserQuery({ withDefaultRole: "staffingly_supervisor" });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [selectedResult, setSelectedResult] = useState(null);
  const {
    data: historyRaw = [],
    isLoading: loadingHistory,
    isError: historyError,
  } = useEntityFilterQuery("EligibilityHistory", {}, { sortBy: "-createdAt", limit: 100 });

  const history = historyRaw;

  const { data: clients = [] } = useEntityListQuery("Client", { limit: 100 }, null, {
    staleTime: 5 * 60 * 1000,
  });

  const clientNames = Object.fromEntries(
    clients.map((client) => [client.id, client.practiceName || client.name || client.id])
  );

  const filtered = history.filter((r) => {
    const matchSearch = `${r.subscriberName || ""} ${r.memberId || ""} ${r.id || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.coverageStatus === filterStatus;
    const matchMethod =
      filterMethod === "all" ||
      (r.channelUsed || "").toLowerCase().includes(filterMethod.toLowerCase());
    return matchSearch && matchStatus && matchMethod;
  });

  const handleExportCsv = () => {
    const headers = [
      "History ID",
      "Patient",
      "Payer",
      "Member ID",
      "Coverage Status",
      "Plan Name",
      "Plan Type",
      "Network Status",
      "Service Date",
      "Effective Date",
      "Termination Date",
      "Prior Auth Required",
      "Confidence Score",
      "Connection Method",
      "Response Time Seconds",
      "Verified By",
      "Created At",
      "Client",
    ];

    const rows = filtered.map((row) => {
      const gatewayMeta = getGatewayResponseMeta(row);
      return [
        row.id,
        row.subscriberName || "",
        row.payer || "",
        row.memberId || "",
        row.coverageStatus || "",
        row.planName || "",
        row.planType || "",
        row.networkStatus || "",
        formatCsvDate(row.serviceDate),
        formatCsvDate(row.effectiveDate),
        formatCsvDate(row.terminationDate),
        gatewayMeta.priorAuthRequired == null
          ? ""
          : gatewayMeta.priorAuthRequired
            ? "Yes"
            : "No",
        row.confidenceScore ?? "",
        row.channelUsed || "",
        row.responseTimeSeconds ?? "",
        row.verifiedBy || "",
        formatCsvDate(row.createdAt, { includeTime: true }),
        clientNames[row.clientId] || row.clientId || "",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `eligibility-history-${dateStamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <StaffinglyLayout
      user={user}
      currentPage="eligibility-history"
      title="Eligibility History"
      breadcrumbs={["Eligibility", "History"]}
    >
      {selectedResult ? (
        <FullResultModal
          row={selectedResult}
          clientName={clientNames[selectedResult.clientId] || selectedResult.clientId || "—"}
          onClose={() => setSelectedResult(null)}
        />
      ) : null}

      <div className="sv-unified-page max-w-[1400px]">
        <div className="sv-page-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Eligibility History</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Audit and review all past eligibility verifications across all clients and payers.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="sv-page-toolbar flex flex-col gap-3 items-start justify-between sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Patient name or ID…"
                className="sv-search-input w-full sm:w-72"
              />
            </div>
            <AppSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              options={[
                { label: "All Status", value: "all" },
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
                { label: "Unknown", value: "Unknown" },
              ]}
              triggerClassName="sv-select-trigger h-9 w-[150px]"
            />
            <AppSelect
              value={filterMethod}
              onValueChange={setFilterMethod}
              options={[
                { label: "All Methods", value: "all" },
                { label: "Availity API", value: "Availity" },
                { label: "Direct Payer API", value: "Direct" },
                { label: "EMR Integration", value: "EMR" },
                { label: "Portal Automation", value: "Portal" },
              ]}
              triggerClassName="sv-select-trigger h-9 w-[180px]"
            />
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="sv-table-card">
          <div className="overflow-x-auto">
            <table className="sv-data-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    "Case ID",
                    "Patient",
                    "Payer",
                    "Status",
                    "Connection Method",
                    "Specialist",
                    "Date",
                    "Workflow Type",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistory && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading eligibility history...
                      </span>
                    </td>
                  </tr>
                )}
                {!loadingHistory && historyError && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-red-500">
                      Unable to load eligibility history from the backend.
                    </td>
                  </tr>
                )}
                {!loadingHistory && !historyError && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      No eligibility history matched your filters.
                    </td>
                  </tr>
                )}
                {!loadingHistory &&
                  !historyError &&
                  filtered.map((row) => (
                    <HistoryRow
                      key={row.id}
                      row={row}
                      clientName={clientNames[row.clientId] || row.clientId || "—"}
                      onViewFullResult={setSelectedResult}
                    />
                  ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {history.length} records
          </div>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
