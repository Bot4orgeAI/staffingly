import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
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
import { Plus, Search, Building2, User, ChevronRight, Edit2, Trash2, X } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const STATUS_COLORS = {
  Active: { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a" },
  Inactive: { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
  Pending: { bg: "#fffbeb", text: "#b45309", dot: "#d97706" },
};

function ClientModal({ client, onClose, onSave }) {
  const [form, setForm] = useState(
    client || {
      name: "",
      type: "Business",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      npi: "",
      tax_id: "",
      status: "Active",
      notes: "",
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (client?.id) {
      await api.entities.Client.update(client.id, form);
    } else {
      await api.entities.Client.create(form);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {client ? "Edit Client" : "Add New Client"}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Client Name *
              </label>
              <input
                value={form.name || ""}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Type
              </label>
              <AppSelect
                value={form.type || "Business"}
                onValueChange={(v) => setForm((current) => ({ ...current, type: v }))}
                options={["Business", "Individual"]}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Email
              </label>
              <input
                value={form.email || ""}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                type="email"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Phone
              </label>
              <input
                value={form.phone || ""}
                onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                NPI
              </label>
              <input
                value={form.npi || ""}
                onChange={(e) => setForm((current) => ({ ...current, npi: e.target.value }))}
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Tax ID / EIN
              </label>
              <input
                value={form.tax_id || ""}
                onChange={(e) => setForm((current) => ({ ...current, tax_id: e.target.value }))}
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Address
              </label>
              <input
                value={form.address || ""}
                onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                City
              </label>
              <input
                value={form.city || ""}
                onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))}
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                State
              </label>
              <input
                value={form.state || ""}
                onChange={(e) => setForm((current) => ({ ...current, state: e.target.value }))}
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                ZIP
              </label>
              <input
                value={form.zip || ""}
                onChange={(e) => setForm((current) => ({ ...current, zip: e.target.value }))}
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Status
              </label>
              <AppSelect
                value={form.status || "Active"}
                onValueChange={(v) => setForm((current) => ({ ...current, status: v }))}
                options={["Active", "Inactive", "Pending"]}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Notes
            </label>
            <textarea
              value={form.notes || ""}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
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
            {saving ? "Saving..." : client ? "Update Client" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Clients() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [modal, setModal] = useState(null); // null | "add" | client object
  const [clientPendingDelete, setClientPendingDelete] = useState(null);
  const queryClient = useQueryClient();
  const { data: user } = useAuthUserQuery();
  const { data: clients = [] } = useEntityListQuery("Client", "-created_date", 200, {
    enabled: Boolean(user),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Client.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "Client"] });
    },
  });

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id);
  };

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.npi?.includes(search);
    const matchType = filterType === "All" || c.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#eef3ff", fontFamily: "'DM Sans', sans-serif" }}
    >
      <AlertDialog
        open={Boolean(clientPendingDelete)}
        onOpenChange={(open) => !open && setClientPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {clientPendingDelete?.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async (event) => {
                event.preventDefault();
                if (!clientPendingDelete) return;
                await handleDelete(clientPendingDelete.id);
                setClientPendingDelete(null);
              }}
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppHeader
        user={user}
        breadcrumbs={[
          { label: "Dashboard", href: createPageUrl("dashboard") },
          { label: "Clients" },
        ]}
      />

      {modal && (
        <ClientModal
          client={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSave={async () => {
            setModal(null);
            await queryClient.invalidateQueries({ queryKey: ["entity", "Client"] });
          }}
        />
      )}

      <main className="p-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Clients</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage individual & business clients, their providers and subscribers
            </p>
          </div>
          <button
            onClick={() => setModal("add")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: "#293682" }}
          >
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, NPI..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none"
            />
          </div>
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
            {["All", "Business", "Individual"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${filterType === t ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
                style={filterType === t ? { backgroundColor: "#293682" } : {}}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "Total Clients", value: clients.length, color: "#293682", bg: "#eef3ff" },
            {
              label: "Active",
              value: clients.filter((c) => c.status === "Active").length,
              color: "#15803d",
              bg: "#f0fdf4",
            },
            {
              label: "Inactive / Pending",
              value: clients.filter((c) => c.status !== "Active").length,
              color: "#d97706",
              bg: "#fffbeb",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-slate-200 p-4 text-center"
            >
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Client Cards */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 text-sm">
              No clients found. Add your first client to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((client) => {
              const sc = STATUS_COLORS[client.status] || STATUS_COLORS.Active;
              return (
                <div
                  key={client.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{
                          backgroundColor: client.type === "Individual" ? "#0a7e87" : "#293682",
                        }}
                      >
                        {client.type === "Individual" ? (
                          <User className="w-5 h-5" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">
                          {client.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{client.type}</p>
                      </div>
                    </div>
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ backgroundColor: sc.dot }}
                      />
                      {client.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 mb-4">
                    {client.email && <p>✉ {client.email}</p>}
                    {client.phone && <p>📞 {client.phone}</p>}
                    {client.npi && (
                      <p>
                        NPI: <span className="font-mono text-slate-700">{client.npi}</span>
                      </p>
                    )}
                    {client.city && client.state && (
                      <p>
                        📍 {client.city}, {client.state}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <Link to={createPageUrl(`client-detail?id=${client.id}`)} className="flex-1">
                      <button
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-xs font-bold"
                        style={{ backgroundColor: "#293682" }}
                      >
                        View Details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => setModal(client)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setClientPendingDelete(client)}
                      className="px-3 py-2 rounded-lg border border-red-200 text-xs text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
