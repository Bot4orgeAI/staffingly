import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { BillingAccessDenied, canAccessBilling } from "@/components/billing/BillingAccessGuard";
import { Plus, Edit2, Check, X, CreditCard, Lock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

function PackageCard({ pkg, canManage, onEdit }) {
  const color = "#293682";
  const featureItems = [
    {
      label: "Eligibility Checks",
      value: pkg.unlimitedEligibility ? "Unlimited" : pkg.includedEligibilityChecks || 0,
    },
    {
      label: "Prior Auth Submissions",
      value: pkg.unlimitedPriorAuths ? "Unlimited" : pkg.includedPriorAuths || 0,
    },
    {
      label: "Appeals",
      value: pkg.unlimitedAppeals ? "Unlimited" : `${pkg.includedAppeals || 0} free`,
    },
  ];

  const rateItems = [
    !pkg.unlimitedEligibility && pkg.overageRateEligibility > 0
      ? { label: "Eligibility Overage", value: `$${pkg.overageRateEligibility}/ea` }
      : null,
    !pkg.unlimitedPriorAuths && pkg.overageRatePriorAuth > 0
      ? { label: "PA Overage", value: `$${pkg.overageRatePriorAuth}/ea` }
      : null,
    pkg.ratePerEligibilityCheck > 0
      ? { label: "Per Eligibility Check", value: `$${pkg.ratePerEligibilityCheck}` }
      : null,
    pkg.ratePerPriorAuth > 0 ? { label: "Per Prior Auth", value: `$${pkg.ratePerPriorAuth}` } : null,
    pkg.ratePerAppeal > 0 ? { label: "Per Appeal", value: `$${pkg.ratePerAppeal}` } : null,
  ].filter(Boolean);

  return (
    <div
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
      style={{ borderColor: color + "30" }}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: color + "15", color }}
            >
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{pkg.name}</h3>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Pricing Package
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              pkg.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {pkg.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1 text-slate-900">
              <span className="text-sm font-semibold">$</span>
              <span className="text-4xl font-black leading-none">{(pkg.monthlyBaseFee || 0).toFixed(0)}</span>
              <span className="text-sm font-medium text-slate-500">/mo</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Base monthly fee</p>
          </div>
          {pkg.chargeOnApproval && (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Approved PA pricing
            </span>
          )}
        </div>

        {pkg.description && <p className="mt-4 text-sm leading-6 text-slate-600">{pkg.description}</p>}

        <div className="mt-5 space-y-3">
          {featureItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <span className="text-sm text-slate-600">{item.label}</span>
              <span className="text-sm font-semibold text-slate-900">{item.value}</span>
            </div>
          ))}
        </div>

        {rateItems.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Usage Rates
            </p>
            <div className="mt-3 space-y-2">
              {rateItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pkg.chargeOnApproval && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            Approved prior authorizations are charged separately.
          </div>
        )}

        <div className="mt-auto pt-5">
          {canManage ? (
            <button
              onClick={() => onEdit(pkg)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <span className="inline-flex items-center gap-2">
                <Edit2 className="h-4 w-4" /> Edit Package
              </span>
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-400">
              <Lock className="h-4 w-4" /> View only
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const BLANK_PKG = {
  name: "",
  description: "",
  monthlyBaseFee: 0,
  includedEligibilityChecks: 0,
  includedPriorAuths: 0,
  includedAppeals: 0,
  unlimitedEligibility: false,
  unlimitedPriorAuths: false,
  unlimitedAppeals: false,
  ratePerEligibilityCheck: 0,
  ratePerPriorAuth: 0,
  ratePerApprovedPriorAuth: 0,
  ratePerAppeal: 0,
  overageRateEligibility: 0,
  overageRatePriorAuth: 0,
  chargeOnApproval: false,
  isActive: true,
};

function FieldShell({ label, children, detail }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      {children}
      {detail ? <p className="mt-1.5 text-xs text-slate-400">{detail}</p> : null}
    </div>
  );
}

function SectionCard({ title, detail, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
      </div>
      {children}
    </section>
  );
}

function PackageForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || BLANK_PKG);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError("");
      if (form.id) {
        await api.entities.PricingPackage.update(form.id, form);
      } else {
        await api.entities.PricingPackage.create(form);
      }
        toast({
          title: form.id ? "Package updated" : "Package created",
          description: `${form.name} is ready to use.`,
          variant: "success",
        });
      onSave();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Please try again.";
      setSaveError(message);
        toast({
          title: "Unable to save package",
          description: message,
          variant: "error",
        });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, k, type = "number", step = "0.01" }) => (
    <FieldShell label={label}>
      <Input
        type={type}
        step={step}
        value={form[k] || ""}
        onChange={(e) =>
          set(k, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)
        }
        className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus-visible:ring-0 focus:border-slate-300"
      />
    </FieldShell>
  );

  const Toggle = ({ label, detail, k }) => (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
      </div>
      <Switch
        checked={!!form[k]}
        onCheckedChange={(checked) => set(k, checked)}
        className="data-[state=checked]:bg-[#293682]"
      />
    </div>
  );

  return (
    <motion.div
      className="fixed inset-0 z-[60]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button
        type="button"
        aria-label="Close pricing package editor"
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <motion.div
        initial={{ x: "100%", opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.9 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-gradient-to-br from-[#f7f9ff] via-white to-[#eef3ff] px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#293682]">
                Pricing Management
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">
                {form.id ? "Edit Package" : "Create Package"}
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Configure base pricing, included service volume, and any overage rules for this
                package.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/60 px-6 py-6">
          {saveError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {saveError}
            </div>
          ) : null}

          <SectionCard
            title="Package Identity"
            detail="The high-level information used to identify and present this package."
          >
            <div className="grid grid-cols-1 gap-4">
              <Field label="Package Name" k="name" type="text" />
              <div>
                <FieldShell
                  label="Description"
                  detail="A short summary that appears on the pricing card."
                >
                  <textarea
                    value={form.description || ""}
                    onChange={(e) => set("description", e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                  />
                </FieldShell>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Base Pricing"
            detail="Set the recurring monthly fee and any individual service charges."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Monthly Base Fee ($)" k="monthlyBaseFee" />
              <Field label="Rate Per Approved PA ($)" k="ratePerApprovedPriorAuth" />
              <Field label="Rate Per Eligibility Check ($)" k="ratePerEligibilityCheck" />
              <Field label="Rate Per Prior Auth ($)" k="ratePerPriorAuth" />
              <Field label="Rate Per Appeal ($)" k="ratePerAppeal" />
            </div>
          </SectionCard>

          <SectionCard
            title="Included Volume"
            detail="Define how much activity is bundled before overage pricing applies."
          >
            <div className="grid grid-cols-1 gap-4">
              <Field label="Included Eligibility Checks" k="includedEligibilityChecks" step="1" />
              <Field label="Included Prior Auths" k="includedPriorAuths" step="1" />
              <Field label="Included Appeals" k="includedAppeals" step="1" />
            </div>
            <div className="mt-5 space-y-3">
              <Toggle
                label="Unlimited Eligibility"
                detail="Disable volume limits for eligibility checks."
                k="unlimitedEligibility"
              />
              <Toggle
                label="Unlimited Prior Auths"
                detail="Allow unlimited prior authorization submissions."
                k="unlimitedPriorAuths"
              />
              <Toggle
                label="Unlimited Appeals"
                detail="Allow unlimited appeals without usage caps."
                k="unlimitedAppeals"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Overage Rules"
            detail="Optional rates that apply when a package exceeds its included volume."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Overage Rate - Eligibility ($)" k="overageRateEligibility" />
              <Field label="Overage Rate - Prior Auth ($)" k="overageRatePriorAuth" />
            </div>
          </SectionCard>

          <SectionCard
            title="Package Status"
            detail="Control whether this package is active and whether approved PA pricing applies."
          >
            <div className="space-y-3">
              <Toggle
                label="Charge on Approval"
                detail="Bill approved prior authorizations separately using the approved PA rate."
                k="chargeOnApproval"
              />
              <Toggle
                label="Active"
                detail="Inactive packages remain visible but should not be assigned to new clients."
                k="isActive"
              />
            </div>
          </SectionCard>
        </div>

        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/10 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#293682" }}
          >
            {saving ? "Saving..." : form.id ? "Update Package" : "Create Package"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PricingPackages() {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingUser } = useAuthUserQuery();
  const billingEnabled = Boolean(user) && canAccessBilling(user);
  const normalizedRole = user?.role?.toLowerCase?.();
  const canManagePackages = ["finance_admin", "super_admin", "admin"].includes(normalizedRole);
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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (showForm) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showForm]);

  if (!user) return null;
  if (!canAccessBilling(user)) return <BillingAccessDenied />;

  return (
    <StaffinglyLayout
      user={user}
      currentPage="pricing-packages"
      title="Pricing Packages"
      breadcrumbs={["Admin", "Pricing"]}
    >
      <div className="sv-unified-page max-w-[1400px] space-y-6">
        <div className="sv-page-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Pricing Packages</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Manage client pricing plans, rate structures, and included service volumes.
              </p>
            </div>
            {canManagePackages ? (
              <button
                onClick={handleNew}
                className="sv-primary-btn shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Package
              </button>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                You have view-only access to pricing packages.
              </div>
            )}
          </div>
        </div>

        {loadingUser || loadingPackages ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                canManage={canManagePackages}
                onEdit={handleEdit}
              />
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
          />
        )}
      </div>
    </StaffinglyLayout>
  );
}
