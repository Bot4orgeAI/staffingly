import { useEntityListQuery } from "@/lib/query";
import { FileText, Calendar, TrendingUp } from "lucide-react";

export default function FinanceDashboardCards() {
  const { data: invoices = [] } = useEntityListQuery("Invoice", { limit: 100 }, null);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const pendingInvoices = invoices.filter((invoice) => {
    const createdAt = new Date(invoice.createdAt);
    return ["DISPUTE_WINDOW", "PENDING"].includes(invoice.status) && createdAt >= startOfWeek;
  });

  const paidThisMonth = invoices.filter((invoice) => {
    const paidAt = invoice.paidAt ? new Date(invoice.paidAt) : null;
    return invoice.status === "PAID" && paidAt && paidAt >= startOfMonth;
  });

  const pendingTotal = pendingInvoices.reduce(
    (sum, invoice) => sum + (invoice.totalAmount || 0),
    0
  );
  const paidTotal = paidThisMonth.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const nextBillingRun = pendingInvoices[0]?.billingPeriodEnd
    ? new Date(
        new Date(pendingInvoices[0].billingPeriodEnd).getTime() + 86400000
      ).toLocaleDateString()
    : "TBD";
  const clientsToBill = new Set(pendingInvoices.map((invoice) => invoice.clientId)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pending Invoices */}
        <div
          className="rounded-2xl p-6 text-white flex flex-col gap-3"
          style={{ backgroundColor: "#b45309" }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-amber-200 text-sm">This Week Pending Invoices</p>
            <p className="text-4xl font-bold mt-1">${pendingTotal.toLocaleString()}</p>
            <p className="text-amber-200 text-xs mt-1">
              {pendingInvoices.length} invoice{pendingInvoices.length === 1 ? "" : "s"} awaiting
              approval
            </p>
          </div>
        </div>

        {/* Revenue */}
        <div
          className="rounded-2xl p-6 text-white flex flex-col gap-3"
          style={{ backgroundColor: "#293682" }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-blue-200 text-sm">This Month Revenue Collected</p>
            <p className="text-4xl font-bold mt-1">${paidTotal.toLocaleString()}</p>
            <p className="text-blue-200 text-xs mt-1">
              {paidThisMonth.length} paid invoice{paidThisMonth.length === 1 ? "" : "s"} this month
            </p>
          </div>
        </div>
      </div>

      {/* Billing Cycle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-800">Billing Cycle Status</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Next Billing Run", value: nextBillingRun },
            { label: "Clients to Bill", value: `${clientsToBill}` },
            { label: "Estimated Total", value: `$${pendingTotal.toLocaleString()}` },
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4">
              <p className="text-lg font-bold text-slate-800">{item.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
