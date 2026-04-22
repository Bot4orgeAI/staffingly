import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const GENDERS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

function TextField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
      />
    </div>
  );
}

function SelectField({ label, value, onValueChange, options, placeholder = "Select..." }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <AppSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder={placeholder}
        triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:ring-0 focus:border-slate-300"
      />
    </div>
  );
}

export default function PatientForm({
  patient,
  clientId,
  clientOptions = [],
  requireClientSelection = false,
  loadingClients = false,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    clientId: patient?.clientId || clientId || "",
    firstName: patient?.firstName || "",
    lastName: patient?.lastName || "",
    middleName: patient?.middleName || "",
    dob: patient?.dob ? patient.dob.split("T")[0] : "",
    gender: patient?.gender || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    address: patient?.address || "",
    city: patient?.city || "",
    state: patient?.state || "",
    zip: patient?.zip || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dob) {
      setError("First name, last name, and date of birth are required");
      return;
    }

    if (!form.clientId) {
      setError("A valid client must be selected before creating a patient");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({ ...form });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save patient");
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.button
        type="button"
        aria-label="Close patient drawer"
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0a7e87]">
                Patient Registry
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">
                {patient ? "Edit Patient" : "Register New Patient"}
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Capture patient demographics, contact details, and assignment information in one place.
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
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!patient && requireClientSelection ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-800">Client Assignment</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Assign the patient to the correct client account before saving.
                </p>
              </div>
              <div className="space-y-2">
                <SelectField
                  label="Client"
                  value={form.clientId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, clientId: value }))
                  }
                  options={clientOptions.map((client) => ({
                    value: client.id,
                    label: client.practiceName
                      ? `${client.name} (${client.practiceName})`
                      : client.name,
                  }))}
                  placeholder={loadingClients ? "Loading clients..." : "Select client..."}
                />
                {!loadingClients && clientOptions.length === 0 ? (
                  <p className="text-xs text-amber-600">
                    No clients are available to assign. Create a client first or refresh the page.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Patient Identity</h4>
              <p className="mt-1 text-xs text-slate-500">
                Store the patient&apos;s core demographic and identity information.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField
                label="First Name *"
                value={form.firstName}
                onChange={updateField("firstName")}
                placeholder="John"
              />
              <TextField
                label="Middle Name"
                value={form.middleName}
                onChange={updateField("middleName")}
                placeholder="William"
              />
              <TextField
                label="Last Name *"
                value={form.lastName}
                onChange={updateField("lastName")}
                placeholder="Smith"
              />
              <TextField
                label="Date of Birth *"
                type="date"
                value={form.dob}
                onChange={updateField("dob")}
              />
              <SelectField
                label="Gender"
                value={form.gender}
                onValueChange={(value) => setForm((current) => ({ ...current, gender: value }))}
                options={GENDERS}
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Contact Details</h4>
              <p className="mt-1 text-xs text-slate-500">
                Capture the patient&apos;s direct contact information for communication and follow-up.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={updateField("phone")}
                placeholder="(555) 123-4567"
              />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={updateField("email")}
                placeholder="patient@email.com"
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Address Information</h4>
              <p className="mt-1 text-xs text-slate-500">
                Keep mailing and geographic details available for payer and patient workflows.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Street Address
                </label>
                <textarea
                  value={form.address}
                  onChange={updateField("address")}
                  rows={3}
                  placeholder="123 Main Street"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
              </div>
              <TextField
                label="City"
                value={form.city}
                onChange={updateField("city")}
                placeholder="Austin"
              />
              <div className="grid grid-cols-2 gap-4 sm:col-span-1">
                <SelectField
                  label="State"
                  value={form.state}
                  onValueChange={(value) => setForm((current) => ({ ...current, state: value }))}
                  options={US_STATES}
                />
                <TextField
                  label="ZIP"
                  value={form.zip}
                  onChange={updateField("zip")}
                  placeholder="78701"
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
            {saving ? "Saving..." : patient ? "Update Patient" : "Register Patient"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
