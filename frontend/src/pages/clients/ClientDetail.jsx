import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityFilterQuery } from "@/lib/query";
import AppHeader from "@/components/insuverif/AppHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  User,
  Stethoscope,
  Users,
  Building2,
  ShieldCheck,
  Upload,
  TableProperties,
} from "lucide-react";
import EligibilityVerifyPanel from "@/components/insuverif/EligibilityVerifyPanel";
import BulkAddProviders from "@/components/insuverif/BulkAddProviders";
import ImportProviders from "@/components/insuverif/ImportProviders";

const STATUS_COLORS = {
  Active: { bg: "#f0fdf4", text: "#15803d" },
  Inactive: { bg: "#f1f5f9", text: "#64748b" },
  Pending: { bg: "#fffbeb", text: "#b45309" },
  Credentialing: { bg: "#eff6ff", text: "#1d4ed8" },
};

function ProviderModal({ provider, clientId, onClose, onSave }) {
  const [form, setForm] = useState(
    provider || {
      client_id: clientId,
      first_name: "",
      last_name: "",
      npi: "",
      specialty: "",
      email: "",
      phone: "",
      provider_type: "MD",
      status: "Active",
      license_number: "",
      license_state: "",
      license_expiry: "",
      notes: "",
    }
  );
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (formData) =>
      provider?.id
        ? api.entities.Provider.update(provider.id, formData)
        : api.entities.Provider.create({ ...formData, client_id: clientId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "Provider"] });
    },
  });

  const handleSave = async () => {
    if (!form.last_name.trim()) return;
    setSaving(true);
    await updateMutation.mutateAsync(form);
    setSaving(false);
    onSave();
  };

  const F = ({ label, field, type = "text", options = null }) => (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      {options ? (
        <select
          value={form[field] || ""}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          value={form[field] || ""}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          type={type}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {provider ? "Edit Provider" : "Add Provider"}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="First Name" field="first_name" />
          <F label="Last Name *" field="last_name" />
          <F
            label="Provider Type"
            field="provider_type"
            options={["MD", "DO", "NP", "PA", "LCSW", "PT", "OT", "DDS", "Other"]}
          />
          <F label="Specialty" field="specialty" />
          <F label="NPI" field="npi" />
          <F label="Email" field="email" type="email" />
          <F label="Phone" field="phone" />
          <F label="Status" field="status" options={["Active", "Inactive", "Credentialing"]} />
          <F label="License Number" field="license_number" />
          <F label="License State" field="license_state" />
          <F label="License Expiry" field="license_expiry" type="date" />
        </div>
        <div className="px-6 pb-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Notes
          </label>
          <textarea
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          />
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: "#293682" }}
          >
            {saving ? "Saving..." : provider ? "Update" : "Add Provider"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriberModal({ subscriber, clientId, providers, onClose, onSave }) {
  const [form, setForm] = useState(
    subscriber || {
      client_id: clientId,
      provider_id: "",
      first_name: "",
      last_name: "",
      dob: "",
      gender: "Prefer not to say",
      member_id: "",
      payer: "",
      plan_type: "",
      group_number: "",
      effective_date: "",
      termination_date: "",
      status: "Active",
      phone: "",
      email: "",
      notes: "",
    }
  );
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (formData) =>
      subscriber?.id
        ? api.entities.Subscriber.update(subscriber.id, formData)
        : api.entities.Subscriber.create({ ...formData, client_id: clientId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "Subscriber"] });
    },
  });

  const handleSave = async () => {
    if (!form.last_name.trim()) return;
    setSaving(true);
    await updateMutation.mutateAsync(form);
    setSaving(false);
    onSave();
  };

  const F = ({ label, field, type = "text", options = null }) => (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      {options ? (
        <select
          value={form[field] || ""}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        >
          {options.map((o) =>
            typeof o === "string" ? (
              <option key={o}>{o}</option>
            ) : (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            )
          )}
        </select>
      ) : (
        <input
          value={form[field] || ""}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          type={type}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        />
      )}
    </div>
  );

  const providerOptions = [
    { value: "", label: "— No specific provider —" },
    ...providers.map((p) => ({
      value: p.id,
      label: `${p.first_name || ""} ${p.last_name} (${p.provider_type})`.trim(),
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {subscriber ? "Edit Subscriber" : "Add Subscriber"}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="First Name" field="first_name" />
          <F label="Last Name *" field="last_name" />
          <F label="Date of Birth" field="dob" type="date" />
          <F
            label="Gender"
            field="gender"
            options={["Male", "Female", "Non-binary", "Prefer not to say"]}
          />
          <F label="Member ID" field="member_id" />
          <F label="Payer / Insurance" field="payer" />
          <F label="Plan Type" field="plan_type" />
          <F label="Group Number" field="group_number" />
          <F label="Effective Date" field="effective_date" type="date" />
          <F label="Termination Date" field="termination_date" type="date" />
          <F label="Phone" field="phone" />
          <F label="Email" field="email" type="email" />
          <F label="Assigned Provider" field="provider_id" options={providerOptions} />
          <F label="Status" field="status" options={["Active", "Inactive", "Pending"]} />
        </div>
        <div className="px-6 pb-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Notes
          </label>
          <textarea
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          />
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: "#0a7e87" }}
          >
            {saving ? "Saving..." : subscriber ? "Update" : "Add Subscriber"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientDetail() {
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("id");

  const queryClient = useQueryClient();
  const { data: user } = useAuthUserQuery();

  const { data: clientData = [] } = useEntityFilterQuery(
    "Client",
    { id: clientId },
    { enabled: Boolean(clientId && user) }
  );

  const { data: providers = [] } = useEntityFilterQuery(
    "Provider",
    { client_id: clientId },
    { enabled: Boolean(clientId && user) }
  );

  const { data: subscribers = [] } = useEntityFilterQuery(
    "Subscriber",
    { client_id: clientId },
    { enabled: Boolean(clientId && user) }
  );

  const client = clientData[0] || null;

  const [activeTab, setActiveTab] = useState("providers");
  const [providerModal, setProviderModal] = useState(null);
  const [subscriberModal, setSubscriberModal] = useState(null);
  const [providerPendingDelete, setProviderPendingDelete] = useState(null);
  const [subscriberPendingDelete, setSubscriberPendingDelete] = useState(null);
  const [verifyPanel, setVerifyPanel] = useState(null); // { subscriber, provider }
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const deleteProviderMutation = useMutation({
    mutationFn: (id) => api.entities.Provider.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "Provider"] });
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: (id) => api.entities.Subscriber.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "Subscriber"] });
    },
  });

  const handleDeleteProvider = async (id) => {
    await deleteProviderMutation.mutateAsync(id);
  };

  const handleDeleteSubscriber = async (id) => {
    await deleteSubscriberMutation.mutateAsync(id);
  };

  const getProviderName = (providerId) => {
    const p = providers.find((pr) => pr.id === providerId);
    return p ? `${p.first_name || ""} ${p.last_name}`.trim() : "—";
  };

  if (!client)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#eef3ff" }}
      >
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );

  const sc = STATUS_COLORS[client.status] || STATUS_COLORS.Active;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#eef3ff", fontFamily: "'DM Sans', sans-serif" }}
    >
      <AlertDialog
        open={Boolean(providerPendingDelete)}
        onOpenChange={(open) => !open && setProviderPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this provider from the client record?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async (event) => {
                event.preventDefault();
                if (!providerPendingDelete) return;
                await handleDeleteProvider(providerPendingDelete.id);
                setProviderPendingDelete(null);
              }}
            >
              Delete Provider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(subscriberPendingDelete)}
        onOpenChange={(open) => !open && setSubscriberPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this subscriber from the client record?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async (event) => {
                event.preventDefault();
                if (!subscriberPendingDelete) return;
                await handleDeleteSubscriber(subscriberPendingDelete.id);
                setSubscriberPendingDelete(null);
              }}
            >
              Delete Subscriber
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppHeader
        user={user}
        breadcrumbs={[
          { label: "Dashboard", href: createPageUrl("dashboard") },
          { label: "Clients", href: createPageUrl("clients") },
          { label: client.name },
        ]}
      />

      {providerModal !== null && (
        <ProviderModal
          provider={providerModal === "add" ? null : providerModal}
          clientId={clientId}
          onClose={() => setProviderModal(null)}
          onSave={() => {
            setProviderModal(null);
          }}
        />
      )}
      {subscriberModal !== null && (
        <SubscriberModal
          subscriber={subscriberModal === "add" ? null : subscriberModal}
          clientId={clientId}
          providers={providers}
          onClose={() => setSubscriberModal(null)}
          onSave={() => {
            setSubscriberModal(null);
          }}
        />
      )}
      {verifyPanel && (
        <EligibilityVerifyPanel
          subscriber={verifyPanel.subscriber}
          provider={verifyPanel.provider}
          onClose={() => setVerifyPanel(null)}
          onVerified={async () => {
            await queryClient.invalidateQueries({ queryKey: ["entity", "Subscriber"] });
          }}
        />
      )}
      {showBulkAdd && (
        <BulkAddProviders
          clientId={clientId}
          onClose={() => setShowBulkAdd(false)}
          onSaved={async () => {
            setShowBulkAdd(false);
            await queryClient.invalidateQueries({ queryKey: ["entity", "Provider"] });
          }}
        />
      )}
      {showImport && (
        <ImportProviders
          clientId={clientId}
          onClose={() => setShowImport(false)}
          onSaved={async () => {
            setShowImport(false);
            await queryClient.invalidateQueries({ queryKey: ["entity", "Provider"] });
          }}
        />
      )}

      <main className="p-6 max-w-[1200px] mx-auto space-y-5">
        {/* Client Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: client.type === "Individual" ? "#0a7e87" : "#293682" }}
              >
                {client.type === "Individual" ? (
                  <User className="w-7 h-7" />
                ) : (
                  <Building2 className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800">{client.name}</h1>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: sc.bg, color: sc.text }}
                  >
                    {client.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{client.type}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  {client.email && <span>✉ {client.email}</span>}
                  {client.phone && <span>📞 {client.phone}</span>}
                  {client.npi && (
                    <span>
                      NPI: <span className="font-mono text-slate-700">{client.npi}</span>
                    </span>
                  )}
                  {client.tax_id && <span>Tax ID: {client.tax_id}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 text-center">
              <div className="bg-slate-50 rounded-xl p-3 min-w-[80px]">
                <p className="text-2xl font-bold" style={{ color: "#293682" }}>
                  {providers.length}
                </p>
                <p className="text-[11px] text-slate-400">Providers</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 min-w-[80px]">
                <p className="text-2xl font-bold" style={{ color: "#0a7e87" }}>
                  {subscribers.length}
                </p>
                <p className="text-[11px] text-slate-400">Subscribers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
          {[
            { key: "providers", label: "Providers", count: providers.length, icon: Stethoscope },
            { key: "subscribers", label: "Subscribers", count: subscribers.length, icon: Users },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.key ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
              style={activeTab === t.key ? { backgroundColor: "#293682" } : {}}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === t.key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Providers Tab */}
        {activeTab === "providers" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm">Providers</h2>
              <div className="flex flex-wrap gap-2">
                <Link to={createPageUrl(`provider-onboarding?client_id=${clientId}`)}>
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold"
                    style={{ backgroundColor: "#0a7e87" }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Onboard
                  </button>
                </Link>
                <button
                  onClick={() => setShowBulkAdd(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  <TableProperties className="w-3.5 h-3.5" /> Bulk Add
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  <Upload className="w-3.5 h-3.5" /> Import CSV
                </button>
                <button
                  onClick={() => setProviderModal("add")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Quick Add
                </button>
              </div>
            </div>
            {providers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <Stethoscope className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                No providers yet — add the first one
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["Name", "Type", "Specialty", "NPI", "License", "Status", "Actions"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {providers.map((p) => {
                      const ps = STATUS_COLORS[p.status] || STATUS_COLORS.Active;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                            {p.first_name} {p.last_name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.provider_type}</td>
                          <td className="px-4 py-3 text-slate-500">{p.specialty || "—"}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{p.npi || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {p.license_number ? `${p.license_number} (${p.license_state})` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-1 rounded-full text-[10px] font-bold"
                              style={{ backgroundColor: ps.bg, color: ps.text }}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setProviderModal(p)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                              <button
                              onClick={() => setProviderPendingDelete(p)}
                                className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === "subscribers" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm">Subscribers</h2>
              <button
                onClick={() => setSubscriberModal("add")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold"
                style={{ backgroundColor: "#0a7e87" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Subscriber
              </button>
            </div>
            {subscribers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                No subscribers yet — add the first one
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[
                        "Name",
                        "DOB",
                        "Member ID",
                        "Payer",
                        "Plan",
                        "Provider",
                        "Status",
                        "Last Verified",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscribers.map((s) => {
                      const ss = STATUS_COLORS[s.status] || STATUS_COLORS.Active;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                            {s.first_name} {s.last_name}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{s.dob || "—"}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {s.member_id || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {s.payer || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{s.plan_type || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {s.provider_id ? getProviderName(s.provider_id) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-1 rounded-full text-[10px] font-bold"
                              style={{ backgroundColor: ss.bg, color: ss.text }}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {s.last_coverage_status ? (
                              <div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.last_coverage_status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                                >
                                  {s.last_coverage_status}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {s.last_verified_date}
                                </p>
                                {s.last_confidence_score != null && (
                                  <p
                                    className="text-[10px] font-semibold"
                                    style={{
                                      color: s.last_confidence_score >= 80 ? "#15803d" : "#d97706",
                                    }}
                                  >
                                    {s.last_confidence_score}%
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">Never verified</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  setVerifyPanel({
                                    subscriber: s,
                                    provider: providers.find((p) => p.id === s.provider_id) || null,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg text-white text-[11px] font-bold flex items-center gap-1"
                                style={{ backgroundColor: "#293682" }}
                              >
                                <ShieldCheck className="w-3 h-3" /> Verify
                              </button>
                              <button
                                onClick={() => setSubscriberModal(s)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                              onClick={() => setSubscriberPendingDelete(s)}
                                className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
