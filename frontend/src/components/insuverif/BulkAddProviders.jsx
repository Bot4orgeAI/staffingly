import { useState } from "react";
import { api } from "@/lib/api";
import { X, Plus, Trash2, AlertCircle, Check } from "lucide-react";

const EMPTY_ROW = () => ({
  first_name: "",
  last_name: "",
  provider_type: "MD",
  specialty: "",
  npi: "",
  email: "",
  phone: "",
  license_number: "",
  license_state: "",
  status: "Credentialing",
  _error: null,
});

const TYPES = ["MD", "DO", "NP", "PA", "LCSW", "PT", "OT", "DDS", "Other"];

function validate(row) {
  if (!row.last_name?.trim()) return "Last name required";
  if (row.npi && !/^\d{10}$/.test(row.npi)) return "NPI must be 10 digits";
  if (row.email && !/\S+@\S+\.\S+/.test(row.email)) return "Invalid email";
  return null;
}

export default function BulkAddProviders({ clientId, onClose, onSaved }) {
  const [rows, setRows] = useState([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);

  const update = (i, field, val) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val, _error: null } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, EMPTY_ROW()]);
  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    // Validate all non-empty rows
    const filled = rows.filter((r) => r.last_name?.trim() || r.first_name?.trim() || r.npi?.trim());
    if (!filled.length) return;

    const validated = rows.map((r) => {
      if (!r.last_name?.trim() && !r.first_name?.trim() && !r.npi?.trim()) return r; // skip blank
      return { ...r, _error: validate(r) };
    });
    setRows(validated);
    if (validated.some((r) => r._error)) return;

    setSaving(true);
    let count = 0;
    for (const row of filled) {
      const { _error, ...data } = row;
      await api.entities.Provider.create({ ...data, client_id: clientId });
      count++;
      setSaved(count);
    }
    setSaving(false);
    onSaved();
  };

  const filledCount = rows.filter((r) => r.last_name?.trim() || r.first_name?.trim()).length;

  const inputCls =
    "border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200 w-full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Bulk Add Providers</h3>
            <p className="text-xs text-slate-400">
              {filledCount} provider{filledCount !== 1 ? "s" : ""} ready to save
            </p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 p-6">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                {[
                  "First Name",
                  "Last Name *",
                  "Type",
                  "Specialty",
                  "NPI",
                  "Email",
                  "Phone",
                  "License #",
                  "State",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-2 text-left whitespace-nowrap border-b border-slate-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={row._error ? "bg-red-50" : "hover:bg-slate-50/50"}>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.first_name}
                      onChange={(e) => update(i, "first_name", e.target.value)}
                      placeholder="John"
                      className={inputCls}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.last_name}
                      onChange={(e) => update(i, "last_name", e.target.value)}
                      placeholder="Smith *"
                      className={`${inputCls} ${row._error ? "border-red-300" : ""}`}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <select
                      value={row.provider_type}
                      onChange={(e) => update(i, "provider_type", e.target.value)}
                      className={inputCls}
                    >
                      {TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.specialty}
                      onChange={(e) => update(i, "specialty", e.target.value)}
                      placeholder="e.g. Cardiology"
                      className={inputCls}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.npi}
                      onChange={(e) => update(i, "npi", e.target.value)}
                      placeholder="10 digits"
                      maxLength={10}
                      className={`${inputCls} font-mono`}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.email}
                      onChange={(e) => update(i, "email", e.target.value)}
                      placeholder="dr@clinic.com"
                      className={inputCls}
                      type="email"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.phone}
                      onChange={(e) => update(i, "phone", e.target.value)}
                      placeholder="(555) 000-0000"
                      className={inputCls}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.license_number}
                      onChange={(e) => update(i, "license_number", e.target.value)}
                      placeholder="MED-123"
                      className={inputCls}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.license_state}
                      onChange={(e) => update(i, "license_state", e.target.value)}
                      placeholder="TX"
                      maxLength={2}
                      className={`${inputCls} w-12`}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <select
                      value={row.status}
                      onChange={(e) => update(i, "status", e.target.value)}
                      className={inputCls}
                    >
                      {["Active", "Inactive", "Credentialing"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-1">
                      {row._error && (
                        <span title={row._error}>
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        </span>
                      )}
                      <button
                        onClick={() => removeRow(i)}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={addRow}
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {saving
              ? `Saving… ${saved} / ${rows.filter((r) => r.last_name?.trim() || r.first_name?.trim()).length}`
              : "Blank rows will be skipped automatically."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: "#293682" }}
            >
              {saving ? (
                `Saving ${saved}/${filledCount}…`
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save {filledCount} Provider
                  {filledCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
