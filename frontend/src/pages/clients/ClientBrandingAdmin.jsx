import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import apiClient from "@/lib/api/clients/apiClient";
import { useAuthUserQuery, useEntityListQuery, useEntityFilterQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import {
  Save,
  Loader2,
  Upload,
  CheckCircle,
  Palette,
  Globe,
  Image,
  Building2,
  Monitor,
  FileImage,
} from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const ALLOWED_ROLES = ["super_admin", "staffingly_admin", "admin"];

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

function getClientDisplayName(client) {
  return client?.practiceName || client?.practice_name || client?.name || "Unnamed client";
}

function getClientSubdomain(client) {
  return client?.subdomain || "";
}

function getAccentWash(color, alpha = "14") {
  return { backgroundColor: `${color}${alpha}` };
}

function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiClient.baseUrl}${url}`;
}

export default function ClientBrandingAdmin() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingAuth } = useAuthUserQuery();
  const normalizedRole = (user?.role || "").toLowerCase();
  const canAccess = ALLOWED_ROLES.includes(normalizedRole);

  const params = new URLSearchParams(window.location.search);
  const preClient = params.get("client_id");

  const [selectedClientId, setSelectedClientId] = useState(preClient || "");

  const { data: clients = [], isLoading: loadingClients } = useEntityListQuery(
    "StaffinglyClient",
    null,
    100,
    { enabled: Boolean(user && canAccess) }
  );

  const { data: brandingData = [], isLoading: loadingBranding } = useEntityFilterQuery(
    "ClientBranding",
    { client_id: selectedClientId },
    { enabled: Boolean(user && selectedClientId) }
  );

  const branding = brandingData[0] || null;
  const loading = loadingAuth || loadingClients || loadingBranding;
  const selectedClient = clients.find((client) => client.id === selectedClientId) || null;

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
    if (!clients.length) return;
    if (!selectedClientId) {
      setSelectedClientId(preClient || clients[0].id);
      return;
    }

    if (!clients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId, preClient]);

  useEffect(() => {
    if (!selectedClientId) return;
    if (branding) {
      setForm({
        accent_color: branding.accentColor || branding.accent_color || "#293682",
        practice_name:
          branding.companyName || branding.company_name || getClientDisplayName(selectedClient),
        subdomain: getClientSubdomain(selectedClient),
        portal_welcome_message: branding.welcomeMessage || branding.welcome_message || "",
        logo_url: branding.logoUrl || branding.logo_url || "",
      });
    } else if (clients.length > 0) {
      const client = clients.find((c) => c.id === selectedClientId);
      setForm((f) => ({
        ...f,
        practice_name: getClientDisplayName(client),
        subdomain: getClientSubdomain(client),
      }));
    }
  }, [selectedClientId, branding, clients, selectedClient]);

  const previewName = form.practice_name?.trim() || getClientDisplayName(selectedClient);
  const previewSubdomain = form.subdomain?.trim() || getClientSubdomain(selectedClient);
  const previewWelcome =
    form.portal_welcome_message?.trim() ||
    "Welcome to your secure client portal. Review cases, monitor progress, and stay aligned with your Staffingly workflow.";
  const previewAccent = form.accent_color || "#293682";
  const previewUrl = previewSubdomain
    ? `https://${previewSubdomain}.staffverify.com`
    : "https://yourpractice.staffverify.com";
  const previewInitial = previewName?.charAt(0)?.toUpperCase() || "C";
  const logoPreviewUrl = resolveAssetUrl(form.logo_url);

  const updateBrandingMutation = useMutation({
    mutationFn: async () => {
      const brandingPayload = {
        clientId: selectedClientId,
        companyName: form.practice_name?.trim() || null,
        welcomeMessage: form.portal_welcome_message?.trim() || null,
        logoUrl: form.logo_url || null,
        accentColor: form.accent_color || "#293682",
      };

      const clientPayload = {
        practiceName: form.practice_name?.trim() || null,
        subdomain: form.subdomain?.trim() || null,
      };

      await api.entities.Client.update(selectedClientId, clientPayload);

      return branding?.id
        ? api.entities.ClientBranding.update(branding.id, brandingPayload)
        : api.entities.ClientBranding.create(brandingPayload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "StaffinglyClient"] });
      await queryClient.invalidateQueries({ queryKey: ["entity", "Client"] });
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
    try {
      await updateBrandingMutation.mutateAsync();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
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

  if (!canAccess)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="client-branding-admin"
        title="Client Branding"
        breadcrumbs={["Admin", "Client Branding"]}
      >
        <div className="text-center p-12 text-slate-400">
          Access restricted to platform admins only.
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
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                The PRD calls for multi-tenant client management with white-label branding options.
                Use this page to shape the portal identity each provider organization sees.
              </p>
            </div>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <Building2 className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-800">No clients available</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add a client first, then return here to configure its branded portal experience.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Active client
                  </span>
                  <AppSelect
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                    options={clients.map((c) => ({ label: getClientDisplayName(c), value: c.id }))}
                    placeholder="— Select a client —"
                    triggerClassName="h-11 w-[320px] rounded-2xl px-4 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {selectedClientId ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(460px,1.1fr)]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                          <Globe className="w-5 h-5 text-slate-500" />
                          Portal Identity
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Control how this client is introduced inside the branded portal.
                        </p>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-xs font-semibold text-slate-700"
                        style={getAccentWash(previewAccent)}
                      >
                        White-label ready
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,300px)]">
                      <div className="max-w-[320px]">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Practice Name
                        </label>
                        <input
                          value={form.practice_name}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, practice_name: e.target.value }))
                          }
                          placeholder="North Ridge Cardiology"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                      </div>

                      <div className="max-w-[300px]">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Portal Subdomain
                        </label>
                        <div className="flex items-center overflow-hidden rounded-xl border border-slate-200">
                          <input
                            value={form.subdomain}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                subdomain: e.target.value
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")
                                  .replace(/[^a-z0-9-]/g, ""),
                              }))
                            }
                            placeholder="northridge"
                            className="min-w-0 flex-1 px-3 py-2.5 font-mono text-sm outline-none"
                          />
                          <span className="shrink-0 whitespace-nowrap border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
                            .staffverify.com
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Welcome Message
                      </label>
                      <textarea
                        value={form.portal_welcome_message}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, portal_welcome_message: e.target.value }))
                        }
                        rows={4}
                        placeholder="Welcome to your secure prior authorization portal..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                      <Image className="w-5 h-5 text-slate-500" />
                      Brand Assets
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Add the client’s logo so the portal feels native to their organization.
                    </p>

                    <label className="mt-4 block cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Practice logo</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Upload a clean logo asset for the portal header and branded shell.
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            form.logo_url
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {form.logo_url ? "Ready" : "Missing"}
                        </span>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {form.logo_url ? (
                          <div className="flex h-32 items-center justify-center p-4">
                            <img
                              src={logoPreviewUrl}
                              alt="Logo"
                              className="h-16 max-w-[220px] object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex h-32 flex-col items-center justify-center gap-2 px-4 text-center">
                            <FileImage className="h-9 w-9 text-slate-300" />
                            <p className="text-xs text-slate-500">
                              Click to browse or drop a logo file here
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <Upload className="h-4 w-4 text-[#293682]" />
                          )}
                          <span className="font-semibold text-[#293682]">
                            {uploading
                              ? "Uploading logo..."
                              : form.logo_url
                                ? "Replace logo"
                                : "Choose logo"}
                          </span>
                        </div>
                        {form.logo_url ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              setForm((f) => ({ ...f, logo_url: "" }));
                            }}
                            className="font-semibold text-slate-500 hover:text-slate-700"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-slate-400">PNG, SVG or JPG, 200x60px</span>
                        )}
                      </div>

                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && handleLogoUpload(e.target.files[0])}
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                          <Palette className="w-5 h-5 text-slate-500" />
                          Visual Theme
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Set the primary accent used for navigation and actions.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <input
                          type="color"
                          value={form.accent_color}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, accent_color: e.target.value.toUpperCase() }))
                          }
                          className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                        <input
                          value={form.accent_color}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, accent_color: e.target.value.toUpperCase() }))
                          }
                          placeholder="#293682"
                          className="w-28 bg-transparent text-sm font-semibold text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {ACCENT_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => setForm((f) => ({ ...f, accent_color: c.hex }))}
                          className={`rounded-xl border p-3 text-left transition ${
                            form.accent_color === c.hex
                              ? "border-slate-400 shadow-sm"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                          style={form.accent_color === c.hex ? getAccentWash(c.hex) : undefined}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-6 w-6 rounded-full"
                              style={{ backgroundColor: c.hex }}
                            />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{c.label}</p>
                              <p className="text-[11px] text-slate-400">{c.hex}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Pick one of the preset colors, use the color wheel, or type a custom hex code.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Save Branding</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Publish these settings to the selected client portal.
                        </p>
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
                        style={{ backgroundColor: saved ? "#15803d" : "#293682" }}
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving ? "Saving..." : saved ? "Saved!" : "Save Branding"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="sticky top-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Live Preview
                        </p>
                        <h3 className="mt-1 text-base font-bold text-slate-900">
                          Branded client portal
                        </h3>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-xs font-semibold text-slate-700"
                        style={getAccentWash(previewAccent)}
                      >
                        {previewAccent}
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                        {logoPreviewUrl ? (
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <img
                              src={logoPreviewUrl}
                              alt={previewName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white"
                            style={{ backgroundColor: previewAccent }}
                          >
                            {previewInitial}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {previewName}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">{previewUrl}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-[120px_minmax(0,1fr)]">
                        <div className="border-r border-slate-200 bg-white p-3">
                          <div
                            className="rounded-xl px-3 py-2 text-[11px] font-semibold text-white"
                            style={{ backgroundColor: previewAccent }}
                          >
                            Dashboard
                          </div>
                          <div className="mt-2 space-y-2 text-[11px] text-slate-400">
                            <div className="rounded-xl bg-slate-100 px-3 py-2">Cases</div>
                            <div className="rounded-xl bg-slate-100 px-3 py-2">Reports</div>
                            <div className="rounded-xl bg-slate-100 px-3 py-2">Billing</div>
                          </div>
                        </div>

                        <div className="space-y-3 p-4">
                          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                            <div className="flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-slate-400" />
                              <p className="text-sm font-semibold text-slate-800">Welcome panel</p>
                            </div>
                            <p className="mt-3 text-xs leading-5 text-slate-500">
                              {previewWelcome}
                            </p>
                            <button
                              className="mt-4 rounded-xl px-3 py-2 text-xs font-bold text-white"
                              style={{ backgroundColor: previewAccent }}
                            >
                              Review Cases
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Header
                              </p>
                              <div
                                className="mt-3 h-8 rounded-xl"
                                style={getAccentWash(previewAccent)}
                              />
                            </div>
                            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                CTA
                              </p>
                              <div
                                className="mt-3 inline-flex rounded-xl px-3 py-2 text-[11px] font-bold text-white"
                                style={{ backgroundColor: previewAccent }}
                              >
                                Active
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </StaffinglyLayout>
  );
}
