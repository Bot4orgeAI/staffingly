import { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
import { useAuthUserQuery, useEntityFilterQuery } from "@/lib/query";
import {
  getAccentColor,
  getClientId,
  normalizeBranding,
  normalizeCase,
  normalizeMessage,
  normalizeNotification,
} from "@/lib/utils/clientPortal";
import { CheckCircle, XCircle, Clock, Loader2, ChevronRight, Bell, Upload } from "lucide-react";

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

function StatCard({
  label,
  value,
  sub = null,
  icon: Icon = null,
  accent = "#293682",
  ring = false,
  ringValue = 0,
  ringMax = 0,
}) {
  const pct = ringMax > 0 ? Math.round((ringValue / ringMax) * 100) : 0;
  const r = 28,
    circ = 2 * Math.PI * r;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      {ring ? (
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke={accent}
              strokeWidth="5"
              strokeDasharray={circ}
              strokeDashoffset={circ - (circ * pct) / 100}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: accent }}>
              {pct}%
            </span>
          </div>
        </div>
      ) : (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
      )}
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ClientPortal() {
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
      select: (data) => data.map(normalizeCase),
    }
  );
  const { data: messages = [], isLoading: loadingMessages } = useEntityFilterQuery(
    "CaseMessage",
    clientId ? { clientId, readByClient: false } : {},
    {
      enabled: Boolean(user),
      select: (data) => data.map(normalizeMessage),
    }
  );
  const { data: notifications = [], isLoading: loadingNotifications } = useEntityFilterQuery(
    "ClientNotification",
    clientId ? { clientId, read: false } : {},
    {
      enabled: Boolean(user),
      select: (data) => data.map(normalizeNotification),
    }
  );

  const loading =
    loadingUser || loadingBranding || loadingCases || loadingMessages || loadingNotifications;

  const accent = getAccentColor(branding);

  const { thisMonthCases, approved, denied, inProgress, awaitingDocs } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      thisMonthCases: cases.filter((c) => c.createdAt && new Date(c.createdAt) >= monthStart),
      approved: cases.filter((c) => c.displayStatus === "Approved"),
      denied: cases.filter((c) => c.displayStatus === "Denied"),
      inProgress: cases.filter((c) => !["Approved", "Denied", "Closed"].includes(c.displayStatus)),
      awaitingDocs: cases.filter((c) => c.displayStatus === "Awaiting Documents"),
    };
  }, [cases]);

  const unreadNotifs = notifications.length;

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );

  return (
    <ClientPortalLayout
      user={user}
      branding={branding}
      currentPage="client-portal"
      notifCount={unreadNotifs}
    >
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">Here's your practice overview.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Cases This Month"
            value={thisMonthCases.length}
            accent={accent}
            ring
            ringValue={thisMonthCases.length}
            ringMax={Math.max(thisMonthCases.length, 10)}
            sub={`${cases.length} total`}
          />
          <StatCard
            label="Cases Approved"
            value={approved.length}
            accent="#15803d"
            icon={CheckCircle}
            sub={
              cases.length > 0
                ? `${Math.round((approved.length / cases.length) * 100)}% approval rate`
                : "No cases yet"
            }
          />
          <StatCard
            label="Cases Denied"
            value={denied.length}
            accent="#b91c1c"
            icon={XCircle}
            sub={denied.filter((c) => c.appealSubmittedAt).length + " appeals filed"}
          />
          <StatCard
            label="In Progress"
            value={inProgress.length}
            accent={accent}
            icon={Clock}
            sub={
              awaitingDocs.length > 0
                ? `${awaitingDocs.length} awaiting your documents`
                : "All on track"
            }
          />
        </div>

        {/* Alerts */}
        {(awaitingDocs.length > 0 || messages.length > 0) && (
          <div className="space-y-3">
            {awaitingDocs.length > 0 && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                <Upload className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-800 text-sm">
                    {awaitingDocs.length} case{awaitingDocs.length > 1 ? "s" : ""} need additional
                    documents
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    The Staffingly team is waiting for documents from you. Please upload them as
                    soon as possible.
                  </p>
                </div>
                <Link to={createPageUrl("client-cases?filter=Awaiting Documents")}>
                  <button className="text-xs font-bold px-3 py-1.5 rounded-lg text-amber-800 bg-amber-200 hover:bg-amber-300 whitespace-nowrap">
                    View Cases
                  </button>
                </Link>
              </div>
            )}
            {messages.length > 0 && (
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-blue-800 text-sm">
                    {messages.length} unread message{messages.length > 1 ? "s" : ""} from Staffingly
                    Team
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Your care team has responded to your cases.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Cases */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Cases</h3>
            <Link to={createPageUrl("client-cases")}>
              <button
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: accent }}
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
          {cases.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No cases yet. Your Staffingly team will create cases as prior authorizations are
              submitted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Case ID", "Patient", "Procedure", "Payer", "Status", "Last Updated"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cases.slice(0, 8).map((c) => {
                    const st = STATUS_STYLES[c.displayStatus] || STATUS_STYLES["New"];
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() =>
                          (window.location.href = createPageUrl(`client-case-detail?id=${c.id}`))
                        }
                      >
                        <td className="px-4 py-3 font-bold text-sm" style={{ color: accent }}>
                          {c.caseNumber || c.id?.slice(-6)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.patientInitials}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.procedureLabel}</td>
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
                          {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}
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
