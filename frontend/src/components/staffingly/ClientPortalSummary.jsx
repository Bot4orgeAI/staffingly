import { Briefcase, CheckCircle, XCircle, MessageSquare } from "lucide-react";

export default function ClientPortalSummary({ user: _user }) {
  const stats = [
    { label: "Cases This Month", value: 12, icon: Briefcase, color: "#293682", bg: "#eef3ff" },
    { label: "Approvals", value: 9, icon: CheckCircle, color: "#15803d", bg: "#f0fdf4" },
    { label: "Denials", value: 2, icon: XCircle, color: "#dc2626", bg: "#fef2f2" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{ backgroundColor: s.bg }}
            >
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Message from team */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" style={{ color: "#0a7e87" }} />
          <h3 className="font-bold text-slate-800 text-sm">Message from Your Staffingly Team</h3>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
          <p className="text-sm text-teal-800">
            "Hi! We've submitted 3 new prior auth requests to Aetna this week. Expect responses
            within 3–5 business days. Reach out if you need anything."
          </p>
          <p className="text-xs text-teal-500 mt-2">— Your Specialist Team · Mar 1, 2026</p>
        </div>
      </div>
    </div>
  );
}
