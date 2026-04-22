import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys, useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import PatientForm from "@/components/patients/PatientForm";
import InsurancePolicyForm from "@/components/patients/InsurancePolicyForm";
import {
  Plus,
  Search,
  User,
  CreditCard,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";

const COVERAGE_COLORS = {
  ACTIVE: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  INACTIVE: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  UNKNOWN: { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" },
};

function PolicyBadge({ policy }) {
  const typeColors = {
    PRIMARY: { bg: "#eef3ff", text: "#293682" },
    SECONDARY: { bg: "#f5f3ff", text: "#6d28d9" },
    TERTIARY: { bg: "#fef3c7", text: "#b45309" },
  };
  const color = typeColors[policy.policyType] || typeColors.PRIMARY;

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {policy.policyType}
    </span>
  );
}

function PatientRow({ patient, onEdit, onDelete, onAddInsurance, onEditInsurance }) {
  const [expanded, setExpanded] = useState(false);

  const primaryPolicy = patient.insurancePolicies?.find((p) => p.policyType === "PRIMARY");
  const coverageStatus = primaryPolicy?.lastCoverageStatus || "UNKNOWN";
  const cc = COVERAGE_COLORS[coverageStatus] || COVERAGE_COLORS.UNKNOWN;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Main Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50/50"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-slate-400" />
        </div>

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">
              {patient.firstName} {patient.middleName ? `${patient.middleName.charAt(0)}. ` : ""}{patient.lastName}
            </span>
            {primaryPolicy && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: cc.bg, color: cc.text, border: `1px solid ${cc.border}` }}
              >
                {coverageStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
            <span>DOB: {new Date(patient.dob).toLocaleDateString()}</span>
            {patient.phone && <span>{patient.phone}</span>}
            {primaryPolicy && (
              <>
                <span className="text-slate-300">|</span>
                <span>{primaryPolicy.payerName}</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono">{primaryPolicy.memberId}</span>
              </>
            )}
          </div>
        </div>

        {/* Insurance Count */}
        <div className="flex items-center gap-2 text-slate-400">
          <CreditCard className="w-4 h-4" />
          <span className="text-xs font-semibold">{patient.insurancePolicies?.length || 0}</span>
        </div>

        {/* Expand Icon */}
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          {/* Patient Actions */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(patient);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Patient
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddInsurance(patient);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
              style={{ backgroundColor: "#0a7e87" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Insurance
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(patient);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>

          {/* Insurance Policies */}
          {patient.insurancePolicies?.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Insurance Policies
              </h4>
              {patient.insurancePolicies.map((policy) => {
                const pcc = COVERAGE_COLORS[policy.lastCoverageStatus] || COVERAGE_COLORS.UNKNOWN;
                return (
                  <div
                    key={policy.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200"
                  >
                    <PolicyBadge policy={policy} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700">
                        {policy.payerName}
                        {policy.planName && (
                          <span className="font-normal text-slate-500"> - {policy.planName}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Member ID: <span className="font-mono">{policy.memberId}</span>
                        {policy.groupNumber && (
                          <>
                            {" | "}Group: <span className="font-mono">{policy.groupNumber}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {policy.lastCoverageStatus && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: pcc.bg,
                          color: pcc.text,
                          border: `1px solid ${pcc.border}`,
                        }}
                      >
                        {policy.lastCoverageStatus}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditInsurance(patient, policy);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100"
                    >
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-amber-700">
                No insurance on file. Add insurance to verify eligibility.
              </p>
            </div>
          )}

          {/* Contact Info */}
          {(patient.email || patient.address) && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                {patient.email && (
                  <p>
                    <span className="text-slate-400">Email:</span> {patient.email}
                  </p>
                )}
                {patient.phone && (
                  <p>
                    <span className="text-slate-400">Phone:</span> {patient.phone}
                  </p>
                )}
                {patient.address && (
                  <p className="col-span-2">
                    <span className="text-slate-400">Address:</span> {patient.address}
                    {patient.city && `, ${patient.city}`}
                    {patient.state && `, ${patient.state}`}
                    {patient.zip && ` ${patient.zip}`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Patients() {
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  // Modal states
  const [patientModal, setPatientModal] = useState(null); // null | "add" | patient object
  const [insuranceModal, setInsuranceModal] = useState(null); // null | { patient, policy? }
  const queryClient = useQueryClient();

  const { data: user } = useAuthUserQuery();
  const clientId = user?.clientId || "";

  const {
    data: clients = [],
    isLoading: loadingClients,
  } = useEntityListQuery("Client", { limit: 100 }, null, {
    enabled: Boolean(user) && !user?.clientId,
  });

  const patientsParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...(search ? { search } : {}),
  };
  const patientsQuery = useQuery({
    queryKey: queryKeys.patients.list(patientsParams),
    queryFn: () => api.patients.list(patientsParams),
    enabled: Boolean(user),
  });
  const patients = patientsQuery.data?.data || [];
  const loading = patientsQuery.isLoading;
  const totalPatients = patientsQuery.data?.pagination?.total || 0;

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

  const patientFormClientOptions = clientId ? [] : clients;
  const requireClientSelection = !clientId;

  return (
    <StaffinglyLayout
      user={user}
      currentPage="patients"
      title="Patients"
      breadcrumbs={["Patients", "Manage"]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Patient Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Register patients and manage their insurance information
            </p>
            {!clientId && (
              <p className="text-xs text-slate-400 mt-1">
                {loadingClients
                  ? "Loading clients for patient assignment..."
                  : "Select a client when creating a patient."}
              </p>
            )}
          </div>
          <button
            onClick={() => setPatientModal("add")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: "#293682" }}
          >
            <Plus className="w-4 h-4" />
            New Patient
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]"
          />
        </div>

        {/* Patient List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No patients found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? "Try a different search term" : "Add your first patient to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {patients.map((patient) => (
              <PatientRow
                key={patient.id}
                patient={patient}
                onEdit={setPatientModal}
                onDelete={handleDeletePatient}
                onAddInsurance={(p) => setInsuranceModal({ patient: p })}
                onEditInsurance={(p, policy) => setInsuranceModal({ patient: p, policy })}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPatients > pagination.limit && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
              {Math.min(pagination.page * pagination.limit, totalPatients)} of {totalPatients}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page * pagination.limit >= totalPatients}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Modal */}
      {patientModal && (
        <PatientForm
          patient={patientModal === "add" ? null : patientModal}
          clientId={clientId}
          clientOptions={patientFormClientOptions}
          requireClientSelection={requireClientSelection}
          loadingClients={loadingClients}
          onClose={() => setPatientModal(null)}
          onSave={handleSavePatient}
        />
      )}

      {/* Insurance Modal */}
      {insuranceModal && (
        <InsurancePolicyForm
          policy={insuranceModal.policy}
          patientId={insuranceModal.patient.id}
          clientId={insuranceModal.patient.clientId || clientId}
          onClose={() => setInsuranceModal(null)}
          onSave={handleSaveInsurance}
        />
      )}
    </StaffinglyLayout>
  );
}
