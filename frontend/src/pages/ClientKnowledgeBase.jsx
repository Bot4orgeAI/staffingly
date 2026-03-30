import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  Save,
  AlertTriangle,
} from "lucide-react";

const CATEGORIES = [
  {
    key: "Payer Requirements",
    icon: "🏥",
    desc: "Payer-specific quirks, contract details, prior auth rules",
    color: "#293682",
    bg: "#eef3ff",
  },
  {
    key: "Provider Information",
    icon: "👨‍⚕️",
    desc: "NPIs, physician preferences, credentialing status",
    color: "#0a7e87",
    bg: "#f0fdfa",
  },
  {
    key: "Clinical Protocols",
    icon: "📋",
    desc: "Procedure criteria, documentation requirements",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    key: "Billing and Contract",
    icon: "💼",
    desc: "Service rates, billing contacts, contract terms",
    color: "#b45309",
    bg: "#fffbeb",
  },
  {
    key: "EHR and Systems",
    icon: "💻",
    desc: "EHR logins, system protocols, access details",
    color: "#0369a1",
    bg: "#f0f9ff",
  },
  {
    key: "Historical Patterns",
    icon: "📈",
    desc: "Common denials, successful appeal language",
    color: "#15803d",
    bg: "#f0fdf4",
  },
  {
    key: "Custom Notes",
    icon: "📝",
    desc: "Anything else the team needs to remember",
    color: "#64748b",
    bg: "#f8fafc",
  },
  {
    key: "Payroll and Finance",
    icon: "💰",
    desc: "Rates, billing contacts, payment terms (restricted)",
    color: "#b91c1c",
    bg: "#fef2f2",
    restricted: true,
  },
];

const CAN_EDIT_ROLES = [
  "super_admin",
  "finance_admin",
  "staffingly_admin",
  "staffingly_supervisor",
];
const CAN_SEE_FINANCE_ROLES = ["super_admin", "finance_admin"];

function EntryModal({ entry, clientId, clientName, user, onSave, onClose }) {
  const [form, setForm] = useState(
    entry || {
      title: "",
      category: "Payer Requirements",
      content: "",
      visibility: "internal_only",
      tags: [],
    }
  );
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = CAN_SEE_FINANCE_ROLES.includes(user?.role)
    ? CATEGORIES
    : CATEGORIES.filter((c) => !c.restricted);

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    const payload = {
      ...form,
      client_id: clientId,
      client_name: clientName,
      last_updated_by: user?.full_name || user?.email,
      last_updated_at: new Date().toISOString(),
    };
    if (entry?.id) {
      await api.entities.KnowledgeBaseEntry.update(entry.id, payload);
    } else {
      await api.entities.KnowledgeBaseEntry.create({
        ...payload,
        created_by_name: user?.full_name || user?.email,
        access_count: 0,
      });
    }
    setSaving(false);
    onSave();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags?.includes(t)) setForm((f) => ({ ...f, tags: [...(f.tags || []), t] }));
    setTagInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800">
            {entry?.id ? "Edit Entry" : "New Knowledge Base Entry"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
              placeholder="e.g. Aetna radiology prior auth requirements"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.key}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
              >
                <option value="internal_only">Internal Only</option>
                <option value="shared_with_client">Shared with Client</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Content *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={8}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30 resize-none"
              placeholder="Enter detailed knowledge base content here…"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tags</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {(form.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs"
                >
                  #{tag}
                  <button
                    onClick={() =>
                      setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
                    }
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag and press Enter"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title || !form.content || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: "#293682" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry, user, onEdit, onDelete }) {
  const cat = CATEGORIES.find((c) => c.key === entry.category) || CATEGORIES[6];
  const canEdit = CAN_EDIT_ROLES.includes(user?.role);
  const isOld = entry.last_accessed_at
    ? Date.now() - new Date(entry.last_accessed_at).getTime() > 90 * 24 * 3600000
    : false;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{cat.icon}</span>
          <h4 className="font-bold text-slate-800 text-sm leading-tight">{entry.title}</h4>
        </div>
        {canEdit && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(entry)}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onDelete(entry)}
              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">{entry.content}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: cat.bg, color: cat.color }}
        >
          {cat.icon} {cat.key}
        </span>
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${entry.visibility === "shared_with_client" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
        >
          {entry.visibility === "shared_with_client" ? (
            <Eye className="w-2.5 h-2.5" />
          ) : (
            <EyeOff className="w-2.5 h-2.5" />
          )}
          {entry.visibility === "shared_with_client" ? "Shared" : "Internal"}
        </span>
        {isOld && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">
            <AlertTriangle className="w-2.5 h-2.5" /> Possibly outdated
          </span>
        )}
        {(entry.tags || []).slice(0, 3).map((t) => (
          <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-500">
            #{t}
          </span>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-slate-400">
        Updated by {entry.last_updated_by || entry.created_by_name || "Unknown"} ·{" "}
        {entry.last_updated_at ? new Date(entry.last_updated_at).toLocaleDateString() : "—"}
      </div>
    </div>
  );
}

export default function ClientKnowledgeBase() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [modalEntry, setModalEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("client_id");
  const clientName = params.get("client_name") || "Client";

  const visibleCategories = CAN_SEE_FINANCE_ROLES.includes(user?.role)
    ? CATEGORIES
    : CATEGORIES.filter((c) => !c.restricted);

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => api.auth.redirectToLogin());
    if (clientId) loadEntries();
  }, [clientId]);

  const loadEntries = async () => {
    setLoading(true);
    const data = await api.entities.KnowledgeBaseEntry.filter({ client_id: clientId });
    setEntries(data);
    setLoading(false);
  };

  const handleDelete = async (entry) => {
    if (!confirm(`Delete "${entry.title}"?`)) return;
    await api.entities.KnowledgeBaseEntry.delete(entry.id);
    await loadEntries();
  };

  const handleAccessEntry = async (entry) => {
    await api.entities.KnowledgeBaseEntry.update(entry.id, {
      access_count: (entry.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString(),
    });
  };

  const canEdit = CAN_EDIT_ROLES.includes(user?.role);

  const filteredEntries = entries.filter((e) => {
    if (!CAN_SEE_FINANCE_ROLES.includes(user?.role) && e.category === "Payroll and Finance")
      return false;
    if (activeCategory && e.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.title?.toLowerCase().includes(q) ||
        e.content?.toLowerCase().includes(q) ||
        (e.tags || []).some((t) => t.includes(q))
      );
    }
    return true;
  });

  const entriesByCategory = (cat) =>
    entries.filter(
      (e) =>
        e.category === cat &&
        (CAN_SEE_FINANCE_ROLES.includes(user?.role) || cat !== "Payroll and Finance")
    ).length;

  if (!clientId)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="client-knowledge-base"
        title="Knowledge Base"
        breadcrumbs={["Clients", "Knowledge Base"]}
      >
        <div className="text-center p-12 text-slate-400">
          No client selected. Add ?client_id=xxx to the URL.
        </div>
      </StaffinglyLayout>
    );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="client-knowledge-base"
      title={`Knowledge Base — ${clientName}`}
      breadcrumbs={["Clients", clientName, "Knowledge Base"]}
    >
      <div className="max-w-[1300px] mx-auto space-y-5">
        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries by title, content, or tag…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
            />
          </div>
          <div className="flex-1" />
          {canEdit && (
            <button
              onClick={() => {
                setModalEntry(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90"
              style={{ backgroundColor: "#293682" }}
            >
              <Plus className="w-4 h-4" /> New Entry
            </button>
          )}
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {visibleCategories.map((cat) => {
            const count = entriesByCategory(cat.key);
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(isActive ? null : cat.key)}
                className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${isActive ? "border-current" : "border-slate-200 bg-white"}`}
                style={isActive ? { backgroundColor: cat.bg, borderColor: cat.color } : {}}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-lg font-bold" style={{ color: cat.color }}>
                    {count}
                  </span>
                </div>
                <p className="font-bold text-sm" style={{ color: cat.color }}>
                  {cat.key}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{cat.desc}</p>
                {cat.restricted && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 mt-1">
                    🔒 Restricted
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active filter label */}
        {activeCategory && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              Showing: <strong className="text-slate-800">{activeCategory}</strong>
            </span>
            <button
              onClick={() => setActiveCategory(null)}
              className="text-xs text-[#293682] hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Entries Grid */}
        {loading ? (
          <div className="text-center p-12">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No entries found</p>
            <p className="text-xs text-slate-400 mt-1">
              {canEdit
                ? "Click 'New Entry' to add the first entry for this client."
                : "No knowledge base entries match your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                user={user}
                onEdit={(e) => {
                  setModalEntry(e);
                  setShowModal(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <EntryModal
          entry={modalEntry}
          clientId={clientId}
          clientName={clientName}
          user={user}
          onSave={() => {
            setShowModal(false);
            loadEntries();
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </StaffinglyLayout>
  );
}
