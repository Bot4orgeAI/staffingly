import { useMemo, useState } from "react";
import { createPageUrl } from "@/lib/utils/page";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
import { useAuthUserQuery, useEntityFilterQuery } from "@/lib/query";
import {
  getAccentColor,
  getClientId,
  normalizeBranding,
  normalizeCase,
} from "@/lib/utils/clientPortal";
import { Search, Loader2, ChevronRight } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const STATUS_STYLES = {
  New: { bg: "#f1f5f9", text: "#475569" },
  "In Progress": { bg: "#eff6ff", text: "#1d4ed8" },
  "Awaiting Documents": { bg: "#fffbeb", text: "#92400e" },
  "Ready for Submission": { bg: "#e0f2fe", text: "#0369a1" },
  "Awaiting AI Review": { bg: "#f5f3ff", text: "#6d28d9" },
  "Pending Supervisor Approval": { bg: "#fff7ed", text: "#c2410c" },
  Submitted: { bg: "#f0fdfa", text: "#0f766e" },
  Approved: { bg: "#f0fdf4", text: "#15803d" },
  Denied: { bg: "#fef2f2", text: "#b91c1c" },
  "Appeal In Progress": { bg: "#fff7ed", text: "#9a3412" },
  "Peer To Peer Requested": { bg: "#fdf4ff", text: "#a21caf" },
  Closed: { bg: "#f8fafc", text: "#64748b" },
};

export default function ClientCases() {
  const [search, setSearch] = useState("");
  const params = new URLSearchParams(window.location.search);
  const preFilter = params.get("filter");
  const [filterStatus, setFilterStatus] = useState(preFilter || "All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: user, isLoading: loadingUser } = useAuthUserQuery();
  const clientId = getClientId(user);

  const { data: branding = null, isLoading: loadingBranding } = useEntityFilterQuery(
    "ClientBranding",
    clientId ? { clientId } : {},
    {
      enabled: Boolean(clientId),
      select: (data) => normalizeBranding(data[0] || null),
    }
  );
  const { data: cases = [], isLoading: loadingCases } = useEntityFilterQuery(
    "PriorAuthCase",
    clientId ? { clientId } : {},
    {
      enabled: Boolean(user),
      select: (data) =>
        data
          .map(normalizeCase)
          .sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt).getTime() -
              new Date(a.updatedAt || a.createdAt).getTime()
          ),
    }
  );

  const filtered = useMemo(() => cases.filter((c) => {
    const matchStatus = filterStatus === "All" || c.displayStatus === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (c.caseNumber || c.id)?.toLowerCase().includes(q) ||
      c.patientInitials?.toLowerCase().includes(q) ||
      c.patientName?.toLowerCase().includes(q) ||
      c.payerName?.toLowerCase().includes(q);
    const created = c.createdAt ? new Date(c.createdAt) : null;
    const matchFrom = !dateFrom || (created && created >= new Date(dateFrom));
    const matchTo = !dateTo || (created && created <= new Date(dateTo + "T23:59:59"));
    return matchStatus && matchSearch && matchFrom && matchTo;
  }), [cases, dateFrom, dateTo, filterStatus, search]);

  const loadingState = loadingUser || loadingBranding || loadingCases;

  const accent = getAccentColor(branding);

  if (loadingState)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );

  return (
    <ClientPortalLayout user={user} branding={branding} currentPage="client-cases">
      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Cases</h1>
              <p className="mt-2 text-sm text-slate-500">
                Monitor the status of your submitted prior authorization cases.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Case ID, patient, or payer…"
                className="w-full sm:w-72 pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#0a7e87]"
              />
            </div>
            <AppSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              options={["All", ...Object.keys(STATUS_STYLES)]}
              triggerClassName="h-9 w-[180px] rounded-xl px-3 py-2 text-xs"
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0a7e87]"
              />
              <span className="text-slate-400 text-xs">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0a7e87]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No cases match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "Case ID",
                      "Patient",
                      "Procedure",
                      "Payer",
                      "Status",
                      "Date Submitted",
                      "Last Updated",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const st = STATUS_STYLES[c.displayStatus] || STATUS_STYLES["New"];
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() =>
                          (window.location.href = createPageUrl(`client-case-detail?id=${c.id}`))
                        }
                      >
                        <td className="px-4 py-3 font-bold text-sm" style={{ color: accent }}>
                          {c.caseNumber || c.id?.slice(-6)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-semibold">
                          {c.patientInitials}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[160px] truncate">
                          {c.procedureLabel}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.payerName}</td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: st.bg, color: st.text }}
                          >
                            {c.displayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ClientPortalLayout>
  );
}
