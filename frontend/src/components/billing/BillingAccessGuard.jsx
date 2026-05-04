import { Lock } from "lucide-react";

export function BillingHeader({ title, subtitle }) {
  return (
    <div
      className="rounded-2xl px-6 py-4 mb-6 flex items-center gap-3 shadow-sm"
      style={{ background: "linear-gradient(135deg, #f6b037 0%, #e8960a 100%)" }}
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
        <Lock className="w-5 h-5 text-white" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
      </div>
      <div className="ml-auto px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
        Finance Restricted
      </div>
    </div>
  );
}

export function BillingAccessDenied() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#eef3ff" }}
    >
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#f6b037" }}
        >
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <p className="text-slate-500">
          This section is available to Finance Admin and Super Admin only.
        </p>
      </div>
    </div>
  );
}

export function canAccessBilling(user) {
  const normalizedRole = user?.role?.toLowerCase?.();
  return (
    user &&
    ["finance_admin", "super_admin", "admin", "staffingly_admin"].includes(normalizedRole)
  );
}
