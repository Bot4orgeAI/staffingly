import { Server, CheckCircle } from "lucide-react";

const HEALTH_ITEMS = [
  { label: "Database", value: "Healthy", detail: "99.98% uptime", status: "ok" },
  { label: "API Response", value: "142ms", detail: "avg last 5 min", status: "ok" },
  { label: "Error Rate", value: "0.3%", detail: "last hour", status: "ok" },
  { label: "Active Users", value: "84", detail: "right now", status: "ok" },
];

export default function SystemHealthCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div
        className="flex items-center gap-2 px-5 py-4 border-b border-slate-100"
        style={{ backgroundColor: "#002082" }}
      >
        <Server className="w-4 h-4 text-blue-300" />
        <h3 className="font-bold text-white">System Health</h3>
        <span className="ml-auto text-xs text-blue-300">All systems operational</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
        {HEALTH_ITEMS.map((item, i) => (
          <div key={i} className="text-center p-3 rounded-xl bg-slate-50">
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-800">{item.value}</p>
            <p className="text-xs font-semibold text-slate-600">{item.label}</p>
            <p className="text-[10px] text-slate-400">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
