import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import AppSelect from "@/components/ui/app-select";
import {
  CLOUD_STORAGE_OPTIONS,
  EMR_SYSTEM_OPTIONS,
} from "@/components/clients/saClients/constants";
import { toClientPayload } from "@/components/clients/saClients/utils";

function TextField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        type={type}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
      />
    </div>
  );
}

export default function ClientDrawer({ client, onClose, onSubmit, saveError, saving }) {
  const [form, setForm] = useState({
    practiceName: client?.practiceName || "",
    contactName: client?.contactName || "",
    contactEmail: client?.contactEmail || "",
    contactPhone: client?.contactPhone || "",
    address: client?.address || "",
    npi: client?.npi || "",
    taxId: client?.taxId || "",
    emrSystem: client?.emrSystem || "Epic",
    cloudStorageType: client?.cloudStorageType || "none",
    subdomain: client?.subdomain || "",
    verificationTriggers: client?.verificationTriggers || "",
    escalationRules: client?.escalationRules || "",
    reportingPreferences: client?.reportingPreferences || "",
    active: client ? client.status === "ACTIVE" : true,
  });
  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = async () => {
    if (!form.practiceName.trim()) {
      return;
    }

    try {
      const payload = toClientPayload(form);
      await onSubmit({ clientId: client?.id || null, payload });
      onClose();
    } catch {
      // Error state is handled by the parent mutation and rendered via props.
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.button
        type="button"
        aria-label="Close client drawer"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%", opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.9 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-gradient-to-br from-[#f7fbfb] via-white to-[#eef7f8] px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0a7e87]">Client Registry</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">{client ? "Edit Client" : "Onboard New Client"}</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Capture the client&apos;s contact, practice, and platform setup details in one place.
              </p>
            </div>
            <button
              onClick={onClose}
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

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Practice Details</h4>
              <p className="mt-1 text-xs text-slate-500">Core information used to identify the client account.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Practice Name *" value={form.practiceName} onChange={updateField("practiceName")} />
              <TextField label="Subdomain" value={form.subdomain} onChange={updateField("subdomain")} />
              <TextField label="NPI" value={form.npi} onChange={updateField("npi")} />
              <TextField label="Tax ID" value={form.taxId} onChange={updateField("taxId")} />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Address</label>
                <textarea
                  value={form.address}
                  onChange={updateField("address")}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Primary Contact</h4>
              <p className="mt-1 text-xs text-slate-500">Main contact for onboarding and account communication.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Contact Name" value={form.contactName} onChange={updateField("contactName")} />
              <TextField label="Contact Email" value={form.contactEmail} onChange={updateField("contactEmail")} type="email" />
              <TextField label="Contact Phone" value={form.contactPhone} onChange={updateField("contactPhone")} />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Platform Setup</h4>
              <p className="mt-1 text-xs text-slate-500">Configure integrations and storage defaults for this client.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">EMR System</label>
                <AppSelect
                  value={form.emrSystem}
                  onValueChange={(value) => setForm((current) => ({ ...current, emrSystem: value }))}
                  options={EMR_SYSTEM_OPTIONS}
                  triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:ring-0 focus:border-slate-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cloud Storage</label>
                <AppSelect
                  value={form.cloudStorageType}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, cloudStorageType: value }))
                  }
                  options={CLOUD_STORAGE_OPTIONS}
                  triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:ring-0 focus:border-slate-300"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Client Active</p>
                <p className="text-xs text-slate-500">Active clients are available in the registry and operational workflows.</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, active: !current.active }))}
                className={`inline-flex h-7 w-12 rounded-full transition-colors ${form.active ? "bg-[#0a7e87]" : "bg-slate-300"}`}
              >
                <span
                  className={`mt-1 h-5 w-5 rounded-full bg-white transition-transform ${form.active ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Workflow Preferences</h4>
              <p className="mt-1 text-xs text-slate-500">
                Capture the client&apos;s verification triggers, escalation rules, and reporting expectations.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Verification Triggers
                </label>
                <textarea
                  value={form.verificationTriggers}
                  onChange={updateField("verificationTriggers")}
                  rows={3}
                  placeholder="Example: Verify all next-day appointments nightly and rerun on demographic changes."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Escalation Rules
                </label>
                <textarea
                  value={form.escalationRules}
                  onChange={updateField("escalationRules")}
                  rows={3}
                  placeholder="Example: Escalate low-confidence or high-dollar cases to virtual staff within 30 minutes."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Reporting Preferences
                </label>
                <textarea
                  value={form.reportingPreferences}
                  onChange={updateField("reportingPreferences")}
                  rows={3}
                  placeholder="Example: Weekly executive summary, denial trends, and payer turnaround tracking."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/10 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#0a7e87" }}
          >
            {saving ? "Saving..." : client ? "Update Client" : "Onboard Client"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
