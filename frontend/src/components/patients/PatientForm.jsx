import { useState } from "react";
import { X } from "lucide-react";

const GENDERS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

function FormInput({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white";
const ringStyle = { "--tw-ring-color": "#293682" };

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

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    // Validate required fields
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
      await onSave({
        ...form,
      });
    } catch (err) {
      setError(err.message || "Failed to save patient");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {patient ? "Edit Patient" : "New Patient"}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {!patient && requireClientSelection && (
            <FormInput label="Client" required>
              <div className="space-y-2">
                <select
                  className={inputClass}
                  style={ringStyle}
                  value={form.clientId}
                  onChange={(e) => update("clientId", e.target.value)}
                  disabled={loadingClients || clientOptions.length === 0}
                >
                  <option value="">
                    {loadingClients ? "Loading clients..." : "Select client..."}
                  </option>
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.practiceName ? `${client.name} (${client.practiceName})` : client.name}
                    </option>
                  ))}
                </select>
                {!loadingClients && clientOptions.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No clients are available to assign. Create a client first or refresh the page.
                  </p>
                )}
              </div>
            </FormInput>
          )}

          {/* Name Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="First Name" required>
              <input
                className={inputClass}
                style={ringStyle}
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="John"
              />
            </FormInput>
            <FormInput label="Middle Name">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.middleName}
                onChange={(e) => update("middleName", e.target.value)}
                placeholder="William"
              />
            </FormInput>
            <FormInput label="Last Name" required>
              <input
                className={inputClass}
                style={ringStyle}
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="Smith"
              />
            </FormInput>
          </div>

          {/* DOB and Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Date of Birth" required>
              <input
                type="date"
                className={inputClass}
                style={ringStyle}
                value={form.dob}
                onChange={(e) => update("dob", e.target.value)}
              />
            </FormInput>
            <FormInput label="Gender">
              <select
                className={inputClass}
                style={ringStyle}
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                <option value="">Select...</option>
                {GENDERS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </FormInput>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Phone">
              <input
                type="tel"
                className={inputClass}
                style={ringStyle}
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </FormInput>
            <FormInput label="Email">
              <input
                type="email"
                className={inputClass}
                style={ringStyle}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="patient@email.com"
              />
            </FormInput>
          </div>

          {/* Address */}
          <FormInput label="Street Address">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main Street"
            />
          </FormInput>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-2">
              <FormInput label="City">
                <input
                  className={inputClass}
                  style={ringStyle}
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Austin"
                />
              </FormInput>
            </div>
            <FormInput label="State">
              <select
                className={inputClass}
                style={ringStyle}
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              >
                <option value="">Select...</option>
                {US_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </FormInput>
            <FormInput label="ZIP">
              <input
                className={inputClass}
                style={ringStyle}
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                placeholder="78701"
              />
            </FormInput>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: "#293682" }}
          >
            {saving ? "Saving..." : patient ? "Update Patient" : "Create Patient"}
          </button>
        </div>
      </div>
    </div>
  );
}
