import { format } from "date-fns";
import { Crown, Shield, Users, FileText, Building2 } from "lucide-react";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  finance_admin: "Finance Admin",
  staffingly_admin: "Staffingly Admin",
  staffingly_supervisor: "Supervisor",
  staffingly_specialist: "Specialist",
  client_user: "Client User",
};
const ROLE_ICONS = {
  super_admin: Crown,
  finance_admin: FileText,
  staffingly_admin: Shield,
  staffingly_supervisor: Users,
  staffingly_specialist: FileText,
  client_user: Building2,
};
const ROLE_STATUS = {
  super_admin: "Full platform access — all modules active.",
  finance_admin: "3 invoices pending approval this week.",
  staffingly_admin: "12 cases pending your review.",
  staffingly_supervisor: "5 cases need action today across your team.",
  staffingly_specialist: "3 cases due today in your queue.",
  client_user: "2 prior auth requests are awaiting insurer response.",
};

export default function WelcomeCard({ user }) {
  const RoleIcon = ROLE_ICONS[user?.role] || FileText;
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const displayName = user?.name || user?.full_name || user?.email || "there";
  const firstName = displayName.split(" ")[0];

  return (
    <div
      className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
      style={{ backgroundColor: "#002082" }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 flex-shrink-0">
        <RoleIcon className="w-7 h-7" style={{ color: "#f6b037" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-blue-200 text-sm mb-0.5">{today}</p>
        <h2 className="text-white font-bold text-xl leading-tight">Welcome back, {firstName}</h2>
        <p className="text-blue-300 text-sm mt-1">{ROLE_STATUS[user?.role]}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-white">
          {ROLE_LABELS[user?.role] || "User"}
        </span>
        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300">
          ● Session Active
        </span>
      </div>
    </div>
  );
}
