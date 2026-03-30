import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { createPageUrl } from "@/lib/utils/page";
import { Users, Trophy, Loader2, Flag, ToggleLeft, ToggleRight } from "lucide-react";

const ALLOWED_ROLES = ["staffingly_supervisor", "staffingly_admin", "super_admin"];

const STATUS_COLORS = {
  New: "#94a3b8",
  "In Progress": "#3b82f6",
  "Awaiting Documents": "#f59e0b",
  Submitted: "#0a7e87",
  Approved: "#15803d",
  Denied: "#dc2626",
  "Appeal In Progress": "#f97316",
  Closed: "#64748b",
};

// SLA targets in business days
const SLA_TARGETS = {
  urgent: 2,
  standard: 5,
};

function daysBetween(a, b) {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function SpecialistCard({ specialist, cases, onClick }) {
  const openCases = cases.filter((c) => !["Approved", "Denied", "Closed"].includes(c.status));
  const closedThisMonth = cases.filter((c) => {
    const now = new Date();
    const cd = new Date(c.updated_date || c.created_date);
    return (
      ["Approved", "Denied", "Closed"].includes(c.status) &&
      cd.getMonth() === now.getMonth() &&
      cd.getFullYear() === now.getFullYear()
    );
  });
  const approvedThisMonth = closedThisMonth.filter((c) => c.status === "Approved");
  const approvalRate =
    closedThisMonth.length > 0
      ? Math.round((approvedThisMonth.length / closedThisMonth.length) * 100)
      : null;
  const submitted = cases.filter((c) => c.submission_timestamp);
  const avgDays =
    submitted.length > 0
      ? Math.round(
          submitted.reduce((s, c) => s + daysBetween(c.created_date, c.submission_timestamp), 0) /
            submitted.length
        )
      : null;
  const isOverloaded = openCases.length > 30;
  const capacity = Math.min(100, Math.round((openCases.length / 35) * 100));

  // SLA compliance
  const completedWithSLA = cases.filter(
    (c) => ["Approved", "Denied", "Closed"].includes(c.status) && c.submission_timestamp
  );
  const slaCompliant = completedWithSLA.filter((c) => {
    const target = c.urgency === "Urgent" ? SLA_TARGETS.urgent : SLA_TARGETS.standard;
    return daysBetween(c.created_date, c.submission_timestamp) <= target;
  });
  const slaRate =
    completedWithSLA.length > 0
      ? Math.round((slaCompliant.length / completedWithSLA.length) * 100)
      : null;

  const statusCounts = {};
  openCases.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border-2 p-5 cursor-pointer hover:shadow-md transition-all ${isOverloaded ? "border-red-300" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: "#293682" }}
          >
            {specialist.full_name?.charAt(0) || specialist.email?.charAt(0) || "S"}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">
              {specialist.full_name || specialist.email}
            </p>
            <p className="text-[10px] text-slate-400">Specialist</p>
          </div>
        </div>
        {isOverloaded && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
            <Flag className="w-3 h-3" /> Overloaded
          </span>
        )}
      </div>

      {/* Open Cases Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500 font-medium">Open Cases</span>
          <span className={`font-bold ${isOverloaded ? "text-red-600" : "text-slate-700"}`}>
            {openCases.length}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${capacity}%`, backgroundColor: isOverloaded ? "#dc2626" : "#293682" }}
          />
        </div>
      </div>

      {/* Status dots */}
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <span
            key={status}
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-600"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] || "#94a3b8" }}
            />
            {count} {status.split(" ")[0]}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">{closedThisMonth.length}</p>
          <p className="text-[10px] text-slate-400">Closed/Mo</p>
        </div>
        <div className="text-center">
          <p
            className="text-sm font-bold"
            style={{
              color: approvalRate >= 80 ? "#15803d" : approvalRate != null ? "#d97706" : "#94a3b8",
            }}
          >
            {approvalRate != null ? `${approvalRate}%` : "—"}
          </p>
          <p className="text-[10px] text-slate-400">Approval</p>
        </div>
        <div className="text-center">
          <p
            className="text-sm font-bold"
            style={{ color: slaRate >= 80 ? "#15803d" : slaRate != null ? "#d97706" : "#94a3b8" }}
          >
            {slaRate != null ? `${slaRate}%` : "—"}
          </p>
          <p className="text-[10px] text-slate-400">SLA</p>
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ specialists, casesBySpecialist }) {
  const ranked = specialists
    .map((s) => {
      const cases = casesBySpecialist[s.id] || [];
      const now = new Date();
      const closed = cases.filter((c) => {
        const cd = new Date(c.updated_date || c.created_date);
        return (
          ["Approved", "Denied", "Closed"].includes(c.status) &&
          cd.getMonth() === now.getMonth() &&
          cd.getFullYear() === now.getFullYear()
        );
      });
      const approved = closed.filter((c) => c.status === "Approved");
      return {
        ...s,
        closedCount: closed.length,
        approvalRate: closed.length > 0 ? Math.round((approved.length / closed.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.closedCount - a.closedCount || b.approvalRate - a.approvalRate);

  const podiumColors = ["#f6b037", "#94a3b8", "#b45309"];
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-slate-800">Monthly Leaderboard</h3>
        <span className="text-xs text-slate-400 ml-auto">
          Resets{" "}
          {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
        </span>
      </div>

      {/* Podium */}
      {ranked.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {ranked.slice(0, 3).map((s, i) => (
            <div
              key={s.id}
              className="text-center p-4 rounded-xl border-2"
              style={{ borderColor: podiumColors[i], backgroundColor: `${podiumColors[i]}10` }}
            >
              <p className="text-2xl mb-1">{medals[i]}</p>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-2"
                style={{ backgroundColor: podiumColors[i] }}
              >
                {s.full_name?.charAt(0) || "S"}
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">
                {s.full_name?.split(" ")[0] || "Specialist"}
              </p>
              <p className="text-lg font-bold mt-1" style={{ color: podiumColors[i] }}>
                {s.closedCount}
              </p>
              <p className="text-[10px] text-slate-400">cases closed</p>
              <p className="text-xs font-semibold text-slate-600">{s.approvalRate}% approval</p>
            </div>
          ))}
        </div>
      )}

      {/* Rest of table */}
      {ranked.length > 3 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-2 text-left text-[11px] text-slate-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="py-2 text-left text-[11px] text-slate-400 uppercase tracking-wider">
                Specialist
              </th>
              <th className="py-2 text-right text-[11px] text-slate-400 uppercase tracking-wider">
                Closed
              </th>
              <th className="py-2 text-right text-[11px] text-slate-400 uppercase tracking-wider">
                Approval
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(3).map((s, i) => (
              <tr key={s.id} className="border-b border-slate-50">
                <td className="py-2 text-slate-500 font-bold">#{i + 4}</td>
                <td className="py-2 font-semibold text-slate-700">{s.full_name || s.email}</td>
                <td className="py-2 text-right font-bold text-slate-800">{s.closedCount}</td>
                <td
                  className="py-2 text-right font-semibold"
                  style={{ color: s.approvalRate >= 80 ? "#15803d" : "#d97706" }}
                >
                  {s.approvalRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function StaffTracker() {
  const [user, setUser] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);

  useEffect(() => {
    api.auth
      .me()
      .then(async (u) => {
        setUser(u);
        const [users, cases] = await Promise.all([
          api.entities.StaffinglyUser.filter({ role: "staffingly_specialist" }),
          api.entities.PriorAuthCase.list(),
        ]);
        setSpecialists(users);
        setAllCases(cases);
        setLoading(false);
      })
      .catch(() => api.auth.redirectToLogin());
  }, []);

  if (loading)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="staff-tracker"
        title="Staff Tracker"
        breadcrumbs={["Staff Tracker"]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      </StaffinglyLayout>
    );

  if (!ALLOWED_ROLES.includes(user?.role))
    return (
      <StaffinglyLayout
        user={user}
        currentPage="staff-tracker"
        title="Staff Tracker"
        breadcrumbs={["Staff Tracker"]}
      >
        <div className="text-center p-12 text-slate-400">Access restricted.</div>
      </StaffinglyLayout>
    );

  const casesBySpecialist = {};
  specialists.forEach((s) => {
    casesBySpecialist[s.id] = [];
  });
  allCases.forEach((c) => {
    if (c.assigned_specialist_id && casesBySpecialist[c.assigned_specialist_id]) {
      casesBySpecialist[c.assigned_specialist_id].push(c);
    }
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.toDateString();

  const totalOpen = allCases.filter(
    (c) => !["Approved", "Denied", "Closed"].includes(c.status)
  ).length;
  const submittedToday = allCases.filter(
    (c) => c.submission_timestamp && new Date(c.submission_timestamp).toDateString() === today
  ).length;
  const closedThisMonth = allCases.filter(
    (c) =>
      ["Approved", "Denied", "Closed"].includes(c.status) &&
      new Date(c.updated_date || c.created_date) >= monthStart
  );
  const approvedThisMonth = closedThisMonth.filter((c) => c.status === "Approved");
  const teamApprovalRate =
    closedThisMonth.length > 0
      ? Math.round((approvedThisMonth.length / closedThisMonth.length) * 100)
      : 0;
  const submitted = allCases.filter((c) => c.submission_timestamp);
  const avgDaysToSubmit =
    submitted.length > 0
      ? Math.round(
          submitted.reduce((s, c) => s + daysBetween(c.created_date, c.submission_timestamp), 0) /
            submitted.length
        )
      : null;
  const overloadedCount = specialists.filter(
    (s) =>
      (casesBySpecialist[s.id] || []).filter(
        (c) => !["Approved", "Denied", "Closed"].includes(c.status)
      ).length > 30
  ).length;

  const summaryCards = [
    {
      label: "Total Open Cases",
      value: totalOpen,
      sub: "across all specialists",
      color: "#293682",
    },
    { label: "Submitted Today", value: submittedToday, sub: "cases", color: "#0a7e87" },
    {
      label: "Team Approval Rate",
      value: `${teamApprovalRate}%`,
      sub: "this month",
      color: "#15803d",
    },
    {
      label: "Avg Days to Submit",
      value: avgDaysToSubmit != null ? `${avgDaysToSubmit}d` : "—",
      sub: "business days",
      color: "#7c3aed",
    },
    {
      label: "Overloaded Specialists",
      value: overloadedCount,
      sub: ">30 open cases",
      color: overloadedCount > 0 ? "#dc2626" : "#15803d",
      alert: overloadedCount > 0,
    },
  ];

  return (
    <StaffinglyLayout
      user={user}
      currentPage="staff-tracker"
      title="Staff Tracker"
      breadcrumbs={["Staff Tracker"]}
    >
      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`bg-white rounded-2xl border-2 p-4 ${card.alert ? "border-red-300" : "border-slate-200"}`}
            >
              <p className="text-2xl font-bold" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{card.label}</p>
              <p className="text-xs text-slate-400">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">Specialist Performance</h2>
          <button
            onClick={() => setShowLeaderboard((l) => !l)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {showLeaderboard ? (
              <ToggleRight className="w-4 h-4 text-amber-500" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
            Leaderboard
          </button>
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <Leaderboard specialists={specialists} casesBySpecialist={casesBySpecialist} />
        )}

        {/* Specialist Grid */}
        {specialists.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            No specialists found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {specialists.map((s) => (
              <SpecialistCard
                key={s.id}
                specialist={s}
                cases={casesBySpecialist[s.id] || []}
                onClick={() =>
                  (window.location.href = createPageUrl(
                    `SpecialistCaseView?specialist_id=${s.id}&specialist_name=${encodeURIComponent(s.full_name || s.email)}`
                  ))
                }
              />
            ))}
          </div>
        )}
      </div>
    </StaffinglyLayout>
  );
}
