import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  Building2,
  ShieldCheck,
  Settings,
  FileText,
  CreditCard,
  Crown,
  LogOut,
  Activity,
  Bell,
  ClipboardList,
  BookOpen,
  BarChart2,
  DollarSign,
  Briefcase,
  UserCheck,
  Globe,
  Search,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRightIcon,
  UserPlus,
  FileSpreadsheet,
} from "lucide-react";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  finance_admin: "Finance Admin",
  staffingly_admin: "Staffingly Admin",
  staffingly_supervisor: "Supervisor",
  staffingly_specialist: "Specialist",
  client_user: "Client User",
};

const ROLE_COLORS = {
  super_admin: { header: "#002082", badge: "#002082", icon: Crown },
  finance_admin: { header: "#b45309", badge: "#b45309", icon: DollarSign },
  staffingly_admin: { header: "#293682", badge: "#293682", icon: ShieldCheck },
  staffingly_supervisor: { header: "#0a7e87", badge: "#0a7e87", icon: Users },
  staffingly_specialist: { header: "#293682", badge: "#293682", icon: FileText },
  client_user: { header: "#004e4e", badge: "#004e4e", icon: Building2 },
};

const COMMON_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, page: "home" },
  { label: "Patients", icon: UserPlus, page: "patients" },
  { label: "Eligibility", icon: Search, page: "new-verification" },
  { label: "Patient Queue", icon: ClipboardList, page: "roster-queue" },
  { label: "Elig. History", icon: BarChart2, page: "eligibility-history" },
  { label: "Prior Authorization", icon: ClipboardList, page: "prior-auth" },
];

const ROLE_EXTRA_NAV = {
  staffingly_specialist: [
    { label: "My Cases", icon: Briefcase, page: "specialist-case-view" },
    { label: "Roster Import", icon: FileSpreadsheet, page: "roster-import" },
  ],
  staffingly_supervisor: [
    { label: "Approval Queue", icon: ClipboardList, page: "supervisor-approval-queue" },
    { label: "Unmatched Docs", icon: AlertTriangle, page: "unmatched-documents" },
    { label: "Elig. Dashboard", icon: BarChart2, page: "eligibility-dashboard" },
    { label: "Roster Import", icon: FileSpreadsheet, page: "roster-import" },
    { label: "Staff Tracker", icon: UserCheck, page: "staff-tracker" },
    { label: "Automation Queue", icon: Activity, page: "automation-queue" },
    { label: "Payroll", icon: DollarSign, page: "fa-payroll" },
    { label: "Client Management", icon: Building2, page: "sa-clients" },
  ],
  staffingly_admin: [
    { label: "All Clients", icon: Building2, page: "sa-clients" },
    { label: "Payer Rules", icon: Globe, page: "payer-rules" },
    { label: "Unmatched Docs", icon: AlertTriangle, page: "unmatched-documents" },
    { label: "Roster Import", icon: FileSpreadsheet, page: "roster-import" },
    { label: "Sync Logs", icon: Activity, page: "drive-sync-logs" },
    { label: "KB Analytics", icon: BookOpen, page: "knowledge-base-analytics" },
    { label: "User Management", icon: Users, page: "sa-users" },
  ],
  finance_admin: [{ label: "Payroll", icon: DollarSign, page: "fa-payroll" }],
  super_admin: [
    { label: "All Clients", icon: Building2, page: "sa-clients" },
    { label: "Client Branding", icon: Package, page: "client-branding-admin" },
    { label: "Unmatched Docs", icon: AlertTriangle, page: "unmatched-documents" },
    { label: "Roster Import", icon: FileSpreadsheet, page: "roster-import" },
    { label: "KB Analytics", icon: BookOpen, page: "knowledge-base-analytics" },
    { label: "Automation Queue", icon: Activity, page: "automation-queue" },
    { label: "User Management", icon: Users, page: "sa-users" },
    { label: "Billing Dashboard", icon: DollarSign, page: "billing-dashboard" },
    { label: "Pricing Packages", icon: Package, page: "pricing-packages" },
    { label: "System Settings", icon: Settings, page: "settings" },
    { label: "Security Settings", icon: ShieldCheck, page: "sa-security-settings" },
    { label: "Audit Log", icon: Activity, page: "sa-audit-logs" },
  ],
  client_user: [],
};

const FINANCE_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, page: "home" },
  { label: "Billing Dashboard", icon: DollarSign, page: "billing-dashboard" },
  { label: "Pricing Packages", icon: Package, page: "pricing-packages" },
  { label: "Payroll", icon: Briefcase, page: "fa-payroll" },
  { label: "Audit Log", icon: Activity, page: "sa-audit-logs" },
];

const CLIENT_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, page: "client-portal" },
  { label: "Patient Queue", icon: ClipboardList, page: "roster-queue" },
  { label: "My Cases", icon: Briefcase, page: "client-cases" },
  { label: "Reports", icon: BarChart2, page: "client-reports" },
  { label: "Billing", icon: CreditCard, page: "client-billing" },
  { label: "Notifications", icon: Bell, page: "client-notifications" },
];

function buildNav(role) {
  if (role === "finance_admin") return FINANCE_NAV;
  if (role === "client_user") return CLIENT_NAV;
  return [...COMMON_NAV, ...(ROLE_EXTRA_NAV[role] || [])];
}

export default function SidebarNav({ user, currentPage }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!user) return null;

  const normalizedRole = user.role?.toLowerCase();
  const navItems = buildNav(normalizedRole);
  const roleStyle = ROLE_COLORS[normalizedRole] || ROLE_COLORS.staffingly_specialist;
  const RoleIcon = roleStyle.icon;

  return (
    <aside
      className="z-40 h-screen sticky top-0 flex flex-col border-r border-slate-200 bg-white flex-shrink-0 transition-all duration-300"
      style={{ width: collapsed ? 68 : 240 }}
    >
      {/* Logo */}
      <div className="sticky top-0 z-50 px-4 py-4 border-b border-slate-100 bg-white flex items-center gap-2.5 min-h-[64px]">
        <img
          src="/images/logo/staffverify-pictorial-logo.png"
          alt="StaffVerify Logo"
          className="w-9 h-9 flex-shrink-0 object-contain"
        />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm leading-tight">StaffVerify</p>
            <p className="text-[10px] text-slate-400 leading-tight">by Staffingly Inc.</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={
            collapsed
              ? "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors z-50"
              : "w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-100 flex-shrink-0 transition-colors"
          }
        >
          {collapsed ? (
            <ChevronRightIcon className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Role Badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: `${roleStyle.header}12` }}
          >
            <RoleIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: roleStyle.header }} />
            <span className="text-xs font-bold truncate" style={{ color: roleStyle.header }}>
              {ROLE_LABELS[normalizedRole]}
            </span>
            {normalizedRole === "super_admin" && (
              <Crown className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: "#f6b037" }} />
            )}
          </div>
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-3 border-b border-slate-100 flex justify-center">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${roleStyle.header}12` }}
          >
            <RoleIcon className="w-4 h-4" style={{ color: roleStyle.header }} />
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto sidebar-scroll">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link key={item.page} to={createPageUrl(item.page)}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
                style={isActive ? { backgroundColor: roleStyle.header } : {}}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-3 border-t border-slate-100">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 mb-2.5 px-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: roleStyle.header }}
              >
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user.name || "User"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => api.auth.logout()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: roleStyle.header }}
              title={user.name || user.email}
            >
              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
            <button
              onClick={() => api.auth.logout()}
              title="Sign Out"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
