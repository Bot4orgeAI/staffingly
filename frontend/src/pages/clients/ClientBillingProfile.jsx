import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityFilterQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import {
  BillingHeader,
  BillingAccessDenied,
  canAccessBilling,
} from "@/components/billing/BillingAccessGuard";
import InvoiceStatusBadge from "@/components/billing/InvoiceStatusBadge";
import DisputeTimer from "@/components/billing/DisputeTimer";
import {
  CreditCard,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import AppSelect from "@/components/ui/app-select";

export default function ClientBillingProfile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingAuth } = useAuthUserQuery();

  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("client_id");

  const isBillingAllowed = user && canAccessBilling(user);

  const { data: profileList = [], isLoading: loadingProfile } = useEntityFilterQuery(
    "BillingProfile",
    { client_id: clientId },
    { enabled: Boolean(isBillingAllowed && clientId) }
  );
  
  const { data: invList = [], isLoading: loadingInv } = useEntityFilterQuery(
    "ClientInvoice",
    { client_id: clientId },
    { enabled: Boolean(isBillingAllowed && clientId) }
  );

  const { data: creditList = [], isLoading: loadingCredit } = useEntityFilterQuery(
    "BillingCredit",
    { client_id: clientId },
    { enabled: Boolean(isBillingAllowed && clientId) }
  );

  const { data: pkgList = [], isLoading: loadingPkg } = useEntityListQuery(
    "PricingPackage",
    null,
    1000,
    { enabled: Boolean(isBillingAllowed) }
  );

  const profile = profileList[0] || null;
  const invoices = [...invList].sort(
    (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
  );
  const credits = creditList;
  const packages = pkgList;
  
  const loading = loadingAuth || loadingProfile || loadingInv || loadingCredit || loadingPkg;

  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditForm, setCreditForm] = useState({ amount: "", reason: "" });
  const [actionMsg, setActionMsg] = useState("");
  const [cardLoading, setCardLoading] = useState(false);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [setupForm, setSetupForm] = useState({
    client_name: "",
    billing_contact_name: "",
    billing_contact_email: "",
    pricing_package_id: "",
  });

  const handleCardLink = async () => {
    if (!profile?.stripe_customer_id) return;
    setCardLoading(true);
    const res = await api.functions.invoke("stripeSendCardUpdateLink", { client_id: clientId });
    if (res.data?.url) window.open(res.data.url, "_blank");
    setActionMsg("Card update link opened.");
    setCardLoading(false);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const issueCreditMutation = useMutation({
    mutationFn: async () => {
      await api.entities.BillingCredit.create({
        client_id: clientId,
        client_name: profile?.client_name || "",
        amount: parseFloat(creditForm.amount),
        reason: creditForm.reason,
        issued_by: user.email,
        issued_at: new Date().toISOString(),
      });
      await api.entities.BillingAuditLog.create({
        event_type: "credit_issued",
        client_id: clientId,
        client_name: profile?.client_name,
        description: `Credit of $${creditForm.amount} issued. Reason: ${creditForm.reason}`,
        performed_by: user.email,
        performed_at: new Date().toISOString(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "BillingCredit"] });
      await queryClient.invalidateQueries({ queryKey: ["entity", "BillingAuditLog"] });
    },
  });

  const handleIssueCredit = async () => {
    if (!creditForm.amount || !creditForm.reason) return;
    await issueCreditMutation.mutateAsync();
    setCreditForm({ amount: "", reason: "" });
    setShowCreditForm(false);
  };

  const handleRetryCharge = async (invoiceId) => {
    const res = await api.functions.invoke("stripeChargeInvoice", { invoice_id: invoiceId });
    setActionMsg(res.data?.success ? "Charge successful!" : `Charge failed: ${res.data?.error}`);
    setTimeout(() => setActionMsg(""), 4000);
    await queryClient.invalidateQueries({ queryKey: ["entity", "ClientInvoice"] });
  };

  const setupBillingMutation = useMutation({
    mutationFn: async () => {
      await api.functions.invoke("stripeCreateCustomer", {
        client_id: clientId,
        client_name: setupForm.client_name,
        billing_email: setupForm.billing_contact_email,
      });
      const pkg = packages.find((p) => p.id === setupForm.pricing_package_id);
      await api.entities.BillingProfile.update(profile?.id, {
        billing_contact_name: setupForm.billing_contact_name,
        billing_contact_email: setupForm.billing_contact_email,
        pricing_package_id: setupForm.pricing_package_id,
        pricing_package_name: pkg?.name || "",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "BillingProfile"] });
    },
  });

  const handleSetupBilling = async () => {
    await setupBillingMutation.mutateAsync();
    setShowSetupForm(false);
  };

  const packageChangeMutation = useMutation({
    mutationFn: async (pkgId) => {
      const pkg = packages.find((p) => p.id === pkgId);
      const before = {
        pricing_package_id: profile.pricing_package_id,
        pricing_package_name: profile.pricing_package_name,
      };
      await api.entities.BillingProfile.update(profile.id, {
        pricing_package_id: pkgId,
        pricing_package_name: pkg?.name || "",
      });
      await api.entities.BillingAuditLog.create({
        event_type: "package_changed",
        client_id: clientId,
        client_name: profile.client_name,
        description: `Pricing package changed from ${before.pricing_package_name} to ${pkg?.name}`,
        before_value_json: JSON.stringify(before),
        after_value_json: JSON.stringify({
          pricing_package_id: pkgId,
          pricing_package_name: pkg?.name,
        }),
        performed_by: user.email,
        performed_at: new Date().toISOString(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "BillingProfile"] });
      await queryClient.invalidateQueries({ queryKey: ["entity", "BillingAuditLog"] });
    },
  });

  const handlePackageChange = async (pkgId) => {
    await packageChangeMutation.mutateAsync(pkgId);
  };

  if (!user) return null;
  if (!canAccessBilling(user)) return <BillingAccessDenied />;

  return (
    <StaffinglyLayout
      user={user}
      currentPage="billing-dashboard"
      title="Client Billing Profile"
      breadcrumbs={["Billing", "Client Profile"]}
    >
      <div className="max-w-[1100px] mx-auto space-y-6">
        <BillingHeader
          title="Client Billing Profile"
          subtitle={profile?.client_name || `Client ${clientId}`}
        />

        {actionMsg && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" /> {actionMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : !profile ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500 mb-4">No billing profile found for this client.</p>
            <button
              onClick={() => setShowSetupForm(true)}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: "#f6b037" }}
            >
              Set Up Billing Profile
            </button>
          </div>
        ) : (
          <>
            {/* Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                  Stripe & Card
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Stripe Customer ID</span>
                  <span className="font-mono text-slate-700 text-xs">
                    {profile.stripe_customer_id || "Not set"}
                  </span>
                </div>
                {profile.card_last4 ? (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                    <CreditCard className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-semibold text-slate-800 capitalize">
                        {profile.card_brand} ···· {profile.card_last4}
                      </p>
                      <p className="text-xs text-slate-400">
                        Exp {profile.card_exp_month}/{profile.card_exp_year}
                      </p>
                    </div>
                    <button
                      onClick={handleCardLink}
                      disabled={cardLoading}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-slate-200 hover:bg-slate-100 text-slate-600"
                    >
                      <ExternalLink className="w-3 h-3" /> Update Card
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-700">No card on file.</span>
                    <button
                      onClick={handleCardLink}
                      disabled={cardLoading || !profile.stripe_customer_id}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-amber-500 text-white hover:bg-amber-600"
                    >
                      <ExternalLink className="w-3 h-3" /> Send Card Link
                    </button>
                  </div>
                )}
                {profile.account_flagged && (
                  <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700">
                    <strong>Account Flagged:</strong> {profile.flag_reason}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                  Billing Settings
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Billing Contact</span>
                  <span className="text-slate-700">{profile.billing_contact_name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Billing Email</span>
                  <span className="text-slate-700">{profile.billing_contact_email || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Billing Cycle</span>
                  <span className="text-slate-700 capitalize">
                    {profile.billing_cycle} on {profile.billing_day}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Dispute Window</span>
                  <span className="text-slate-700">{profile.dispute_window_hours || 24} hours</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Pricing Package</span>
                  <AppSelect
                    value={profile.pricing_package_id || ""}
                    onValueChange={handlePackageChange}
                    options={packages.filter((p) => p.is_active).map((p) => ({ label: p.name, value: p.id }))}
                    placeholder="— Select Package —"
                    triggerClassName="h-7 text-xs"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  {profile.billing_paused ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                      Paused
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Credits */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                  Credits & Adjustments
                </h3>
                <button
                  onClick={() => setShowCreditForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                >
                  <Plus className="w-3 h-3" /> Issue Credit
                </button>
              </div>
              {showCreditForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        value={creditForm.amount}
                        onChange={(e) => setCreditForm((f) => ({ ...f, amount: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Reason</label>
                      <input
                        type="text"
                        value={creditForm.reason}
                        onChange={(e) => setCreditForm((f) => ({ ...f, reason: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Reason for credit"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleIssueCredit}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ backgroundColor: "#f6b037" }}
                    >
                      Issue Credit
                    </button>
                    <button
                      onClick={() => setShowCreditForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {credits.length === 0 ? (
                <p className="text-sm text-slate-400">No credits issued yet.</p>
              ) : (
                <div className="space-y-2">
                  {credits.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-sm py-2 border-b border-slate-50"
                    >
                      <span className="text-slate-600">{c.reason}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-green-700">
                          -${c.amount.toFixed(2)}
                        </span>
                        {c.applied_to_invoice_id && (
                          <span className="text-xs text-slate-400">Applied</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice History */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                  Invoice History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Invoice #
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Period
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Total
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Dispute Window
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-700 text-xs">
                          {inv.invoice_number}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {inv.billing_period_start} → {inv.billing_period_end}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          ${(inv.total_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3">
                          {inv.status === "dispute_window" && inv.dispute_window_closes_at ? (
                            <DisputeTimer closesAt={inv.dispute_window_closes_at} />
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {inv.status === "payment_failed" && (
                              <button
                                onClick={() => handleRetryCharge(inv.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              >
                                <RefreshCw className="w-3 h-3" /> Retry
                              </button>
                            )}
                            {inv.stripe_payment_intent_id && (
                              <span className="text-xs font-mono text-slate-400">
                                {inv.stripe_payment_intent_id.slice(-8)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No invoices yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Setup Form Modal */}
        {showSetupForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Set Up Billing Profile</h2>
                <button
                  onClick={() => setShowSetupForm(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {["client_name", "billing_contact_name", "billing_contact_email"].map((k) => (
                <div key={k}>
                  <label className="block text-xs text-slate-500 mb-1 capitalize">
                    {k.replace(/_/g, " ")}
                  </label>
                  <input
                    type={k.includes("email") ? "email" : "text"}
                    value={setupForm[k]}
                    onChange={(e) => setSetupForm((f) => ({ ...f, [k]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Pricing Package</label>
                <AppSelect
                  value={setupForm.pricing_package_id}
                  onValueChange={(v) => setSetupForm((f) => ({ ...f, pricing_package_id: v }))}
                  options={packages.filter((p) => p.is_active).map((p) => ({ label: p.name, value: p.id }))}
                  placeholder="— Select —"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSetupBilling}
                  className="flex-1 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ backgroundColor: "#f6b037" }}
                >
                  Create Billing Profile
                </button>
                <button
                  onClick={() => setShowSetupForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffinglyLayout>
  );
}
