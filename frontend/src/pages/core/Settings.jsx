import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import { toast } from "@/components/ui/use-toast";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import AvailityApiSection from "@/components/insuverif/AvailityApiSection";
import AppSelect from "@/components/ui/app-select";
import { Input } from "@/components/ui/input";
import {
  Search,
  Users,
  Building2,
  ShieldCheck,
  Loader2,
  Wifi,
  WifiOff,
  X,
  Settings2,
} from "lucide-react";

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  STAFFINGLY_ADMIN: "Staffingly Admin",
  STAFFINGLY_SUPERVISOR: "Supervisor",
  STAFFINGLY_SPECIALIST: "Specialist",
  CLIENT_USER: "Client User",
  FINANCE_ADMIN: "Finance Admin",
};

const AUTH_TYPE_OPTIONS = [
  { label: "SMART on FHIR", value: "smart_on_fhir" },
  { label: "Backend OAuth", value: "backend_oauth" },
  { label: "API Key / Custom", value: "api_key" },
];

const FHIR_VERSION_OPTIONS = [
  { label: "FHIR R4", value: "R4" },
  { label: "FHIR STU3", value: "STU3" },
  { label: "FHIR DSTU2", value: "DSTU2" },
];

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EhrLogo({ name, src }) {
  return (
    <div className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
      <img src={src} alt={`${name} logo`} className="h-7 w-auto max-w-[140px] object-contain" />
    </div>
  );
}

function ConnectModal({ emr, clientId, clientName, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    environmentLabel: "",
    baseUrl: "",
    authType: "smart_on_fhir",
    clientAppId: "",
    clientSecret: "",
    redirectUri: "",
    scopes: "",
    fhirVersion: "R4",
  });
  const [saving, setSaving] = useState(false);

  const { data: configResponse, isLoading } = useQuery({
    queryKey: ["settings", "emr-config", emr?.id, clientId],
    queryFn: () => api.emr.getSystemConfig(emr.id, { clientId }),
    enabled: Boolean(emr?.id && clientId),
  });

  useEffect(() => {
    if (configResponse?.data?.config) {
      setForm((current) => ({ ...current, ...configResponse.data.config }));
    }
  }, [configResponse]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      await api.emr.saveSystemConfig(emr.id, {
        clientId,
        ...form,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings", "emr-config", emr.id, clientId] }),
        queryClient.invalidateQueries({ queryKey: ["emr", "systems"] }),
        queryClient.invalidateQueries({ queryKey: ["entity", "Client"] }),
        queryClient.invalidateQueries({ queryKey: ["settings", "overview"] }),
      ]);
      toast({
        title: "Connection saved",
        description: `${emr.name} is configured for ${clientName}.`,
        variant: "success",
      });
      onSaved();
    } catch (error) {
      toast({
        title: "Unable to save EMR configuration",
        description: error?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-10">
          <h2 className="text-xl font-bold text-slate-900">Manage {emr.name} connection</h2>
          <p className="mt-2 text-sm text-slate-500">
            Save backend EMR credentials and connection metadata for {clientName}.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">{emr.protocol}</p>
          <p className="mt-1">
            These values are loaded from the backend and stored per client workspace.
          </p>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading saved configuration...
            </span>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Environment Label
            </label>
            <Input
              value={form.environmentLabel}
              onChange={(event) => update("environmentLabel", event.target.value)}
              placeholder="Epic Sandbox"
              className="h-11 rounded-2xl border-slate-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              FHIR Version
            </label>
            <AppSelect
              value={form.fhirVersion}
              onValueChange={(value) => update("fhirVersion", value)}
              options={FHIR_VERSION_OPTIONS}
              triggerClassName="h-11 rounded-2xl border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Base URL
          </label>
          <Input
            value={form.baseUrl}
            onChange={(event) => update("baseUrl", event.target.value)}
            placeholder="https://fhir.epic.example.com/interconnect-fhir-oauth/api/FHIR/R4"
            className="h-11 rounded-2xl border-slate-200"
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Auth Type
            </label>
            <AppSelect
              value={form.authType}
              onValueChange={(value) => update("authType", value)}
              options={AUTH_TYPE_OPTIONS}
              triggerClassName="h-11 rounded-2xl border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Client App ID
            </label>
            <Input
              value={form.clientAppId}
              onChange={(event) => update("clientAppId", event.target.value)}
              placeholder="Epic app client ID"
              className="h-11 rounded-2xl border-slate-200"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Client Secret
            </label>
            <Input
              type="password"
              value={form.clientSecret}
              onChange={(event) => update("clientSecret", event.target.value)}
              placeholder="Optional for some flows"
              className="h-11 rounded-2xl border-slate-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Redirect URI
            </label>
            <Input
              value={form.redirectUri}
              onChange={(event) => update("redirectUri", event.target.value)}
              placeholder="https://app.example.com/auth/epic/callback"
              className="h-11 rounded-2xl border-slate-200"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Requested Scopes
          </label>
          <Input
            value={form.scopes}
            onChange={(event) => update("scopes", event.target.value)}
            placeholder="launch/patient patient/Patient.read patient/Coverage.read"
            className="h-11 rounded-2xl border-slate-200"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl bg-[#0a7e87] py-3 text-sm font-semibold text-white transition hover:bg-[#08656c] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isSpecialist = role === "STAFFINGLY_SPECIALIST";
  const classes = isSuperAdmin
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : isSpecialist
      ? "bg-teal-50 text-teal-700 border-teal-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export default function Settings() {
  const { data: user } = useAuthUserQuery();
  const [activeSection, setActiveSection] = useState("emr");
  const [payerSearch, setPayerSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [connectModal, setConnectModal] = useState(null);

  useEffect(() => {
    if (
      user &&
      !["super_admin", "staffingly_admin", "admin"].includes((user.role || "").toLowerCase())
    ) {
      window.location.href = createPageUrl("dashboard");
    }
  }, [user]);

  const { data: payerRules = [] } = useEntityListQuery("PayerRule", { limit: 100 });
  const { data: users = [] } = useEntityListQuery("User", { limit: 100 });
  const { data: clients = [] } = useEntityListQuery("Client", { limit: 200 });
  const { data: overviewResponse } = useQuery({
    queryKey: ["settings", "overview"],
    queryFn: () => api.settings.getOverview(),
  });
  const { data: systemsResponse, isLoading: systemsLoading } = useQuery({
    queryKey: ["emr", "systems", selectedClientId || "global"],
    queryFn: () => api.emr.listSystems(selectedClientId ? { clientId: selectedClientId } : {}),
  });

  const overview = overviewResponse?.data || null;
  const ehrSystems = systemsResponse?.data || [];

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        label: client.name,
        value: client.id,
      })),
    [clients]
  );

  const selectedClient = clients.find((client) => client.id === selectedClientId) || null;

  const emrUsage = useMemo(() => {
    return clients.reduce((accumulator, client) => {
      if (!client.emrSystem) return accumulator;

      const current = accumulator[client.emrSystem] || {
        connectedClients: 0,
        configuredClients: 0,
      };
      current.connectedClients += 1;

      try {
        const config = client.emrConfigJson ? JSON.parse(client.emrConfigJson) : null;
        if (config?.baseUrl) {
          current.configuredClients += 1;
        }
      } catch {
        // Ignore malformed saved config when building UI counts.
      }

      accumulator[client.emrSystem] = current;
      return accumulator;
    }, {});
  }, [clients]);

  const filteredPayers = payerRules.filter((payer) =>
    (payer.payerName || "").toLowerCase().includes(payerSearch.toLowerCase())
  );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="settings"
      title="System Settings"
      breadcrumbs={["System", "Settings"]}
    >
      {connectModal ? (
        <ConnectModal
          emr={connectModal}
          clientId={selectedClientId}
          clientName={selectedClient?.name || "Selected Client"}
          onClose={() => setConnectModal(null)}
          onSaved={() => setConnectModal(null)}
        />
      ) : null}

      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-xl font-semibold text-slate-900">System Settings</h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage integration readiness, connected workspaces, payer reference data, and admin
                user visibility from live backend data.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={Building2}
                label="Active Clients"
                value={overview?.clients?.active ?? clients.length}
                tone="bg-blue-50 text-blue-700"
              />
              <MetricCard
                icon={Users}
                label="Platform Users"
                value={overview?.users?.total ?? users.length}
                tone="bg-emerald-50 text-emerald-700"
              />
            </div>
          </div>
        </div>

        <div className="flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1">
          {[
            { key: "emr", label: "EMR Connections" },
            { key: "availity", label: "Availity API" },
            { key: "payers", label: "Payer Directory" },
            { key: "users", label: "User Management" },
          ].map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                activeSection === section.key
                  ? "bg-[#293682] text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === "emr" ? (
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">EMR Connection Catalog</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a client workspace to manage saved connection details, or leave it blank
                    to review platform-wide adoption.
                  </p>
                </div>
                <div className="w-full max-w-sm">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Client Workspace
                  </label>
                  <AppSelect
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                    options={clientOptions}
                    placeholder="Select Client Workspace"
                    triggerClassName="h-11 rounded-2xl border-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                icon={Wifi}
                label="Connected Clients"
                value={overview?.clients?.emrConnected ?? 0}
                tone="bg-emerald-50 text-emerald-700"
              />
              <MetricCard
                icon={ShieldCheck}
                label="Availity Ready"
                value={overview?.availity?.configured ? "Yes" : "No"}
                tone="bg-violet-50 text-violet-700"
              />
              <MetricCard
                icon={Settings2}
                label="Audit Events (7d)"
                value={overview?.audit?.eventsLast7Days ?? 0}
                tone="bg-amber-50 text-amber-700"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {systemsLoading ? (
                <div className="col-span-full rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center text-slate-400 shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading EMR systems...
                  </span>
                </div>
              ) : (
                ehrSystems.map((emr) => {
                  const usage = emrUsage[emr.id] || { connectedClients: 0, configuredClients: 0 };
                  return (
                    <div
                      key={emr.id}
                      className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <EhrLogo name={emr.name} src={emr.logoSrc} />
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            selectedClientId
                              ? emr.isConnected
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                              : usage.connectedClients > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {selectedClientId ? (
                            emr.isConnected ? (
                              <>
                                <Wifi className="h-3 w-3" /> Connected
                              </>
                            ) : (
                              <>
                                <WifiOff className="h-3 w-3" /> Not Connected
                              </>
                            )
                          ) : usage.connectedClients > 0 ? (
                            <>
                              <Wifi className="h-3 w-3" /> In Use
                            </>
                          ) : (
                            <>
                              <WifiOff className="h-3 w-3" /> Not Used
                            </>
                          )}
                        </span>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-base font-bold text-slate-900">{emr.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{emr.protocol}</p>
                      </div>

                      <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Connected clients</span>
                          <span className="font-semibold text-slate-800">{usage.connectedClients}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Configured clients</span>
                          <span className="font-semibold text-slate-800">{usage.configuredClients}</span>
                        </div>
                        {selectedClient ? (
                          <div className="border-t border-slate-200 pt-2 text-xs text-slate-500">
                            Managing setup for <span className="font-semibold text-slate-700">{selectedClient.name}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-auto pt-5">
                        <button
                          onClick={() => {
                            if (!selectedClientId) {
                              toast({
                                title: "Select a client workspace",
                                description: "Pick a client before opening the EMR connection form.",
                                variant: "warning",
                              });
                              return;
                            }
                            setConnectModal(emr);
                          }}
                          className="w-full rounded-2xl bg-[#0a7e87] py-3 text-sm font-semibold text-white transition hover:bg-[#08656c]"
                        >
                          {selectedClientId && emr.isConnected ? "Manage Connection" : "Configure Connection"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {activeSection === "availity" ? (
          <AvailityApiSection statusData={overview?.availity || null} />
        ) : null}

        {activeSection === "payers" ? (
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={payerSearch}
                  onChange={(event) => setPayerSearch(event.target.value)}
                  placeholder="Search payers..."
                  className="h-11 w-full rounded-2xl border border-slate-200 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {["Payer Name", "EDI Payer ID", "Submission Method", "Portal URL", "Contact Phone"].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayers.map((payer) => (
                    <tr key={payer.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-semibold text-slate-900">{payer.payerName}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">{payer.payerId || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{payer.submissionMethod || "—"}</td>
                      <td className="px-5 py-4 text-blue-600">{payer.portalUrl || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{payer.phoneNumber || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeSection === "users" ? (
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {["Name", "Email", "Role", "Client", "Last Login"].map((header) => (
                      <th
                        key={header}
                        className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((entry) => (
                    <tr key={entry.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-semibold text-slate-900">{entry.name || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{entry.email}</td>
                      <td className="px-5 py-4">
                        <RoleBadge role={entry.role} />
                      </td>
                      <td className="px-5 py-4 text-slate-500">{entry.client?.name || "Platform"}</td>
                      <td className="px-5 py-4 text-slate-500">
                        {entry.lastLoginAt ? new Date(entry.lastLoginAt).toLocaleString() : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </StaffinglyLayout>
  );
}
