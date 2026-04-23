import { useEntityListQuery } from "@/lib/query";
import { Briefcase, CheckCircle, XCircle, MessageSquare } from "lucide-react";

export default function ClientPortalSummary({ user }) {
  const { data: cases = [] } = useEntityListQuery(
    "PriorAuthCase",
    { page: 1, limit: 100, clientId: user?.clientId || "" },
    null,
    { enabled: Boolean(user?.clientId) }
  );
  const { data: messages = [] } = useEntityListQuery(
    "CaseMessage",
    { clientId: user?.clientId || "", limit: 20 },
    null,
    { enabled: Boolean(user?.clientId) }
  );

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthCases = cases.filter((item) => new Date(item.createdAt) >= startOfMonth);
  const approvals = monthCases.filter((item) => item.status === "APPROVED").length;
  const denials = monthCases.filter((item) => item.status === "DENIED").length;
  const latestMessage = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  const stats = [
    {
      label: "Cases This Month",
      value: monthCases.length,
      icon: Briefcase,
      color: "#293682",
      bg: "#eef3ff",
    },
    { label: "Approvals", value: approvals, icon: CheckCircle, color: "#15803d", bg: "#f0fdf4" },
    { label: "Denials", value: denials, icon: XCircle, color: "#dc2626", bg: "#fef2f2" },
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
            {latestMessage?.message ||
              "Your Staffingly updates will appear here as soon as your team posts one."}
          </p>
          <p className="text-xs text-teal-500 mt-2">
            — {latestMessage?.senderName || "Your Specialist Team"} ·{" "}
            {latestMessage?.createdAt
              ? new Date(latestMessage.createdAt).toLocaleDateString()
              : "No messages yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
