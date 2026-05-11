import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, CheckCircle, AlertTriangle, Wifi, WifiOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import AppSelect from "@/components/ui/app-select";
import { Input } from "@/components/ui/input";
import ManualEntryTab from "./ManualEntryTab";

function EhrLogo({ name, src }) {
  return (
    <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm">
      <img src={src} alt={`${name} logo`} className="h-6 w-auto max-w-[120px] object-contain" />
    </div>
  );
}

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

function ConnectModal({ emr, onClose, onSave, isSaving, canConnect, clientId }) {
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
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadConfig() {
      if (!canConnect || !clientId || !emr?.id) return;

      try {
        setLoadingConfig(true);
        const response = await api.emr.getSystemConfig(emr.id, { clientId });
        if (ignore) return;
        setForm((current) => ({
          ...current,
          ...(response?.data?.config || {}),
        }));
      } catch (error) {
        if (!ignore) {
            toast({
              title: "Unable to load EMR settings",
              description: error?.message || "Please try again.",
              variant: "error",
            });
        }
      } finally {
        if (!ignore) {
          setLoadingConfig(false);
        }
      }
    }

    void loadConfig();

    return () => {
      ignore = true;
    };
  }, [canConnect, clientId, emr?.id]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5 pr-10">
          <div>
            <h3 className="font-bold text-slate-800">Connect {emr.name}</h3>
            <p className="text-sm text-slate-500 mt-1">
              This links the current client workspace to the selected EHR integration.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">{emr.protocol}</p>
          <p className="mt-1">
            Save the connection details for this client workspace so patient pull actions can run
            through the backend integration layer.
          </p>
        </div>

        {!canConnect && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            A client-linked workspace is required before an EHR can be connected here.
          </div>
          )}

        {canConnect ? (
          <div className="mt-5 space-y-4">
            {loadingConfig ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved EMR settings...
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Environment Label
                </label>
                <Input
                  value={form.environmentLabel}
                  onChange={(event) => update("environmentLabel", event.target.value)}
                  placeholder="Epic Sandbox"
                  className="h-11 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  FHIR Version
                </label>
                <AppSelect
                  value={form.fhirVersion}
                  onValueChange={(value) => update("fhirVersion", value)}
                  options={FHIR_VERSION_OPTIONS}
                  triggerClassName="h-11 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Epic Base URL
              </label>
              <Input
                value={form.baseUrl}
                onChange={(event) => update("baseUrl", event.target.value)}
                placeholder="https://fhir.epic.example.com/interconnect-fhir-oauth/api/FHIR/R4"
                className="h-11 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Auth Type
                </label>
                <AppSelect
                  value={form.authType}
                  onValueChange={(value) => update("authType", value)}
                  options={AUTH_TYPE_OPTIONS}
                  triggerClassName="h-11 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Client App ID
                </label>
                <Input
                  value={form.clientAppId}
                  onChange={(event) => update("clientAppId", event.target.value)}
                  placeholder="Epic app client ID"
                  className="h-11 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Client Secret
                </label>
                <Input
                  type="password"
                  value={form.clientSecret}
                  onChange={(event) => update("clientSecret", event.target.value)}
                  placeholder="Optional for some flows"
                  className="h-11 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Redirect URI
                </label>
                <Input
                  value={form.redirectUri}
                  onChange={(event) => update("redirectUri", event.target.value)}
                  placeholder="https://app.example.com/auth/epic/callback"
                  className="h-11 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Requested Scopes
              </label>
              <Input
                value={form.scopes}
                onChange={(event) => update("scopes", event.target.value)}
                placeholder="launch/patient patient/Patient.read patient/Coverage.read"
                className="h-11 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        ) : null}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!canConnect || isSaving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: "#0a7e87" }}
          >
            {isSaving ? "Saving..." : "Save Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmrTab({ onSubmit, clientId = "" }) {
  const queryClient = useQueryClient();
  const searchSectionRef = useRef(null);
  const searchInputRef = useRef(null);
  const [selectedEhr, setSelectedEhr] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [connectModal, setConnectModal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);

  const trimmedSearch = searchQuery.trim();

  const { data: ehrSystemsResponse, isLoading: ehrSystemsLoading, isError: ehrSystemsError } =
    useQuery({
      queryKey: ["emr", "systems", clientId],
      queryFn: () => api.emr.listSystems(clientId ? { clientId } : {}),
    });

  const ehrSystems = ehrSystemsResponse?.data || [];

  useEffect(() => {
    if (!selectedEhr?.id) return;

    const refreshedSelection = ehrSystems.find((ehr) => ehr.id === selectedEhr.id) || null;
    if (refreshedSelection) {
      setSelectedEhr(refreshedSelection);
    }
  }, [ehrSystems, selectedEhr?.id]);

  const { data: searchResultsResponse, isFetching: searchingPatients } = useQuery({
    queryKey: ["emr", "patients", selectedEhr?.id, clientId, trimmedSearch],
    queryFn: () =>
      api.emr.searchPatients(
        selectedEhr.id,
        clientId ? { clientId, search: trimmedSearch } : { search: trimmedSearch }
      ),
    enabled: Boolean(selectedEhr?.id && trimmedSearch),
  });

  const searchResults = searchResultsResponse?.data || [];

  const { data: selectedPatientResponse, isLoading: loadingSelectedPatient } = useQuery({
    queryKey: ["emr", "patient", selectedEhr?.id, selectedPatientId, clientId],
    queryFn: () =>
      api.emr.getPatient(
        selectedEhr.id,
        selectedPatientId,
        clientId ? { clientId } : {}
      ),
    enabled: Boolean(selectedEhr?.id && selectedPatientId),
  });

  const selectedPatient = selectedPatientResponse?.data || null;

  useEffect(() => {
    if (!selectedEhr) return;

    searchSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [selectedEhr?.id]);

  async function handleConnect(configValues) {
    if (!connectModal) return;

    if (!clientId) {
      toast({
        title: "Client workspace required",
        description: "Switch into a client-linked workspace before connecting an EHR.",
        variant: "warning",
      });
      return;
    }

      try {
        setSavingConnection(true);
        await api.emr.saveSystemConfig(connectModal.id, {
          clientId,
          ...configValues,
        });
      toast({
        title: "EMR settings saved",
        description: `${connectModal.name} is now configured for this client workspace.`,
        variant: "success",
      });
      setConnectModal(null);
      await queryClient.invalidateQueries({ queryKey: ["emr", "systems"] });
    } catch (error) {
      toast({
        title: "Unable to connect EHR",
        description: error?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setSavingConnection(false);
    }
  }

  return (
    <div className="space-y-5">
      {connectModal && (
        <ConnectModal
          emr={connectModal}
          onClose={() => setConnectModal(null)}
          onSave={handleConnect}
          isSaving={savingConnection}
          canConnect={Boolean(clientId)}
          clientId={clientId}
        />
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="font-bold text-slate-700 text-sm">Connected EHR Systems</h3>
          <p className="text-xs text-slate-500">
            Connection status is managed by the backend per client workspace.
          </p>
        </div>

        {ehrSystemsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border-2 border-slate-200 p-3 animate-pulse space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-10 w-24 rounded-xl bg-slate-100" />
                  <div className="h-5 w-20 rounded-full bg-slate-100" />
                </div>
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-3 w-16 rounded bg-slate-100" />
                <div className="h-8 w-full rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : ehrSystemsError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            We couldn't load the EHR systems right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ehrSystems.map((ehr) => (
              <div
                key={ehr.id || ehr.name}
                className={`flex h-full flex-col rounded-xl border-2 p-3 transition-all ${selectedEhr?.id === ehr.id ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <EhrLogo name={ehr.name} src={ehr.logoSrc} />
                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ehr.isConnected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                  >
                    {ehr.isConnected ? (
                      <Wifi className="w-2.5 h-2.5" />
                    ) : (
                      <WifiOff className="w-2.5 h-2.5" />
                    )}
                    {ehr.isConnected ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700">{ehr.name}</p>
                <p className="text-[10px] text-slate-400">{ehr.protocol}</p>
                <div className="mt-auto pt-3 space-y-1.5">
                  {ehr.isConnected ? (
                    <>
                      <button
                        className="w-full py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: "#293682" }}
                        onClick={() => {
                          setSelectedEhr(ehr);
                          setSelectedPatientId(null);
                          setShowForm(false);
                        }}
                      >
                        Pull Patient
                      </button>
                      <button
                        className="w-full py-1.5 rounded-lg text-xs font-bold border border-slate-300 text-slate-600 bg-white hover:bg-slate-50"
                        onClick={() => setConnectModal(ehr)}
                      >
                        Manage Connection
                      </button>
                    </>
                  ) : (
                    <button
                      className="w-full py-1.5 rounded-lg text-xs font-bold text-white border border-slate-300"
                      style={{ backgroundColor: "white", color: "#64748b" }}
                      onClick={() => setConnectModal(ehr)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEhr && (
        <div ref={searchSectionRef} className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 text-sm mb-3">
            Search Patients — {selectedEhr.name}
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedPatientId(null);
                setShowForm(false);
              }}
              placeholder="Search by patient name, member ID, or MRN..."
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"
            />
          </div>

          {!trimmedSearch ? (
            <p className="text-slate-400 text-sm mt-3 text-center">
              Search to pull a patient from the connected EHR feed.
            </p>
          ) : searchingPatients ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching patients...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="mt-3 space-y-2">
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatientId(patient.id);
                    setShowForm(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedPatientId === patient.id ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{patient.name}</p>
                    <p className="text-xs text-slate-400">
                      DOB: {patient.dob || "Unknown"} · MRN: {patient.mrn} · {patient.source}
                    </p>
                  </div>
                  <CheckCircle
                    className={`w-5 h-5 ${selectedPatientId === patient.id ? "text-blue-500" : "text-slate-200"}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm mt-3 text-center">
              No patients found — try a different search
            </p>
          )}
        </div>
      )}

      {selectedPatientId && loadingSelectedPatient && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Pulling patient details from {selectedEhr?.name}...
        </div>
      )}

      {selectedPatient && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-700 text-sm">
              Data Pulled Successfully — {selectedPatient.name}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Found in EHR
              </p>
              <div className="space-y-1.5">
                {selectedPatient.foundFields.map((field) => (
                  <div key={field} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {field}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Missing — Need Manual Entry
              </p>
              <div className="space-y-1.5">
                {selectedPatient.missingFields.map((field) => (
                  <div key={field} className="flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    {field}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: "#293682" }}
          >
            Complete Verification Form
          </button>
        </div>
      )}

      {showForm && selectedPatient && (
        <div>
          <h3 className="font-bold text-slate-700 text-sm mb-4">Complete Verification Form</h3>
            <ManualEntryTab
              onSubmit={onSubmit}
              clientId={clientId}
              showPatientSelector={false}
              prefill={{
                patient_id: selectedPatient.id || "",
                first_name: selectedPatient.firstName || selectedPatient.name.split(" ")[0] || "",
                last_name:
                  selectedPatient.lastName ||
                  selectedPatient.name.split(" ").slice(1).join(" ") ||
                  "",
                middle_name: selectedPatient.middleName || "",
                dob: selectedPatient.dob || "",
                gender: selectedPatient.gender || "",
                phone: selectedPatient.phone || "",
                email: selectedPatient.email || "",
                address: selectedPatient.address || "",
                city: selectedPatient.city || "",
                state: selectedPatient.state || "",
                zip: selectedPatient.zip || "",
                payer: selectedPatient.payer || "",
                payer_id: selectedPatient.payerId || "",
                member_id: selectedPatient.memberId || "",
                group_number: selectedPatient.groupNumber || "",
                plan_name: selectedPatient.planName || "",
                plan_type: selectedPatient.planType || "",
                effective_date: selectedPatient.effectiveDate || "",
                termination_date: selectedPatient.terminationDate || "",
                rx_bin: selectedPatient.rxBin || "",
                rx_pcn: selectedPatient.rxPcn || "",
                rx_group: selectedPatient.rxGroup || "",
                copay_pcp: selectedPatient.copayPcp || "",
                copay_specialist: selectedPatient.copaySpecialist || "",
                subscriber_name: selectedPatient.subscriberName || "",
                subscriber_dob: selectedPatient.subscriberDob || "",
                subscriber_relationship: selectedPatient.subscriberRelationship || "Self",
                secondary_payer: selectedPatient.secondaryPayer || "",
                secondary_member_id: selectedPatient.secondaryMemberId || "",
                secondary_group_number: selectedPatient.secondaryGroupNumber || "",
                secondary_plan_name: selectedPatient.secondaryPlanName || "",
                provider_npi: selectedPatient.providerNpi || "",
                service_date: selectedPatient.serviceDate || "",
                service_type: selectedPatient.serviceType || "",
                cpt_code: selectedPatient.cptCode || "",
                facility_name: selectedPatient.facilityName || "",
                notes: selectedPatient.notes || "",
              }}
          />
        </div>
      )}
    </div>
  );
}
