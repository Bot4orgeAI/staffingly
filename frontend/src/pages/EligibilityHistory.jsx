import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import ConnectionMethodBadge from "@/components/eligibility/ConnectionMethodBadge";
import { Search, Download, Eye, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";

const DUMMY_HISTORY = [
  {
    id: "EL-03891",
    patient: "Sarah J. Mitchell",
    payer: "UnitedHealthcare",
    member_id: "UHC-884720193",
    status: "Active",
    confidence: 94,
    specialist: "Dana Kim",
    method: "Availity",
    response_ms: 3200,
    date: "2026-03-01 09:14",
    converted_to_pa: false,
    client: "Sunrise Family Clinic",
  },
  {
    id: "EL-03890",
    patient: "James R. Holloway",
    payer: "Aetna",
    member_id: "AETNA-562901847",
    status: "Active",
    confidence: 91,
    specialist: "Drew Okafor",
    method: "Direct Payer API",
    response_ms: 1800,
    date: "2026-03-01 08:55",
    converted_to_pa: true,
    client: "Lakeview Orthopedics",
  },
  {
    id: "EL-03889",
    patient: "Robert T. Sanchez",
    payer: "Medicaid",
    member_id: "MCD-112984732",
    status: "Unknown",
    confidence: 58,
    specialist: "Sam Torres",
    method: "Availity",
    response_ms: 4100,
    date: "2026-03-01 08:30",
    converted_to_pa: false,
    client: "Metro Mental Health",
  },
  {
    id: "EL-03888",
    patient: "Linda K. Patel",
    payer: "Blue Cross Blue Shield",
    member_id: "BCBS-774930281",
    status: "Active",
    confidence: 88,
    specialist: "Priya Mehta",
    method: "EMR Integration",
    response_ms: 950,
    date: "2026-03-01 08:10",
    converted_to_pa: false,
    client: "Sunrise Family Clinic",
  },
  {
    id: "EL-03887",
    patient: "Marcus A. Thompson",
    payer: "Medicare",
    member_id: "MBI-4EG9-UA8-YK72",
    status: "Active",
    confidence: 96,
    specialist: "Dana Kim",
    method: "Availity",
    response_ms: 2900,
    date: "2026-02-28 17:45",
    converted_to_pa: true,
    client: "Lakeview Orthopedics",
  },
  {
    id: "EL-03886",
    patient: "Emily R. Carson",
    payer: "Cigna",
    member_id: "CIG-338821904",
    status: "Inactive",
    confidence: 82,
    specialist: "Drew Okafor",
    method: "Portal Automation",
    response_ms: 12400,
    date: "2026-02-28 16:20",
    converted_to_pa: false,
    client: "Metro Mental Health",
  },
];

const STATUS_STYLE = {
  Active: { bg: "#f0fdf4", text: "#15803d" },
  Inactive: { bg: "#fef2f2", text: "#dc2626" },
  Unknown: { bg: "#fffbeb", text: "#b45309" },
};

function HistoryRow({ row }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_STYLE[row.status] || STATUS_STYLE.Unknown;

  return (
    <>
      <tr
        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
          {row.id}
        </td>
        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{row.patient}</td>
        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.payer}</td>
        <td className="px-4 py-3">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: st.bg, color: st.text }}
          >
            {row.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <ConnectionMethodBadge method={row.method} responseTimeMs={row.response_ms} />
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs">{row.specialist}</td>
        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{row.date}</td>
        <td className="px-4 py-3">
          {row.converted_to_pa ? (
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
                <span className="font-mono font-semibold text-slate-700">{row.member_id}</span>
              </div>
              <div>
                <span className="text-slate-400">Client</span>
                <br />
                <span className="font-semibold text-slate-700">{row.client}</span>
              </div>
              <div>
                <span className="text-slate-400">AI Confidence</span>
                <br />
                <span
                  className="font-bold"
                  style={{ color: row.confidence >= 85 ? "#15803d" : "#b45309" }}
                >
                  {row.confidence}%
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
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");

  useEffect(() => {
    api.auth
      .me()
      .then((u) => setUser({ ...u, role: u.role || "staffingly_supervisor" }))
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const filtered = DUMMY_HISTORY.filter((r) => {
    const matchSearch = `${r.patient} ${r.member_id} ${r.id}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchMethod =
      filterMethod === "all" || r.method.toLowerCase().includes(filterMethod.toLowerCase());
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Unknown">Unknown</option>
            </select>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              <option value="all">All Methods</option>
              <option value="Availity">Availity API</option>
              <option value="Direct">Direct Payer API</option>
              <option value="EMR">EMR Integration</option>
              <option value="Portal">Portal Automation</option>
            </select>
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
                {filtered.map((row) => (
                  <HistoryRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {DUMMY_HISTORY.length} records
          </div>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
