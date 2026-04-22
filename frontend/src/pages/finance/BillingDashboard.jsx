import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import {
  BillingHeader,
  BillingAccessDenied,
  canAccessBilling,
} from "@/components/billing/BillingAccessGuard";
import MetricCard from "@/components/billing/MetricCard";
import InvoiceStatusBadge from "@/components/billing/InvoiceStatusBadge";
import DisputeTimer from "@/components/billing/DisputeTimer";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  Eye,
  RefreshCw,
  ExternalLink,
  PauseCircle,
  Download,
} from "lucide-react";
import { createPageUrl } from "@/lib/utils/page";
import { Link } from "react-router-dom";
import AppSelect from "@/components/ui/app-select";

export default function BillingDashboard() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState({});
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingUser } = useAuthUserQuery();
  const billingEnabled = Boolean(user) && canAccessBilling(user);
  const { data: profiles = [], isLoading: loadingProfiles } = useEntityListQuery(
    "BillingProfile",
    null,
    null,
    { enabled: billingEnabled }
  );
  const { data: invoices = [], isLoading: loadingInvoices } = useEntityListQuery(
    "ClientInvoice",
    "-created_date",
    200,
    { enabled: billingEnabled }
  );

  const invalidateBilling = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["entity", "BillingProfile"] }),
      queryClient.invalidateQueries({ queryKey: ["entity", "ClientInvoice"] }),
    ]);
  };

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { weekRevenue, mtdRevenue, disputeWindowCount, failedCount } = useMemo(
    () => ({
      weekRevenue: invoices
        .filter((i) => i.status === "paid" && i.paid_at && new Date(i.paid_at) >= weekStart)
        .reduce((s, i) => s + (i.total_amount || 0), 0),
      mtdRevenue: invoices
        .filter((i) => i.status === "paid" && i.paid_at && new Date(i.paid_at) >= monthStart)
        .reduce((s, i) => s + (i.total_amount || 0), 0),
      disputeWindowCount: invoices.filter((i) => i.status === "dispute_window").length,
      failedCount: invoices.filter((i) => i.status === "payment_failed").length,
    }),
    [invoices, monthStart, weekStart]
  );

  const filteredInvoices =
    statusFilter === "all" ? invoices : invoices.filter((i) => i.status === statusFilter);

  const handleRetryCharge = async (invoiceId) => {
    setActionLoading((prev) => ({ ...prev, [invoiceId]: true }));
    await api.functions.invoke("stripeChargeInvoice", { invoice_id: invoiceId });
    await invalidateBilling();
    setActionLoading((prev) => ({ ...prev, [invoiceId]: false }));
  };

  const handleCardUpdateLink = async (clientId) => {
    setActionLoading((prev) => ({ ...prev, [clientId]: "card" }));
    const res = await api.functions.invoke("stripeSendCardUpdateLink", { client_id: clientId });
    if (res.data?.url) window.open(res.data.url, "_blank");
    setActionLoading((prev) => ({ ...prev, [clientId]: false }));
  };

  const handlePauseBilling = async (profileId, paused) => {
    await api.entities.BillingProfile.update(profileId, { billing_paused: !paused });
    await invalidateBilling();
  };

  if (!user) return null;
  if (!canAccessBilling(user)) return <BillingAccessDenied />;

  const exportCSV = () => {
    const rows = [
      ["Client", "Invoice #", "Period Start", "Period End", "Status", "Total", "Paid At"],
    ];
    filteredInvoices.forEach((inv) => {
      rows.push([
        inv.client_name,
        inv.invoice_number,
        inv.billing_period_start,
        inv.billing_period_end,
        inv.status,
        inv.total_amount,
        inv.paid_at || "",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `billing-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <StaffinglyLayout
      user={user}
      currentPage="billing-dashboard"
      title="Billing Dashboard"
      breadcrumbs={["Billing"]}
    >
      <div className="max-w-[1400px] mx-auto space-y-6">
        <BillingHeader
          title="Billing Dashboard"
          subtitle="Automated billing, invoicing & payment management"
        />

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Revenue This Week"
            value={`$${weekRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            accent="#f6b037"
          />
          <MetricCard
            label="Dispute Windows Open"
            value={disputeWindowCount}
            sub="Auto-charge pending"
            icon={Clock}
            accent="#f59e0b"
          />
          <MetricCard
            label="Failed Payments"
            value={failedCount}
            sub="Requires action"
            icon={AlertTriangle}
            accent="#ef4444"
          />
          <MetricCard
            label="MTD Revenue"
            value={`$${mtdRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            accent="#10b981"
          />
        </div>

        {/* Table Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Client Billing</h2>
            <div className="flex items-center gap-2">
              <AppSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { label: "All Statuses", value: "all" },
                  { label: "Dispute Window", value: "dispute_window" },
                  { label: "Disputed", value: "disputed" },
                  { label: "Paid", value: "paid" },
                  { label: "Payment Failed", value: "payment_failed" },
                  { label: "Draft", value: "draft" },
                ]}
                triggerClassName="w-[180px]"
              />
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {loadingUser || loadingProfiles || loadingInvoices ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Client
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Invoice #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Total
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Dispute Window
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.slice(0, 50).map((inv) => {
                    const profile = profiles.find((p) => p.client_id === inv.client_id);
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{inv.client_name}</div>
                          {profile?.account_flagged && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                              FLAGGED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{inv.invoice_number}</td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          ${(inv.total_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {inv.status === "dispute_window" && inv.dispute_window_closes_at ? (
                            <DisputeTimer closesAt={inv.dispute_window_closes_at} />
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Link
                              to={`${createPageUrl("client-billing-profile")}?client_id=${inv.client_id}`}
                            >
                              <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 hover:bg-slate-50 text-slate-600">
                                <Eye className="w-3 h-3" /> View
                              </button>
                            </Link>
                            {inv.status === "payment_failed" && (
                              <button
                                onClick={() => handleRetryCharge(inv.id)}
                                disabled={actionLoading[inv.id]}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700"
                              >
                                <RefreshCw className="w-3 h-3" /> Retry
                              </button>
                            )}
                            {profile && (
                              <>
                                <button
                                  onClick={() => handleCardUpdateLink(inv.client_id)}
                                  disabled={actionLoading[inv.client_id] === "card"}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 hover:bg-slate-50 text-slate-600"
                                >
                                  <ExternalLink className="w-3 h-3" /> Card Link
                                </button>
                                <button
                                  onClick={() =>
                                    handlePauseBilling(profile.id, profile.billing_paused)
                                  }
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 hover:bg-slate-50 text-slate-600"
                                >
                                  <PauseCircle className="w-3 h-3" />{" "}
                                  {profile.billing_paused ? "Resume" : "Pause"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        No invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StaffinglyLayout>
  );
}
