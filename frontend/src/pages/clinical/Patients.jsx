import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys, useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import { createPageUrl } from "@/lib/utils/page";
import { buildPatientWorkflowParams } from "@/lib/utils/workflow";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import PatientForm from "@/components/patients/PatientForm";
import InsurancePolicyForm from "@/components/patients/InsurancePolicyForm";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Edit2,
  FileWarning,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  User,
  UserRoundCheck,
} from "lucide-react";

const COVERAGE_COLORS = {
  ACTIVE: { label: "Active", bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  INACTIVE: { label: "Inactive", bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  UNKNOWN: {
    label: "Unverified",
    bg: "#f8fafc",
    text: "#64748b",
    border: "#e2e8f0",
    tooltip: "This policy has not been verified against the payer database yet.",
  },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "attention", label: "Needs Attention" },
  { key: "missing-insurance", label: "Missing Insurance" },
];

const STAT_CARDS = [
  {
    key: "total",
    label: "Total Patients",
    detail: "Patients currently visible in this workspace.",
    tone: "blue",
    icon: UserRoundCheck,
  },
  {
    key: "ready",
    label: "Ready to Verify",
    detail: "Primary insurance is on file and ready for an eligibility run.",
    tone: "teal",
    icon: ShieldCheck,
  },
  {
    key: "attention",
    label: "Needs Attention",
    detail: "Missing primary policy details or verification still needs to happen.",
    tone: "amber",
    icon: FileWarning,
  },
  {
    key: "missing-insurance",
    label: "Missing Insurance",
    detail: "Patients blocked from verification until coverage is added.",
    tone: "rose",
    icon: ShieldX,
  },
];

function getPrimaryPolicy(patient) {
  return patient.insurancePolicies?.find((policy) => policy.policyType === "PRIMARY");
}

function getPatientWorkflowState(patient) {
  const primaryPolicy = getPrimaryPolicy(patient);
  const hasInsurance = (patient.insurancePolicies?.length || 0) > 0;

  if (!hasInsurance) {
    return {
      key: "missing-insurance",
      label: "Missing insurance",
      detail: "Add insurance before verifying.",
      tone: { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
    };
  }

  if (!primaryPolicy?.payerName || !primaryPolicy?.memberId) {
    return {
      key: "attention",
      label: "Needs attention",
      detail: "Complete primary policy details.",
      tone: { bg: "#fefce8", text: "#a16207", border: "#fde68a" },
    };
  }

  if ((primaryPolicy.lastCoverageStatus || "UNKNOWN") === "UNKNOWN") {
    return {
      key: "attention",
      label: "Needs verification",
      detail: "Coverage has not been confirmed yet.",
      tone: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    };
  }

  return {
    key: "ready",
    label: "Ready",
    detail: "Primary policy is ready for verification.",
    tone: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  };
}

function PolicyBadge({ policy }) {
  const typeColors = {
    PRIMARY: { bg: "#eef3ff", text: "#293682" },
    SECONDARY: { bg: "#f5f3ff", text: "#6d28d9" },
    TERTIARY: { bg: "#fef3c7", text: "#b45309" },
  };
  const color = typeColors[policy.policyType] || typeColors.PRIMARY;

  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {policy.policyType}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone = "slate" }) {
  const tones = {
    blue: { shell: "#eff6ff", icon: "#2563eb" },
    teal: { shell: "#ecfeff", icon: "#0f766e" },
    amber: { shell: "#fffbeb", icon: "#d97706" },
    rose: { shell: "#fff1f2", icon: "#e11d48" },
    slate: { shell: "#f8fafc", icon: "#475569" },
  };
  const colors = tones[tone] || tones.slate;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-800">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.shell }}
        >
          <Icon className="h-5 w-5" style={{ color: colors.icon }} />
        </div>
      </div>
    </div>
  );
}

function PatientRow({
  patient,
  onEdit,
  onDelete,
  onAddInsurance,
  onEditInsurance,
  onVerify,
  onStartPriorAuth,
}) {
  const [expanded, setExpanded] = useState(false);

  const primaryPolicy = getPrimaryPolicy(patient);
  const coverageStatus = primaryPolicy?.lastCoverageStatus || "UNKNOWN";
  const coverageColors = COVERAGE_COLORS[coverageStatus] || COVERAGE_COLORS.UNKNOWN;
  const workflowState = getPatientWorkflowState(patient);
  const canVerify = Boolean(primaryPolicy?.payerName && primaryPolicy?.memberId);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex flex-1 items-start gap-4 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
            <User className="h-5 w-5 text-slate-400" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {patient.firstName} {patient.middleName ? `${patient.middleName.charAt(0)}. ` : ""}
                {patient.lastName}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{
                  backgroundColor: workflowState.tone.bg,
                  color: workflowState.tone.text,
                  border: `1px solid ${workflowState.tone.border}`,
                }}
              >
                {workflowState.label}
              </span>
              {primaryPolicy && coverageStatus !== "UNKNOWN" ? (
                <span
                  title={coverageColors.tooltip || ""}
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold cursor-help"
                  style={{
                    backgroundColor: coverageColors.bg,
                    color: coverageColors.text,
                    border: `1px solid ${coverageColors.border}`,
                  }}
                >
                  {coverageColors.label || coverageStatus}
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>DOB: {new Date(patient.dob).toLocaleDateString()}</span>
              {primaryPolicy?.payerName ? <span>{primaryPolicy.payerName}</span> : null}
              {primaryPolicy?.memberId ? (
                <span className="font-mono">{primaryPolicy.memberId}</span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-slate-500">{workflowState.detail}</p>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            <CreditCard className="h-4 w-4" />
            {patient.insurancePolicies?.length || 0}
          </div>

          <button
            type="button"
            onClick={() => onAddInsurance(patient)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Add Insurance
          </button>

          <button
            type="button"
            onClick={() => onVerify(patient)}
            disabled={!canVerify}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#293682" }}
          >
            Verify
          </button>

          <button
            type="button"
            onClick={() => onStartPriorAuth(patient)}
            disabled={!canVerify}
            className="rounded-xl border border-[#293682]/20 bg-[#eef1ff] px-3 py-2 text-xs font-semibold text-[#293682] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start PA
          </button>

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/70 p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(patient)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Patient
            </button>
            <button
              type="button"
              onClick={() => onDelete(patient)}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>

          {patient.insurancePolicies?.length > 0 ? (
            <div className="space-y-2">
              {patient.insurancePolicies.map((policy) => {
                const policyColors =
                  COVERAGE_COLORS[policy.lastCoverageStatus] || COVERAGE_COLORS.UNKNOWN;

                return (
                  <div
                    key={policy.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <PolicyBadge policy={policy} />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {policy.payerName}
                          {policy.planName ? (
                            <span className="font-normal text-slate-500"> - {policy.planName}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-500">
                          Member ID:{" "}
                          <span className="font-mono">{policy.memberId || "Missing"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      {policy.lastCoverageStatus ? (
                        <span
                          title={policyColors.tooltip || ""}
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold cursor-help"
                          style={{
                            backgroundColor: policyColors.bg,
                            color: policyColors.text,
                            border: `1px solid ${policyColors.border}`,
                          }}
                        >
                          {policyColors.label || policy.lastCoverageStatus}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onEditInsurance(patient, policy)}
                        className="rounded-lg p-1.5 hover:bg-slate-100"
                      >
                        <Edit2 className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-700">
                No insurance on file. Add insurance before verifying this patient.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const DUMMY_PATIENTS = [
  {
    id: "gp-sarah-mitchell",
    firstName: "Sarah",
    lastName: "Mitchell",
    middleName: "J",
    dob: "1985-03-14T00:00:00Z",
    insurancePolicies: [
      {
        id: "pol-1",
        policyType: "PRIMARY",
        payerName: "UnitedHealthcare",
        memberId: "UHC-884720193",
        lastCoverageStatus: "ACTIVE",
      },
    ],
  },
  {
    id: "gp-robert-sanchez",
    firstName: "Robert",
    lastName: "Sanchez",
    middleName: "T",
    dob: "1979-12-03T00:00:00Z",
    insurancePolicies: [
      {
        id: "pol-2",
        policyType: "PRIMARY",
        payerName: "Medicaid",
        memberId: "MCD-112984732",
        lastCoverageStatus: "UNKNOWN",
      },
    ],
  },
  {
    id: "gp-marcus-thompson",
    firstName: "Marcus",
    lastName: "Thompson",
    middleName: "A",
    dob: "1968-10-11T00:00:00Z",
    insurancePolicies: [
      {
        id: "pol-3",
        policyType: "PRIMARY",
        payerName: "Medicare",
        memberId: "MBI-4EG9-UA8-YK72",
        lastCoverageStatus: "ACTIVE",
      },
    ],
  },
  {
    id: "gp-linda-patel",
    firstName: "Linda",
    lastName: "Patel",
    middleName: "K",
    dob: "1990-11-30T00:00:00Z",
    insurancePolicies: [
      {
        id: "pol-4",
        policyType: "PRIMARY",
        payerName: "Blue Cross Blue Shield",
        memberId: "BCBS-774930281",
        lastCoverageStatus: "ACTIVE",
      },
    ],
  },
];

export default function Patients() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [patientModal, setPatientModal] = useState(null);
  const [insuranceModal, setInsuranceModal] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useAuthUserQuery();
  const clientId = user?.clientId || "";

  const { data: clients = [], isLoading: loadingClients } = useEntityListQuery(
    "Client",
    { limit: 100 },
    null,
    {
      enabled: Boolean(user) && !user?.clientId,
    }
  );

  const patientsParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...(search ? { search } : {}),
  };

  const patientsQuery = useQuery({
    queryKey: queryKeys.patients.list(patientsParams),
    queryFn: async () => {
      const response = await api.patients.list(patientsParams);
      const dataRaw = response?.data || [];

      // Fallback for demo
      if (dataRaw.length === 0 && !search) {
        return {
          data: DUMMY_PATIENTS,
          pagination: { total: DUMMY_PATIENTS.length, page: 1, limit: 20 },
        };
      }

      return response;
    },
    enabled: Boolean(user),
  });

  const patients = patientsQuery.data?.data || [];
  const loading = patientsQuery.isLoading;
  const totalPatients = patientsQuery.data?.pagination?.total || 0;

  const patientStats = useMemo(() => {
    return patients.reduce(
      (stats, patient) => {
        const state = getPatientWorkflowState(patient);
        stats.total += 1;
        stats[state.key] += 1;
        return stats;
      },
      { total: 0, ready: 0, attention: 0, "missing-insurance": 0 }
    );
  }, [patients]);

  const filteredPatients = useMemo(() => {
    if (activeFilter === "all") {
      return patients;
    }

    return patients.filter((patient) => getPatientWorkflowState(patient).key === activeFilter);
  }, [activeFilter, patients]);

  const savePatientMutation = useMutation({
    mutationFn: (data) =>
      patientModal?.id ? api.patients.update(patientModal.id, data) : api.patients.create(data),
    onSuccess: async () => {
      setPatientModal(null);
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: (patientId) => api.patients.delete(patientId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const saveInsuranceMutation = useMutation({
    mutationFn: (data) => {
      const { patient, policy } = insuranceModal;
      if (policy?.id) {
        return api.patients.updateInsurance(patient.id, policy.id, data);
      }
      return api.patients.addInsurance(patient.id, data);
    },
    onSuccess: async () => {
      setInsuranceModal(null);
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const handleSavePatient = async (data) => {
    await savePatientMutation.mutateAsync(data);
  };

  const handleDeletePatient = async (patient) => {
    if (!confirm(`Delete ${patient.firstName} ${patient.lastName}? This cannot be undone.`)) {
      return;
    }
    await deletePatientMutation.mutateAsync(patient.id);
  };

  const handleSaveInsurance = async (data) => {
    await saveInsuranceMutation.mutateAsync(data);
  };

  const handleVerifyPatient = (patient) => {
    navigate(
      createPageUrl(
        `NewVerification?${buildPatientWorkflowParams(patient, { source: "patients" })}`
      )
    );
  };

  const handleStartPriorAuth = (patient) => {
    navigate(
      createPageUrl(
        `prior-auth?${buildPatientWorkflowParams(patient, {
          source: "patients",
          intent: "prior-auth",
        })}`
      )
    );
  };

  useEffect(() => {
    const hasOpenForm = patientModal !== null || insuranceModal !== null;
    const previousOverflow = document.body.style.overflow;

    if (hasOpenForm) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [patientModal, insuranceModal]);

  const patientFormClientOptions = clientId ? [] : clients;
  const requireClientSelection = !clientId;

  return (
    <StaffinglyLayout
      user={user}
      currentPage="patients"
      title="Patients"
      breadcrumbs={["Patients", "Manage"]}
    >
      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage patient records and launch verification when details are ready.
              </p>
              {!clientId ? (
                <p className="mt-2 text-xs text-slate-400">
                  {loadingClients
                    ? "Loading clients for patient assignment..."
                    : "Select a client when creating a patient."}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setPatientModal("add")}
              className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white"
              style={{ backgroundColor: "#293682" }}
            >
              <Plus className="h-4 w-4" />
              New Patient
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients by name, email, or phone..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                className="w-full sm:w-72 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#293682]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    activeFilter === filter.key
                      ? "text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                  style={activeFilter === filter.key ? { backgroundColor: "#293682" } : {}}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {STAT_CARDS.map((stat) => (
            <StatCard
              key={stat.key}
              icon={stat.icon}
              label={stat.label}
              value={patientStats[stat.key]}
              detail={stat.detail}
              tone={stat.tone}
            />
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading patients...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
            <User className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-slate-500">No patients found</p>
            <p className="mt-1 text-sm text-slate-400">
              {search
                ? "Try a different search or filter."
                : "Add your first patient to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPatients.map((patient) => (
              <PatientRow
                key={patient.id}
                patient={patient}
                onEdit={setPatientModal}
                onDelete={handleDeletePatient}
                onAddInsurance={(selectedPatient) =>
                  setInsuranceModal({ patient: selectedPatient })
                }
                onEditInsurance={(selectedPatient, policy) =>
                  setInsuranceModal({ patient: selectedPatient, policy })
                }
                onVerify={handleVerifyPatient}
                onStartPriorAuth={handleStartPriorAuth}
              />
            ))}
          </div>
        )}

        {totalPatients > pagination.limit ? (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
              {Math.min(pagination.page * pagination.limit, totalPatients)} of {totalPatients}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
                disabled={pagination.page === 1}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
                disabled={pagination.page * pagination.limit >= totalPatients}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {patientModal ? (
        <PatientForm
          patient={patientModal === "add" ? null : patientModal}
          clientId={clientId}
          clientOptions={patientFormClientOptions}
          requireClientSelection={requireClientSelection}
          loadingClients={loadingClients}
          onClose={() => setPatientModal(null)}
          onSave={handleSavePatient}
        />
      ) : null}

      {insuranceModal ? (
        <InsurancePolicyForm
          policy={insuranceModal.policy}
          patientId={insuranceModal.patient.id}
          clientId={insuranceModal.patient.clientId || clientId}
          onClose={() => setInsuranceModal(null)}
          onSave={handleSaveInsurance}
        />
      ) : null}
    </StaffinglyLayout>
  );
}
