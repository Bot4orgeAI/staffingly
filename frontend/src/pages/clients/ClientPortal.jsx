import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
import { CheckCircle, XCircle, Clock, Loader2, ChevronRight, Bell, Upload } from "lucide-react";

const STATUS_STYLES = {
  New: { bg: "#f1f5f9", text: "#475569" },
  "In Progress": { bg: "#eff6ff", text: "#1d4ed8" },
  "Awaiting Documents": { bg: "#fffbeb", text: "#92400e" },
  "Awaiting AI Review": { bg: "#f5f3ff", text: "#6d28d9" },
  "Pending Supervisor Approval": { bg: "#fff7ed", text: "#c2410c" },
  Submitted: { bg: "#f0fdfa", text: "#0f766e" },
  Approved: { bg: "#f0fdf4", text: "#15803d" },
  Denied: { bg: "#fef2f2", text: "#b91c1c" },
  "Appeal In Progress": { bg: "#fff7ed", text: "#9a3412" },
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
  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState(null);
  const [cases, setCases] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(async (u) => {
        setUser(u);
        const [bData, cData, mData, nData] = await Promise.all([
          api.entities.ClientBranding.filter({ client_id: u.id }).catch(() => []),
          api.entities.PriorAuthCase.filter({ client_id: u.id }),
          api.entities.CaseMessage.filter({ client_id: u.id, read_by_client: false }),
          api.entities.ClientNotification.filter({ client_id: u.id, read: false }),
        ]);
        setBranding(bData[0] || null);
        setCases(cData);
        setMessages(mData);
        setNotifications(nData);
        setLoading(false);
      })
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const accent = branding?.accent_color || "#293682";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthCases = cases.filter((c) => new Date(c.created_date) >= monthStart);
  const approved = cases.filter((c) => c.status === "Approved");
  const denied = cases.filter((c) => c.status === "Denied");
  const inProgress = cases.filter((c) => !["Approved", "Denied", "Closed"].includes(c.status));
  const awaitingDocs = cases.filter((c) => c.status === "Awaiting Documents");

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
            sub={denied.filter((c) => c.appeal_submitted_at).length + " appeals filed"}
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
                    const st = STATUS_STYLES[c.status] || STATUS_STYLES["New"];
                    return (
                      <Link key={c.id} to={createPageUrl(`ClientCaseDetail?id=${c.id}`)}>
                        <tr className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-bold text-sm" style={{ color: accent }}>
                            {c.case_id || c.id?.slice(-6)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{c.patient_initials}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{c.procedure_name}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{c.payer_name}</td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                              style={{ backgroundColor: st.bg, color: st.text }}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {c.updated_date ? new Date(c.updated_date).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      </Link>
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
