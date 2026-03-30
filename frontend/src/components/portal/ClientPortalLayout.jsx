import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Bell,
  CreditCard,
  LogOut,
  ShieldCheck,
  Menu,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, page: "client-portal" },
  { label: "My Cases", icon: Briefcase, page: "client-cases" },
  { label: "Reports", icon: FileText, page: "client-reports" },
  { label: "Billing", icon: CreditCard, page: "client-billing" },
  { label: "Notifications", icon: Bell, page: "client-notifications" },
];

export default function ClientPortalLayout({
  user,
  branding,
  currentPage,
  children,
  notifCount = 0,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const accent = branding?.accent_color || "#293682";
  const practiceName = branding?.practice_name || user?.practice_name || "Your Practice";
  const logoUrl = branding?.logo_url;

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Practice Header */}
        <div className="px-5 py-5 border-b border-slate-100">
          {logoUrl ? (
            <img src={logoUrl} alt={practiceName} className="h-10 object-contain mb-2" />
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: accent }}
              >
                {practiceName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm leading-tight truncate">
                  {practiceName}
                </p>
                <p className="text-[11px] text-slate-400">Client Portal</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setMobileOpen(false)}
              >
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${isActive ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  style={isActive ? { backgroundColor: accent } : {}}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.page === "ClientNotifications" && notifCount > 0 && (
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? "bg-white/30 text-white" : "bg-red-500 text-white"}`}
                    >
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: accent }}
            >
              {user?.full_name?.charAt(0) || "C"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => api.auth.logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* Powered by Staffingly */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#293682" }} />
          <span className="text-[10px] text-slate-400">
            Powered by{" "}
            <span className="font-bold" style={{ color: "#293682" }}>
              Staffingly.AI
            </span>
          </span>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"
            >
              <Menu className="w-4 h-4 text-slate-600" />
            </button>
            <p className="font-bold text-slate-800 text-sm">{practiceName}</p>
          </div>
        </div>
        <main className="flex-1 p-5 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
