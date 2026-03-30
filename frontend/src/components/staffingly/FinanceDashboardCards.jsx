import { FileText, Calendar, TrendingUp } from "lucide-react";

export default function FinanceDashboardCards() {
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
            <p className="text-4xl font-bold mt-1">$84,320</p>
            <p className="text-amber-200 text-xs mt-1">14 invoices awaiting approval</p>
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
            <p className="text-4xl font-bold mt-1">$241,850</p>
            <p className="text-blue-200 text-xs mt-1">↑ 12% vs last month</p>
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
            { label: "Next Billing Run", value: "Mar 5, 2026" },
            { label: "Clients to Bill", value: "48" },
            { label: "Estimated Total", value: "$98,400" },
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
