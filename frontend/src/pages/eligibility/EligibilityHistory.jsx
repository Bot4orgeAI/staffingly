import { useState } from "react";
import { useAuthUserQuery, useEntityFilterQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import ConnectionMethodBadge from "@/components/eligibility/ConnectionMethodBadge";
import { Search, Download, Eye, ClipboardList, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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

function HistoryRow({ row, clientName }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_STYLE[row.coverageStatus] || STATUS_STYLE.Unknown;
  const convertedToPa = wasConvertedToPa(row);

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
              → PA Case
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
                <span className="font-mono font-semibold text-slate-700">{row.memberId || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400">Client</span>
                <br />
                <span className="font-semibold text-slate-700">{clientName}</span>
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
              <div className="flex items-end gap-2">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white">
                  <Eye className="w-3 h-3" /> View Full Result
                </button>
                <button
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
  const { data: history = [], isLoading: loadingHistory, isError: historyError } =
    useEntityFilterQuery("EligibilityHistory", {}, { sortBy: "-createdAt", limit: 100 });
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

  return (
    <StaffinglyLayout
      user={user}
      currentPage="eligibility-history"
      title="Eligibility History"
      breadcrumbs={["Eligibility", "History"]}
    >
      <div className="space-y-5 max-w-[1400px] mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Eligibility History</h1>
              <p className="mt-2 text-sm text-slate-500">
                Audit and review all past eligibility verifications across all clients and payers.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Patient name or ID…"
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none w-52"
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
              triggerClassName="w-[140px]"
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
              triggerClassName="w-[160px]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
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
                    "Billing Type",
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
