import { useMemo, useState } from "react";
import { eachDayOfInterval, format } from "date-fns";
import { Activity, CheckCircle, Clock3, ShieldAlert } from "lucide-react";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import WelcomeCard from "@/components/staffingly/WelcomeCard";
import WorkflowCards from "@/components/staffingly/WorkflowCards";
import RecentActivity from "@/components/staffingly/RecentActivity";
import TeamOverview from "@/components/staffingly/TeamOverview";
import FinanceDashboardCards from "@/components/staffingly/FinanceDashboardCards";
import ClientPortalSummary from "@/components/staffingly/ClientPortalSummary";
import DashboardFilterBar from "@/components/staffingly/DashboardFilterBar";
import DashboardKpiRibbon from "@/components/staffingly/DashboardKpiRibbon";
import DashboardReportingGrid from "@/components/staffingly/DashboardReportingGrid";
import {
  DATE_RANGE_OPTIONS,
  categorizeIssue,
  formatPercent,
  formatSeconds,
  formatWaitingTime,
  getClientId,
  getClientName,
  getCurrentRange,
  getExceptionPriority,
  getPatientName,
  getPayerName,
  getPreviousRange,
  getTimeOfDayBucket,
  isInDateRange,
} from "@/lib/utils/dashboard";

function getPerformanceDelta(currentValue, previousValue, lowerIsBetter = false) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return { delta: 0, direction: "flat" };
  }

  const rawDelta = currentValue - previousValue;
  if (Math.abs(rawDelta) < 0.05) {
    return { delta: 0, direction: "flat" };
  }

  const improved = lowerIsBetter ? rawDelta < 0 : rawDelta > 0;
  return {
    delta: Math.abs(rawDelta),
    direction: improved ? "up" : "down",
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createHistoryFilter(range, clientFilter, payerFilter) {
  return (record) => {
    const matchesClient = clientFilter === "all" || getClientId(record) === clientFilter;
    const matchesPayer = payerFilter === "all" || getPayerName(record) === payerFilter;
    return matchesClient && matchesPayer && isInDateRange(record.createdAt, range);
  };
}

function createCaseFilter(range, clientFilter, payerFilter) {
  return (record) => {
    const eventDate = record.submittedAt || record.updatedAt || record.createdAt;
    const matchesClient = clientFilter === "all" || getClientId(record) === clientFilter;
    const matchesPayer = payerFilter === "all" || getPayerName(record) === payerFilter;
    return matchesClient && matchesPayer && isInDateRange(eventDate, range);
  };
}

function getVerificationRate(records) {
  if (!records.length) return 0;
  const completed = records.filter(
    (record) => record.coverageStatus && record.coverageStatus !== "Unknown"
  ).length;
  return (completed / records.length) * 100;
}

function getAverageResponseTime(records) {
  const responseTimes = records
    .map((record) => Number(record.responseTimeSeconds))
    .filter((value) => Number.isFinite(value) && value > 0);
  return average(responseTimes);
}

function getEligibilityDenialRate(records) {
  if (!records.length) return 0;
  const denialRiskCount = records.filter(
    (record) =>
      record.coverageStatus === "Inactive" || categorizeIssue(record) === "Coverage termination"
  ).length;
  return (denialRiskCount / records.length) * 100;
}

function getAutomationSuccessRate(records) {
  if (!records.length) return 0;
  const automated = records.filter((record) => !record.requiresHumanReview).length;
  return (automated / records.length) * 100;
}

function buildExceptionQueue(records, clientNames) {
  return records
    .filter(
      (record) =>
        record.requiresHumanReview ||
        record.coverageStatus !== "Active" ||
        (record.confidenceScore != null && record.confidenceScore < 75)
    )
    .map((record) => ({
      id: record.id,
      patient: getPatientName(record),
      payer: getPayerName(record),
      client: getClientName(record, clientNames),
      errorType: categorizeIssue(record),
      waiting: formatWaitingTime(record.createdAt),
      priority: getExceptionPriority(record),
      createdAt: record.createdAt,
    }))
    .sort((a, b) => {
      const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDelta = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, 8);
}

function buildVolumeTrend(records, range) {
  const exceptionsByDay = new Map();
  const verificationsByDay = new Map();

  records.forEach((record) => {
    const date = new Date(record.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = format(date, "yyyy-MM-dd");
    verificationsByDay.set(key, (verificationsByDay.get(key) || 0) + 1);

    if (
      record.requiresHumanReview ||
      record.coverageStatus !== "Active" ||
      (record.confidenceScore != null && record.confidenceScore < 75)
    ) {
      exceptionsByDay.set(key, (exceptionsByDay.get(key) || 0) + 1);
    }
  });

  return eachDayOfInterval(range).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      label: format(day, range.start.getMonth() === range.end.getMonth() ? "MMM d" : "MM/dd"),
      verifications: verificationsByDay.get(key) || 0,
      exceptions: exceptionsByDay.get(key) || 0,
    };
  });
}

function buildHeatmapRows(records) {
  const payerBuckets = records.reduce((acc, record) => {
    const payer = getPayerName(record);
    const responseTime = Number(record.responseTimeSeconds);
    if (!Number.isFinite(responseTime) || responseTime <= 0) return acc;

    if (!acc[payer]) {
      acc[payer] = {
        payer,
        volume: 0,
        Night: [],
        Morning: [],
        Afternoon: [],
        Evening: [],
      };
    }

    const bucket = getTimeOfDayBucket(record.createdAt);
    acc[payer].volume += 1;
    if (acc[payer][bucket]) {
      acc[payer][bucket].push(responseTime);
    }
    return acc;
  }, {});

  return Object.values(payerBuckets)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map((row) => ({
      payer: row.payer,
      Night: average(row.Night),
      Morning: average(row.Morning),
      Afternoon: average(row.Afternoon),
      Evening: average(row.Evening),
    }));
}

function buildDenialReasons(records) {
  const counts = records.reduce((acc, record) => {
    if (
      !record.requiresHumanReview &&
      record.coverageStatus === "Active" &&
      (record.confidenceScore == null || record.confidenceScore >= 75)
    ) {
      return acc;
    }

    const issue = categorizeIssue(record);
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function buildPayerPerformance(records) {
  return Object.values(
    records.reduce((acc, record) => {
      const payer = getPayerName(record);
      if (!acc[payer]) {
        acc[payer] = {
          payer,
          volume: 0,
          activeCount: 0,
          automatedCount: 0,
          exceptionCount: 0,
          responseTimes: [],
        };
      }

      const row = acc[payer];
      row.volume += 1;
      if (record.coverageStatus === "Active") row.activeCount += 1;
      if (!record.requiresHumanReview) row.automatedCount += 1;
      if (
        record.requiresHumanReview ||
        record.coverageStatus !== "Active" ||
        (record.confidenceScore != null && record.confidenceScore < 75)
      ) {
        row.exceptionCount += 1;
      }
      if (
        Number.isFinite(Number(record.responseTimeSeconds)) &&
        Number(record.responseTimeSeconds) > 0
      ) {
        row.responseTimes.push(Number(record.responseTimeSeconds));
      }
      return acc;
    }, {})
  )
    .map((row) => ({
      payer: row.payer,
      volume: row.volume,
      avgResponse: average(row.responseTimes),
      activeRate: row.volume ? (row.activeCount / row.volume) * 100 : 0,
      automationRate: row.volume ? (row.automatedCount / row.volume) * 100 : 0,
      exceptionCount: row.exceptionCount,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 6);
}

export default function Dashboard() {
  const [range, setRange] = useState("30d");
  const [clientFilter, setClientFilter] = useState("all");
  const [payerFilter, setPayerFilter] = useState("all");

  const { data: user, isLoading: loading } = useAuthUserQuery({
    select: (u) => ({ ...u, role: u.role === "admin" ? "super_admin" : u.role || "super_admin" }),
  });
  const { data: eligibilityHistory = [] } = useEntityListQuery(
    "EligibilityHistory",
    { limit: 500 },
    null
  );
  const { data: priorAuthCases = [] } = useEntityListQuery(
    "PriorAuthCase",
    { page: 1, limit: 500 },
    null
  );
  const { data: clients = [] } = useEntityListQuery("Client", { limit: 250 }, null);

  const clientNames = useMemo(
    () =>
      Object.fromEntries(
        clients.map((client) => [client.id, client.practiceName || client.name || client.id])
      ),
    [clients]
  );

  const isFinance = user?.role === "finance_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const isSupervisor = user?.role === "staffingly_supervisor";
  const isClientUser = user?.role === "client_user";
  const showOperationalDashboard = !isFinance && !isClientUser;
  const effectiveClientFilter = user?.clientId ? user.clientId : clientFilter;

  const clientOptions = useMemo(() => {
    const uniqueOptions = clients
      .map((client) => ({
        label: client.practiceName || client.name || client.id,
        value: client.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ label: "All organizations", value: "all" }, ...uniqueOptions];
  }, [clients]);

  const payerOptions = useMemo(() => {
    const values = new Set([
      ...eligibilityHistory.map((record) => getPayerName(record)),
      ...priorAuthCases.map((record) => getPayerName(record)),
    ]);

    return [
      { label: "All payers", value: "all" },
      ...Array.from(values)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ label: value, value })),
    ];
  }, [eligibilityHistory, priorAuthCases]);

  const currentRange = useMemo(() => getCurrentRange(range), [range]);
  const previousRange = useMemo(() => getPreviousRange(range), [range]);
  const todayRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const filteredHistory = useMemo(
    () =>
      eligibilityHistory.filter(
        createHistoryFilter(currentRange, effectiveClientFilter, payerFilter)
      ),
    [eligibilityHistory, currentRange, effectiveClientFilter, payerFilter]
  );

  const previousHistory = useMemo(
    () =>
      eligibilityHistory.filter(
        createHistoryFilter(previousRange, effectiveClientFilter, payerFilter)
      ),
    [eligibilityHistory, previousRange, effectiveClientFilter, payerFilter]
  );

  const filteredPriorAuthCases = useMemo(
    () => priorAuthCases.filter(createCaseFilter(currentRange, effectiveClientFilter, payerFilter)),
    [priorAuthCases, currentRange, effectiveClientFilter, payerFilter]
  );

  const operationalMetrics = useMemo(() => {
    const verificationRate = getVerificationRate(filteredHistory);
    const averageResponseTime = getAverageResponseTime(filteredHistory);
    const eligibilityDenialRate = getEligibilityDenialRate(filteredHistory);
    const automationSuccessRate = getAutomationSuccessRate(filteredHistory);

    const previousVerificationRate = getVerificationRate(previousHistory);
    const previousAverageResponseTime = getAverageResponseTime(previousHistory);
    const previousEligibilityDenialRate = getEligibilityDenialRate(previousHistory);
    const previousAutomationSuccessRate = getAutomationSuccessRate(previousHistory);

    const verificationDelta = getPerformanceDelta(verificationRate, previousVerificationRate);
    const responseDelta = getPerformanceDelta(
      averageResponseTime,
      previousAverageResponseTime,
      true
    );
    const denialDelta = getPerformanceDelta(previousEligibilityDenialRate, eligibilityDenialRate);
    const automationDelta = getPerformanceDelta(
      automationSuccessRate,
      previousAutomationSuccessRate
    );

    return [
      {
        label: "Verification rate",
        value: formatPercent(verificationRate),
        helper: `${filteredHistory.length} verifications in scope`,
        delta: verificationDelta.delta,
        direction: verificationDelta.direction,
        deltaSuffix: "%",
        icon: Activity,
        color: "#293682",
        bg: "#eef3ff",
      },
      {
        label: "Average response time",
        value: formatSeconds(averageResponseTime),
        helper: filteredHistory.length
          ? `Previous window ${formatSeconds(previousAverageResponseTime)}`
          : "Waiting for response-time data",
        delta: responseDelta.delta,
        direction: responseDelta.direction,
        deltaSuffix: "s",
        icon: Clock3,
        color: "#0a7e87",
        bg: "#eefaf9",
      },
      {
        label: "Eligibility denial rate",
        value: formatPercent(eligibilityDenialRate),
        helper: `${filteredHistory.filter((record) => record.coverageStatus === "Inactive").length} inactive coverage findings`,
        delta: denialDelta.delta,
        direction: denialDelta.direction,
        deltaSuffix: "%",
        icon: ShieldAlert,
        color: "#dc2626",
        bg: "#fef2f2",
      },
      {
        label: "Automation success rate",
        value: formatPercent(automationSuccessRate),
        helper: `${filteredHistory.filter((record) => !record.requiresHumanReview).length} checks completed without review`,
        delta: automationDelta.delta,
        direction: automationDelta.direction,
        deltaSuffix: "%",
        icon: CheckCircle,
        color: "#15803d",
        bg: "#f0fdf4",
      },
    ];
  }, [filteredHistory, previousHistory]);

  const exceptionQueue = useMemo(
    () => buildExceptionQueue(filteredHistory, clientNames),
    [filteredHistory, clientNames]
  );

  const volumeTrend = useMemo(
    () => buildVolumeTrend(filteredHistory, currentRange),
    [filteredHistory, currentRange]
  );

  const heatmapRows = useMemo(() => buildHeatmapRows(filteredHistory), [filteredHistory]);
  const denialReasons = useMemo(() => buildDenialReasons(filteredHistory), [filteredHistory]);
  const payerPerformance = useMemo(() => buildPayerPerformance(filteredHistory), [filteredHistory]);

  const executiveStats = useMemo(() => {
    const automatedCount = filteredHistory.filter((record) => !record.requiresHumanReview).length;
    const activeCoverageRate =
      filteredHistory.length > 0
        ? (filteredHistory.filter((record) => record.coverageStatus === "Active").length /
            filteredHistory.length) *
          100
        : 0;
    const staffMembers = new Set(
      filteredHistory
        .map(
          (record) =>
            record.verifiedBy ||
            record.assignedSpecialist?.name ||
            record.assignedSpecialistName ||
            null
        )
        .filter(Boolean)
    );
    const productivity = staffMembers.size ? filteredHistory.length / staffMembers.size : 0;
    const approvedCases = filteredPriorAuthCases.filter(
      (record) => record.status === "APPROVED"
    ).length;

    return [
      {
        label: "Monthly cost savings",
        value: `$${(automatedCount * 4).toLocaleString()}`,
        subtext: "Using PRD automated vs manual verification benchmark",
      },
      {
        label: "Active coverage rate",
        value: formatPercent(activeCoverageRate),
        subtext: "Share of verifications that returned active coverage",
      },
      {
        label: "Exception queue depth",
        value: `${exceptionQueue.length}`,
        subtext: "Records that need human action in the current scope",
      },
      {
        label: "Staff productivity",
        value: `${productivity.toFixed(1)} / specialist`,
        subtext: `${approvedCases} prior auth approvals and ${filteredHistory.length} verifications in range`,
      },
    ];
  }, [exceptionQueue.length, filteredHistory, filteredPriorAuthCases]);

  const eligibilityToday = eligibilityHistory.filter((item) =>
    isInDateRange(item.createdAt, todayRange)
  ).length;
  const priorAuthToday = priorAuthCases.filter((item) =>
    isInDateRange(item.createdAt, todayRange)
  ).length;

  if (loading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#eef3ff" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ backgroundColor: "#293682" }}
          >
            <div className="w-6 h-6 bg-white/50 rounded" />
          </div>
          <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <StaffinglyLayout user={user} currentPage="dashboard" title="Dashboard" breadcrumbs={undefined}>
      <div className="mx-auto max-w-[1400px] space-y-5">
        <WelcomeCard user={user} />

        {isFinance && (
          <>
            <FinanceDashboardCards />
            <RecentActivity />
          </>
        )}

        {isClientUser && <ClientPortalSummary user={user} />}

        {showOperationalDashboard && (
          <>
            <DashboardFilterBar
              range={range}
              onRangeChange={setRange}
              clientFilter={effectiveClientFilter}
              onClientFilterChange={setClientFilter}
              payerFilter={payerFilter}
              onPayerFilterChange={setPayerFilter}
              dateRangeOptions={DATE_RANGE_OPTIONS}
              clientOptions={clientOptions}
              payerOptions={payerOptions}
              hideClientFilter={Boolean(user.clientId)}
            />

            <WorkflowCards eligibilityCount={eligibilityToday} priorAuthCount={priorAuthToday} />

            <DashboardKpiRibbon metrics={operationalMetrics} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              {executiveStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.subtext}</p>
                </div>
              ))}
            </div>

            <DashboardReportingGrid
              volumeTrend={volumeTrend}
              heatmapRows={heatmapRows}
              denialReasons={denialReasons}
              exceptionQueue={exceptionQueue}
            />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-bold text-slate-900">Payer performance scorecard</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Response speed, automation success, and exception pressure by payer.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Payer
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Volume
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Avg response
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Active rate
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Automation
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Exceptions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payerPerformance.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-400">
                            No payer performance data in the selected range.
                          </td>
                        </tr>
                      ) : (
                        payerPerformance.map((row) => (
                          <tr key={row.payer} className="hover:bg-slate-50/50">
                            <td className="px-5 py-4 font-semibold text-slate-800">{row.payer}</td>
                            <td className="px-5 py-4 text-slate-600">{row.volume}</td>
                            <td className="px-5 py-4 text-slate-600">
                              {formatSeconds(row.avgResponse)}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {formatPercent(row.activeRate)}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {formatPercent(row.automationRate)}
                            </td>
                            <td className="px-5 py-4 text-slate-600">{row.exceptionCount}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {(isSupervisor || isSuperAdmin) && <TeamOverview />}
            </div>

            <RecentActivity />
          </>
        )}
      </div>
    </StaffinglyLayout>
  );
}
