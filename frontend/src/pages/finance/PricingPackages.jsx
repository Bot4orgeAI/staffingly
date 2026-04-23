import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { BillingAccessDenied, canAccessBilling } from "@/components/billing/BillingAccessGuard";
import { Plus, Edit2, Check, X, Zap, Star, Building2, CreditCard, Settings } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const PKG_ICONS = {
  starter: Zap,
  growth: Star,
  enterprise: Building2,
  pay_as_you_go: CreditCard,
  custom: Settings,
};
const PKG_COLORS = {
  starter: "#6366f1",
  growth: "#10b981",
  enterprise: "#293682",
  pay_as_you_go: "#f6b037",
  custom: "#8b5cf6",
};

function PackageCard({ pkg, onEdit }) {
  const Icon = PKG_ICONS[pkg.package_type] || Settings;
  const color = PKG_COLORS[pkg.package_type] || "#6366f1";
  return (
    <div
      className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      style={{ borderColor: color + "30" }}
    >
      <div className="p-1" style={{ backgroundColor: color }}>
        <div className="flex items-center gap-2 px-4 py-3">
          <Icon className="w-5 h-5 text-white" />
          <h3 className="font-bold text-white text-lg">{pkg.name}</h3>
          {!pkg.is_active && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
              Inactive
            </span>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="text-center">
          <span className="text-4xl font-black text-slate-800">
            ${(pkg.monthly_base_fee || 0).toFixed(0)}
          </span>
          <span className="text-slate-500 text-sm">/mo base</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-slate-50">
            <span className="text-slate-600">Eligibility Checks</span>
            <span className="font-semibold text-slate-800">
              {pkg.unlimited_eligibility ? "Unlimited" : pkg.included_eligibility_checks || 0}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-50">
            <span className="text-slate-600">Prior Auth Submissions</span>
            <span className="font-semibold text-slate-800">
              {pkg.unlimited_prior_auths ? "Unlimited" : pkg.included_prior_auths || 0}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-50">
            <span className="text-slate-600">Appeals</span>
            <span className="font-semibold text-slate-800">
              {pkg.unlimited_appeals ? "Unlimited" : pkg.included_appeals || 0}{" "}
              {pkg.unlimited_appeals ? "" : "free"}
            </span>
          </div>
          {!pkg.unlimited_eligibility && pkg.overage_rate_eligibility > 0 && (
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-600">Eligibility Overage</span>
              <span className="font-semibold text-slate-800">
                ${pkg.overage_rate_eligibility}/ea
              </span>
            </div>
          )}
          {!pkg.unlimited_prior_auths && pkg.overage_rate_prior_auth > 0 && (
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-600">PA Overage</span>
              <span className="font-semibold text-slate-800">
                ${pkg.overage_rate_prior_auth}/ea
              </span>
            </div>
          )}
          {pkg.rate_per_eligibility_check > 0 && (
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-600">Per Eligibility Check</span>
              <span className="font-semibold text-slate-800">
                ${pkg.rate_per_eligibility_check}
              </span>
            </div>
          )}
          {pkg.rate_per_prior_auth > 0 && (
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-600">Per Prior Auth</span>
              <span className="font-semibold text-slate-800">${pkg.rate_per_prior_auth}</span>
            </div>
          )}
          {pkg.rate_per_appeal > 0 && (
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-600">Per Appeal</span>
              <span className="font-semibold text-slate-800">${pkg.rate_per_appeal}</span>
            </div>
          )}
          {pkg.includes_dedicated_account_manager && (
            <div className="flex items-center gap-1.5 text-slate-700 py-1">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              Dedicated Account Manager
            </div>
          )}
        </div>
        {pkg.internal_notes && (
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            {pkg.internal_notes}
          </div>
        )}
        <button
          onClick={() => onEdit(pkg)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-semibold transition-colors hover:text-white"
          style={{ borderColor: color, color: color, ...{ "--hover-bg": color } }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = color;
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.color = color;
          }}
        >
          <Edit2 className="w-4 h-4" /> Edit Package
        </button>
      </div>
    </div>
  );
}

const BLANK_PKG = {
  name: "",
  package_type: "custom",
  monthly_base_fee: 0,
  included_eligibility_checks: 0,
  included_prior_auths: 0,
  included_appeals: 0,
  unlimited_eligibility: false,
  unlimited_prior_auths: false,
  unlimited_appeals: false,
  rate_per_eligibility_check: 0,
  rate_per_prior_auth: 0,
  rate_per_approved_prior_auth: 0,
  rate_per_appeal: 0,
  overage_rate_eligibility: 0,
  overage_rate_prior_auth: 0,
  charge_on_approval: false,
  includes_dedicated_account_manager: false,
  is_active: true,
  internal_notes: "",
  created_by: "",
};

function PackageForm({ initial, onSave, onCancel, userEmail }) {
  const [form, setForm] = useState(initial || BLANK_PKG);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, created_by: userEmail };
    if (form.id) {
      await api.entities.PricingPackage.update(form.id, data);
    } else {
      await api.entities.PricingPackage.create(data);
    }
    onSave();
    setSaving(false);
  };

  const Field = ({ label, k, type = "number", step = "0.01" }) => (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        step={step}
        value={form[k] || ""}
        onChange={(e) =>
          set(k, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)
        }
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
    </div>
  );

  const Toggle = ({ label, k }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!form[k]}
        onChange={(e) => set(k, e.target.checked)}
        className="w-4 h-4 accent-amber-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-800 text-lg">
            {form.id ? "Edit Package" : "New Package"}
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Package Name" k="name" type="text" />
            <div>
              <label className="block text-xs text-slate-500 mb-1">Package Type</label>
              <AppSelect
                value={form.package_type}
                onValueChange={(v) => set("package_type", v)}
                options={["starter", "growth", "enterprise", "pay_as_you_go", "custom"]}
              />
            </div>
          </div>
          <Field label="Monthly Base Fee ($)" k="monthly_base_fee" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Included Eligibility Checks" k="included_eligibility_checks" step="1" />
            <Field label="Included Prior Auths" k="included_prior_auths" step="1" />
            <Field label="Included Appeals" k="included_appeals" step="1" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Toggle label="Unlimited Eligibility" k="unlimited_eligibility" />
            <Toggle label="Unlimited Prior Auths" k="unlimited_prior_auths" />
            <Toggle label="Unlimited Appeals" k="unlimited_appeals" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rate Per Eligibility Check ($)" k="rate_per_eligibility_check" />
            <Field label="Rate Per Prior Auth ($)" k="rate_per_prior_auth" />
            <Field label="Rate Per Appeal ($)" k="rate_per_appeal" />
            <Field label="Rate Per Approved PA ($)" k="rate_per_approved_prior_auth" />
            <Field label="Overage Rate - Eligibility ($)" k="overage_rate_eligibility" />
            <Field label="Overage Rate - Prior Auth ($)" k="overage_rate_prior_auth" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Toggle label="Charge on Approval" k="charge_on_approval" />
            <Toggle label="Dedicated Account Manager" k="includes_dedicated_account_manager" />
            <Toggle label="Active" k="is_active" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Internal Notes</label>
            <textarea
              value={form.internal_notes || ""}
              onChange={(e) => set("internal_notes", e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#f6b037" }}
          >
            {saving ? "Saving..." : "Save Package"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PricingPackages() {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingUser } = useAuthUserQuery();
  const billingEnabled = Boolean(user) && canAccessBilling(user);
  const { data: packages = [], isLoading: loadingPackages } = useEntityListQuery(
    "PricingPackage",
    null,
    null,
    { enabled: billingEnabled }
  );

  const handleEdit = (pkg) => {
    setEditing(pkg);
    setShowForm(true);
  };
  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
  };
  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["entity", "PricingPackage"] });
  };

  if (!user) return null;
  if (!canAccessBilling(user)) return <BillingAccessDenied />;

  return (
    <StaffinglyLayout
      user={user}
      currentPage="pricing-packages"
      title="Pricing Packages"
      breadcrumbs={["Admin", "Pricing"]}
    >
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pricing Packages</h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage client pricing plans, rate structures, and included service volumes.
              </p>
            </div>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-sm"
              style={{ backgroundColor: "#293682" }}
            >
              <Plus className="w-4 h-4" /> New Package
            </button>
          </div>
        </div>

        {loadingUser || loadingPackages ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onEdit={handleEdit} />
            ))}
            {packages.length === 0 && (
              <div className="col-span-3 text-center py-16 text-slate-400">
                No pricing packages yet. Click "New Package" to create your first one.
              </div>
            )}
          </div>
        )}

        {showForm && (
          <PackageForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            userEmail={user?.email}
          />
        )}
      </div>
    </StaffinglyLayout>
  );
}
