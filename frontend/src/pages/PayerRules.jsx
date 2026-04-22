import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Globe, Plus, Edit2, AlertTriangle, Save, X, Loader2, CheckCircle } from "lucide-react";
import AutomationFieldMapEditor from "@/components/payerrules/AutomationFieldMapEditor";

const EMPTY_RULE = {
  payer_name: "",
  payer_id: "",
  portal_url: "",
  fax_number: "",
  phone_number: "",
  prior_auth_cpt_codes: [],
  required_docs_by_cpt_json: "",
  average_turnaround_days: "",
  appeal_deadline_days: "30",
  peer_to_peer_process: "",
  covermymeds_supported: false,
  covermymeds_ndc_codes: [],
  notes: "",
  last_updated: new Date().toISOString().split("T")[0],
};

function isStale(dateStr) {
  if (!dateStr) return true;
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff > 90 * 24 * 3600 * 1000;
}

export default function PayerRules() {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [cptInput, setCptInput] = useState("");
  const [ndcInput, setNdcInput] = useState("");
  const queryClient = useQueryClient();
  const { data: user } = useAuthUserQuery({ withDefaultRole: "staffingly_admin" });
  const { data: rules = [], isLoading: loading } = useEntityListQuery(
    "PayerRule",
    "-created_date",
    null,
    { enabled: Boolean(user) }
  );

  const openNew = () => {
    setForm(EMPTY_RULE);
    setEditing("new");
  };
  const openEdit = (rule) => {
    setForm({ ...EMPTY_RULE, ...rule, _fullRule: rule });
    setEditing(rule.id);
  };
  const closeEdit = () => {
    setEditing(null);
    setForm(EMPTY_RULE);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, last_updated: new Date().toISOString().split("T")[0] };
    if (editing === "new") {
      await api.entities.PayerRule.create(payload);
    } else {
      await api.entities.PayerRule.update(editing, payload);
    }
    await queryClient.invalidateQueries({ queryKey: ["entity", "PayerRule"] });
    closeEdit();
    setSaving(false);
  };

  const addCpt = () => {
    if (cptInput.trim()) {
      setForm((f) => ({
        ...f,
        prior_auth_cpt_codes: [...(f.prior_auth_cpt_codes || []), cptInput.trim()],
      }));
      setCptInput("");
    }
  };
  const _addNdc = () => {
    if (ndcInput.trim()) {
      setForm((f) => ({
        ...f,
        covermymeds_ndc_codes: [...(f.covermymeds_ndc_codes || []), ndcInput.trim()],
      }));
      setNdcInput("");
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30";
  const Field = ({ label, children }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="payer-rules"
      title="Payer Rules Engine"
      breadcrumbs={["Admin", "Payer Rules"]}
    >
      <div className="max-w-[1100px] mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Payer Rules Database</h2>
            <p className="text-sm text-slate-400">
              {rules.length} payers configured. Rules &gt;90 days old are flagged for review.
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90"
            style={{ backgroundColor: "#293682" }}
          >
            <Plus className="w-4 h-4" /> Add Payer
          </button>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="bg-white rounded-2xl border-2 border-[#293682] p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800">
                {editing === "new" ? "New Payer Rule" : "Edit Payer Rule"}
              </h3>
              <button onClick={closeEdit}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Payer Name *">
                <input
                  value={form.payer_name}
                  onChange={(e) => setForm((f) => ({ ...f, payer_name: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Payer ID (EDI)">
                <input
                  value={form.payer_id}
                  onChange={(e) => setForm((f) => ({ ...f, payer_id: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Portal URL">
                <input
                  value={form.portal_url}
                  onChange={(e) => setForm((f) => ({ ...f, portal_url: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Fax Number">
                <input
                  value={form.fax_number}
                  onChange={(e) => setForm((f) => ({ ...f, fax_number: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  value={form.phone_number}
                  onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Avg Turnaround (days)">
                <input
                  type="number"
                  value={form.average_turnaround_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, average_turnaround_days: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Appeal Deadline (days)">
                <input
                  type="number"
                  value={form.appeal_deadline_days}
                  onChange={(e) => setForm((f) => ({ ...f, appeal_deadline_days: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="cmm"
                  checked={form.covermymeds_supported}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, covermymeds_supported: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="cmm" className="text-sm font-semibold text-slate-700">
                  CoverMyMeds Supported
                </label>
              </div>
            </div>

            {/* CPT Codes */}
            <Field label="Prior Auth Required CPT Codes">
              <div className="flex gap-2 mb-2">
                <input
                  value={cptInput}
                  onChange={(e) => setCptInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCpt()}
                  placeholder="e.g. 72148"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
                />
                <button
                  onClick={addCpt}
                  className="px-3 py-2.5 rounded-xl text-white font-bold"
                  style={{ backgroundColor: "#293682" }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.prior_auth_cpt_codes || []).map((code, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700"
                  >
                    {code}
                    <button
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          prior_auth_cpt_codes: f.prior_auth_cpt_codes.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </Field>

            <Field label="Required Docs Checklist (JSON or comma-separated per CPT)">
              <textarea
                value={form.required_docs_by_cpt_json}
                onChange={(e) =>
                  setForm((f) => ({ ...f, required_docs_by_cpt_json: e.target.value }))
                }
                rows={3}
                className={inputCls}
                placeholder='e.g. ["Clinical Notes","Letter of Medical Necessity","Lab Results"]'
              />
            </Field>

            <Field label="Peer-to-Peer Process">
              <textarea
                value={form.peer_to_peer_process}
                onChange={(e) => setForm((f) => ({ ...f, peer_to_peer_process: e.target.value }))}
                rows={2}
                className={inputCls}
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className={inputCls}
              />
            </Field>

            {editing !== "new" && form._fullRule && (
              <AutomationFieldMapEditor
                rule={form._fullRule}
                onSave={async (automationData) => {
                  await api.entities.PayerRule.update(editing, automationData);
                  await queryClient.invalidateQueries({ queryKey: ["entity", "PayerRule"] });
                  setForm((f) => ({
                    ...f,
                    _fullRule: { ...f._fullRule, ...automationData },
                    ...automationData,
                  }));
                }}
              />
            )}

            <button
              onClick={handleSave}
              disabled={saving || !form.payer_name}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#293682" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Payer Rule"}
            </button>
          </div>
        )}

        {/* Rules Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <div className="w-7 h-7 border-2 border-slate-200 border-t-[#293682] rounded-full animate-spin mx-auto" />
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No payer rules configured yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "Payer",
                      "Payer ID",
                      "Portal",
                      "Avg TAT",
                      "Appeal",
                      "CoverMyMeds",
                      "Last Updated",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">{rule.payer_name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {rule.payer_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {rule.portal_url ? (
                          <a
                            href={rule.portal_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#293682] font-semibold hover:underline"
                          >
                            Portal ↗
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {rule.average_turnaround_days ? `${rule.average_turnaround_days}d` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {rule.appeal_deadline_days ? `${rule.appeal_deadline_days}d` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {rule.covermymeds_supported ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isStale(rule.last_updated) && (
                            <span title="Stale rule (>90 days)" className="flex">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            </span>
                          )}
                          <span
                            className={`text-xs ${isStale(rule.last_updated) ? "text-amber-600 font-semibold" : "text-slate-500"}`}
                          >
                            {rule.last_updated
                              ? new Date(rule.last_updated).toLocaleDateString()
                              : "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(rule)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StaffinglyLayout>
  );
}
