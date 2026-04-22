import { useAuthUserQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import WelcomeCard from "@/components/staffingly/WelcomeCard";
import WorkflowCards from "@/components/staffingly/WorkflowCards";
import MetricCards from "@/components/staffingly/MetricCards";
import RecentActivity from "@/components/staffingly/RecentActivity";
import TeamOverview from "@/components/staffingly/TeamOverview";
import FinanceDashboardCards from "@/components/staffingly/FinanceDashboardCards";
import SystemHealthCard from "@/components/staffingly/SystemHealthCard";
import ClientPortalSummary from "@/components/staffingly/ClientPortalSummary";

export default function Dashboard() {
  const { data: user, isLoading: loading } = useAuthUserQuery({
    select: (u) => ({ ...u, role: u.role === "admin" ? "super_admin" : u.role || "super_admin" }),
  });

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

  const isFinance = user.role === "finance_admin";
  const isSuperAdmin = user.role === "super_admin";
  const isSupervisor = user.role === "staffingly_supervisor";
  const isClientUser = user.role === "client_user";

  return (
    <StaffinglyLayout user={user} currentPage="dashboard" title="Dashboard" breadcrumbs={undefined}>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Welcome */}
        <WelcomeCard user={user} />

        {/* Finance Admin — special layout */}
        {isFinance && (
          <>
            <FinanceDashboardCards />
            <RecentActivity />
          </>
        )}

        {/* Client User — simplified */}
        {isClientUser && <ClientPortalSummary user={user} />}

        {/* All other roles */}
        {!isFinance && !isClientUser && (
          <>
            {/* Workflow entry points */}
            <WorkflowCards eligibilityCount={47} priorAuthCount={18} />

            {/* Metrics row */}
            <MetricCards />

            {/* Supervisor team overview */}
            {isSupervisor && <TeamOverview />}

            {/* Super Admin — team + system health */}
            {isSuperAdmin && (
              <>
                <TeamOverview />
                <SystemHealthCard />
              </>
            )}

            {/* Recent Activity */}
            <RecentActivity />
          </>
        )}
      </div>
    </StaffinglyLayout>
  );
}
