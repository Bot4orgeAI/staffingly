import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityFilterQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Save, CheckCircle, Loader2, AlertTriangle, RefreshCw, FolderOpen } from "lucide-react";

const STORAGE_OPTIONS = [
  {
    key: "staffingly_portal",
    label: "Staffingly Secure Upload Portal",
    desc: "Built-in drag & drop portal. No external account needed.",
    icon: "🔒",
    color: "#293682",
    bg: "#eef3ff",
    credentialLabel: null,
  },
  {
    key: "google_drive",
    label: "Google Drive",
    desc: "Connect via Google Drive API using a service account.",
    icon: "🟦",
    color: "#4285F4",
    bg: "#EBF2FF",
    credentialLabel: "Service Account Key Reference (Google Secret Manager)",
  },
  {
    key: "onedrive",
    label: "Microsoft OneDrive",
    desc: "Connect via Microsoft Graph API using OAuth credentials.",
    icon: "🔷",
    color: "#0078D4",
    bg: "#E5F2FF",
    credentialLabel: "OAuth Client Secret Reference (Google Secret Manager)",
  },
  {
    key: "dropbox",
    label: "Dropbox",
    desc: "Connect via Dropbox API using app credentials.",
    icon: "📦",
    color: "#0061FF",
    bg: "#E5EEFF",
    credentialLabel: "App Credentials Reference (Google Secret Manager)",
  },
];

const SYNC_FREQUENCIES = [
  { value: 5, label: "Every 5 minutes", note: "High-volume clients" },
  { value: 15, label: "Every 15 minutes", note: "Standard (recommended)" },
  { value: 30, label: "Every 30 minutes", note: "Low-volume / cost reduction" },
];

export default function ClientStorageSettings() {
  const { data: user, isLoading: _loadingUser } = useAuthUserQuery();
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("client_id");

  const [testResult, setTestResult] = useState(null);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    storage_type: "staffingly_portal",
    credential_key_ref: "",
    sync_frequency_minutes: 15,
    sync_enabled: true,
  });

  const { data: rawConfig = null, isLoading: _loadingConfig } = useEntityFilterQuery(
    "ClientStorageConfig",
    clientId ? { client_id: clientId } : {},
    {
      enabled: Boolean(clientId),
      select: (data) => data[0] || null,
    }
  );

  /** @type {any} */
  const config = rawConfig;

  useEffect(() => {
    if (!config) return;
    setForm({
      storage_type: config.storage_type,
      credential_key_ref: config.credential_key_ref || "",
      sync_frequency_minutes: config.sync_frequency_minutes || 15,
      sync_enabled: config.sync_enabled !== false,
    });
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (config) {
        return api.entities.ClientStorageConfig.update(config.id, form);
      }
      return api.entities.ClientStorageConfig.create({ client_id: clientId, ...form });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "ClientStorageConfig"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: () =>
      api.functions.invoke("testStorageConnection", {
        storage_type: form.storage_type,
        credential_key_ref: form.credential_key_ref,
        client_id: clientId,
      }),
    onSuccess: (res) => {
      setTestResult(res.data);
    },
  });

  const createFoldersMutation = useMutation({
    mutationFn: () => api.functions.invoke("createFolderStructure", { client_id: clientId }),
    onSuccess: async (res) => {
      setTestResult(res.data);
      await queryClient.invalidateQueries({ queryKey: ["entity", "ClientStorageConfig"] });
    },
  });

  const handleSave = async () => {
    setTestResult(null);
    await saveMutation.mutateAsync();
  };

  const handleTest = async () => {
    setTestResult(null);
    await testMutation.mutateAsync();
  };

  const handleCreateFolders = async () => {
    await createFoldersMutation.mutateAsync();
  };

  const selectedOption = STORAGE_OPTIONS.find((o) => o.key === form.storage_type);

  if (!clientId)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="client-storage-settings"
        title="Storage Settings"
        breadcrumbs={["Clients", "Storage Settings"]}
      >
        <div className="text-center p-12 text-slate-400">
          No client selected. Add ?client_id= to the URL.
        </div>
      </StaffinglyLayout>
    );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="client-storage-settings"
      title="Cloud Storage Configuration"
      breadcrumbs={["Clients", "Storage Settings"]}
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Provider Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-1">Storage Provider</h3>
          <p className="text-xs text-slate-400 mb-4">
            Select how this client shares documents with Staffingly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STORAGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() =>
                  setForm((f) => ({ ...f, storage_type: opt.key, credential_key_ref: "" }))
                }
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${form.storage_type === opt.key ? "border-[#293682]" : "border-slate-200 hover:border-slate-300"}`}
                style={form.storage_type === opt.key ? { backgroundColor: "#eef3ff" } : {}}
              >
                <span className="text-2xl leading-none">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-sm"
                    style={{ color: form.storage_type === opt.key ? "#293682" : "#1e293b" }}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Credentials */}
        {selectedOption?.credentialLabel && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-1">Credentials</h3>
            <div className="mb-3 rounded-xl p-3 bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Never paste actual credentials here. Store credentials in{" "}
                <strong>Google Secret Manager</strong> and enter only the reference key name below.
              </p>
            </div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {selectedOption.credentialLabel}
            </label>
            <input
              value={form.credential_key_ref}
              onChange={(e) => setForm((f) => ({ ...f, credential_key_ref: e.target.value }))}
              placeholder="e.g. projects/staffingly-prod/secrets/client-acme-gdrive-sa/versions/latest"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
            />
          </div>
        )}

        {/* Sync Frequency */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-1">Sync Frequency</h3>
          <p className="text-xs text-slate-400 mb-4">
            How often the system checks for new documents in Incoming Documents folder.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {SYNC_FREQUENCIES.map((f) => (
              <button
                key={f.value}
                onClick={() => setForm((prev) => ({ ...prev, sync_frequency_minutes: f.value }))}
                className={`p-3 rounded-xl border-2 text-left transition-all ${form.sync_frequency_minutes === f.value ? "border-[#293682]" : "border-slate-200 hover:border-slate-300"}`}
                style={
                  form.sync_frequency_minutes === f.value ? { backgroundColor: "#eef3ff" } : {}
                }
              >
                <p
                  className="font-bold text-sm"
                  style={{ color: form.sync_frequency_minutes === f.value ? "#293682" : "#1e293b" }}
                >
                  {f.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{f.note}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="sync_enabled"
              checked={form.sync_enabled}
              onChange={(e) => setForm((f) => ({ ...f, sync_enabled: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="sync_enabled" className="text-sm font-semibold text-slate-700">
              Enable automatic sync for this client
            </label>
          </div>
        </div>

        {/* Folder Structure */}
        {config && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Folder Structure</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standard folders auto-created in client's storage.
                </p>
              </div>
              {!config.folder_structure_created && (
                <button
                  onClick={handleCreateFolders}
                  disabled={createFoldersMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: "#293682" }}
                >
                  {createFoldersMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderOpen className="w-4 h-4" />
                  )}
                  {createFoldersMutation.isPending ? "Creating…" : "Create Folders"}
                </button>
              )}
            </div>

            {config.folder_structure_created ? (
              <div className="space-y-2">
                {[
                  ["Root Folder", config.root_folder_id],
                  ["Incoming Documents", config.incoming_folder_id],
                  ["Processed Documents", config.processed_folder_id],
                  ["Archive", config.archive_folder_id],
                  ["Reports", config.reports_folder_id],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-semibold text-slate-700">{label}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400 truncate max-w-[200px]">
                      {val || "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FolderOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Folder structure not yet created.</p>
              </div>
            )}
          </div>
        )}

        {/* Sync Status */}
        {config && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Sync Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  Last Sync
                </p>
                <p className="font-semibold text-slate-700">
                  {config.last_sync_at ? new Date(config.last_sync_at).toLocaleString() : "Never"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  Last Status
                </p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    config.last_sync_status === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : config.last_sync_status === "failed"
                        ? "bg-red-50 text-red-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {config.last_sync_status || "never"}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  Connection Verified
                </p>
                <p className="font-semibold text-slate-700">
                  {config.connection_verified
                    ? `Yes — ${new Date(config.connection_verified_at).toLocaleDateString()}`
                    : "Not verified"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  Sync Enabled
                </p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${config.sync_enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {config.sync_enabled ? "Active" : "Paused"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div
            className={`rounded-xl p-4 border-2 ${testResult.success ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}
          >
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className="font-bold text-sm"
                  style={{ color: testResult.success ? "#15803d" : "#b91c1c" }}
                >
                  {testResult.success ? "Connection test passed" : "Connection test failed"}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: testResult.success ? "#166534" : "#991b1b" }}
                >
                  {testResult.message || testResult.error}
                </p>
                {testResult.note && (
                  <p className="text-xs mt-1 text-slate-500 italic">{testResult.note}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-[#293682] text-[#293682] font-bold text-sm disabled:opacity-50 hover:bg-[#eef3ff] transition-colors"
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {testMutation.isPending ? "Testing…" : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#293682" }}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveMutation.isPending ? "Saving…" : "Save Configuration"}
          </button>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
