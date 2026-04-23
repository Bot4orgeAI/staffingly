import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityListQuery, useEntityFilterQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Save, Loader2, Upload, CheckCircle, Palette, Globe, Image } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const ALLOWED_ROLES = ["super_admin"];

const ACCENT_COLORS = [
  { label: "Staffingly Blue", hex: "#293682" },
  { label: "Teal", hex: "#0a7e87" },
  { label: "Forest Green", hex: "#15803d" },
  { label: "Indigo", hex: "#4f46e5" },
  { label: "Purple", hex: "#7c3aed" },
  { label: "Navy", hex: "#1e3a5f" },
  { label: "Slate", hex: "#475569" },
  { label: "Gold", hex: "#b45309" },
];

export default function ClientBrandingAdmin() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingAuth } = useAuthUserQuery();

  const params = new URLSearchParams(window.location.search);
  const preClient = params.get("client_id");

  const [selectedClientId, setSelectedClientId] = useState(preClient || "");

  const { data: clients = [], isLoading: loadingClients } = useEntityListQuery(
    "StaffinglyClient",
    null,
    1000,
    { enabled: Boolean(user && ALLOWED_ROLES.includes(user.role)) }
  );

  const { data: brandingData = [], isLoading: loadingBranding } = useEntityFilterQuery(
    "ClientBranding",
    { client_id: selectedClientId },
    { enabled: Boolean(user && selectedClientId) }
  );

  const branding = brandingData[0] || null;
  const loading = loadingAuth || loadingClients || loadingBranding;

  const [form, setForm] = useState({
    accent_color: "#293682",
    practice_name: "",
    subdomain: "",
    portal_welcome_message: "",
    logo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedClientId) return;
    if (branding) {
      setForm({
        accent_color: branding.accent_color || "#293682",
        practice_name: branding.practice_name || "",
        subdomain: branding.subdomain || "",
        portal_welcome_message: branding.portal_welcome_message || "",
        logo_url: branding.logo_url || "",
      });
    } else if (clients.length > 0) {
      const client = clients.find((c) => c.id === selectedClientId);
      setForm((f) => ({
        ...f,
        practice_name: client?.practice_name || "",
        subdomain: client?.subdomain || "",
      }));
    }
  }, [selectedClientId, branding, clients]);

  const updateBrandingMutation = useMutation({
    mutationFn: /** @param {Record<string, any>} payload */ (payload) =>
      branding?.id
        ? api.entities.ClientBranding.update(branding.id, payload)
        : api.entities.ClientBranding.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "ClientBranding"] });
    },
  });

  const handleLogoUpload = async (file) => {
    setUploading(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, logo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    const payload = {
      ...form,
      client_id: selectedClientId,
      updated_by: user?.email,
      updated_at: new Date().toISOString(),
    };
    await updateBrandingMutation.mutateAsync(payload);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="client-branding-admin"
        title="Client Branding"
        breadcrumbs={["Admin", "Client Branding"]}
      >
        <div className="text-center p-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
        </div>
      </StaffinglyLayout>
    );

  if (!ALLOWED_ROLES.includes(user?.role))
    return (
      <StaffinglyLayout
        user={user}
        currentPage="client-branding-admin"
        title="Client Branding"
        breadcrumbs={["Admin", "Client Branding"]}
      >
        <div className="text-center p-12 text-slate-400">
          Access restricted to Super Admins only.
        </div>
      </StaffinglyLayout>
    );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="client-branding-admin"
      title="Client Portal Branding"
      breadcrumbs={["Admin", "Client Branding"]}
    >
      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Client Portal Branding</h1>
              <p className="mt-2 text-sm text-slate-500">
                Customize the appearance and identity of the portal for each client.
              </p>
            </div>
          </div>
        </div>

        {/* Client Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-sm">
          <div className="flex flex-wrap gap-3 flex-1 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Select Client
            </span>
            <AppSelect
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              options={clients.map((c) => ({ label: c.practice_name, value: c.id }))}
              placeholder="— Select a client —"
              triggerClassName="h-9 w-[300px] rounded-xl px-3 py-2 text-xs"
            />
          </div>
        </div>

        {selectedClientId && (
          <div className="max-w-2xl space-y-5">
            {/* Practice Name & Subdomain */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Portal Identity
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Practice Name (shown in portal)
                </label>
                <input
                  value={form.practice_name}
                  onChange={(e) => setForm((f) => ({ ...f, practice_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subdomain</label>
                <div className="flex items-center gap-0">
                  <input
                    value={form.subdomain}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        subdomain: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                      }))
                    }
                    placeholder="practicename"
                    className="flex-1 px-3 py-2 border border-r-0 border-slate-200 rounded-l-xl text-sm focus:outline-none font-mono"
                  />
                  <span className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-r-xl text-xs text-slate-400">
                    .staffauth.com
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Welcome Message (optional)
                </label>
                <textarea
                  value={form.portal_welcome_message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, portal_welcome_message: e.target.value }))
                  }
                  rows={2}
                  placeholder="Welcome to your prior authorization portal…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Image className="w-4 h-4" /> Practice Logo
              </h3>
              {form.logo_url ? (
                <div className="flex items-center gap-4 mb-3">
                  <img
                    src={form.logo_url}
                    alt="Logo"
                    className="h-14 object-contain rounded-xl border border-slate-200 p-2"
                  />
                  <button
                    onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-[#293682] transition-colors w-fit">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <Upload className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm text-slate-600">
                  {uploading ? "Uploading…" : "Upload Logo"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && handleLogoUpload(e.target.files[0])}
                />
              </label>
              <p className="text-xs text-slate-400 mt-2">
                PNG, SVG or JPG. Recommended: 200×60px transparent background.
              </p>
            </div>

            {/* Accent Color */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4" /> Accent Color
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setForm((f) => ({ ...f, accent_color: c.hex }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${form.accent_color === c.hex ? "border-current" : "border-slate-200"}`}
                    style={
                      form.accent_color === c.hex
                        ? { borderColor: c.hex, backgroundColor: `${c.hex}10` }
                        : {}
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-xs font-semibold text-slate-600">{c.label}</span>
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-4 rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-xs text-slate-500 mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: form.accent_color }}
                  >
                    {form.practice_name?.charAt(0) || "P"}
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    {form.practice_name || "Practice Name"}
                  </p>
                  <span
                    className="ml-auto px-3 py-1.5 rounded-xl text-white text-xs font-bold"
                    style={{ backgroundColor: form.accent_color }}
                  >
                    Button
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: saved ? "#15803d" : "#293682" }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving…" : saved ? "Saved!" : "Save Branding"}
            </button>
          </div>
        )}
      </div>
    </StaffinglyLayout>
  );
}
