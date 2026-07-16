import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthUserQuery } from "@/lib/query";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import AppSelect from "@/components/ui/app-select";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Users,
  ListChecks,
} from "lucide-react";

function formatDob(dob) {
  if (!dob) return "—";
  return new Date(dob).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === "Active" || status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
      <AlertCircle className="h-3 w-3" />
      {status}
    </span>
  );
}

export default function RosterQueue() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useAuthUserQuery();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [page, setPage] = useState(1);

  const { data: clientsResponse, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients", "roster-queue-selector"],
    queryFn: () => api.clients.list({ limit: 100 }),
    enabled: Boolean(user && !user.clientId),
    staleTime: 5 * 60 * 1000,
  });

  const resolvedClientId = user?.clientId || selectedClientId;

  const {
    data: queueResponse,
    isLoading: queueLoading,
    isFetching,
  } = useQuery({
    queryKey: ["roster", "queue", resolvedClientId, page],
    queryFn: () => api.roster.getQueue(resolvedClientId, { page, limit: 50 }),
    enabled: Boolean(resolvedClientId),
    staleTime: 30 * 1000,
  });

  const availableClients = clientsResponse?.data || clientsResponse?.clients || [];
  const patients = queueResponse?.data || [];
  const pagination = queueResponse?.pagination || { total: 0, pages: 1 };

  function handleVerify(patient) {
    const policy = patient.insurancePolicies?.[0];
    const dob = patient.dob ? new Date(patient.dob) : null;
    const params = new URLSearchParams({
      patientId: patient.id,
      first_name: patient.firstName || "",
      last_name: patient.lastName || "",
      dob: dob
        ? `${String(dob.getUTCMonth() + 1).padStart(2, "0")}/${String(dob.getUTCDate()).padStart(2, "0")}/${dob.getUTCFullYear()}`
        : "",
      ...(patient.gender ? { gender: patient.gender } : {}),
      ...(policy?.payerName ? { payer_name: policy.payerName } : {}),
      ...(policy?.memberId ? { member_id: policy.memberId } : {}),
      ...(policy?.groupNumber ? { group_number: policy.groupNumber } : {}),
      ...(policy?.subscriberName ? { subscriber_name: policy.subscriberName } : {}),
      ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
    });
    navigate(`/new-verification?${params.toString()}`);
  }

  const isLoading = userLoading || (resolvedClientId && queueLoading);

  return (
    <StaffinglyLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patient Work Queue</h1>
            <p className="mt-1 text-sm text-slate-500">
              Patients imported from the clinic's schedule roster — ready for eligibility
              verification.
            </p>
          </div>
          {pagination.total > 0 && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-2xl font-bold text-slate-800">{pagination.total}</span>
              <span className="text-xs text-slate-400">pending patients</span>
            </div>
          )}
        </div>

        {/* Client selector (ops team) */}
        {!user?.clientId && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Client Workspace
            </label>
            <AppSelect
              value={selectedClientId}
              onValueChange={(val) => {
                setSelectedClientId(val);
                setPage(1);
              }}
              placeholder={clientsLoading ? "Loading clients…" : "Select a client workspace"}
              options={availableClients.map((c) => ({ label: c.practiceName || c.name, value: c.id }))}
              disabled={clientsLoading}
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
          </div>
        )}

        {/* Empty / loading states */}
        {!resolvedClientId && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-center">
            <Users className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">Select a client workspace to view the queue</p>
          </div>
        )}

        {resolvedClientId && isLoading && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            <p className="text-sm text-slate-400">Loading patient queue…</p>
          </div>
        )}

        {resolvedClientId && !isLoading && patients.length === 0 && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-center">
            <ListChecks className="h-10 w-10 text-emerald-300" />
            <p className="text-sm font-semibold text-slate-600">All caught up!</p>
            <p className="text-xs text-slate-400">
              No pending patients in the queue for this clinic.
            </p>
          </div>
        )}

        {/* Patient list */}
        {patients.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {isFetching && (
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                <p className="text-xs text-slate-400">Refreshing…</p>
              </div>
            )}
            <ul className="divide-y divide-slate-100">
              {patients.map((patient, idx) => {
                const policy = patient.insurancePolicies?.[0];
                return (
                  <li
                    key={patient.id}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    {/* Position number */}
                    <span className="w-6 flex-shrink-0 text-center text-xs font-bold text-slate-300">
                      {(page - 1) * 50 + idx + 1}
                    </span>

                    {/* Patient info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        DOB: {formatDob(patient.dob)}
                        {patient.phone ? ` · ${patient.phone}` : ""}
                      </p>
                    </div>

                    {/* Insurance info */}
                    {policy && (
                      <div className="hidden min-w-0 max-w-[220px] flex-col sm:flex">
                        <p className="truncate text-xs font-semibold text-slate-700">
                          {policy.payerName}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          Member: {policy.memberId}
                          {policy.groupNumber ? ` · Grp: ${policy.groupNumber}` : ""}
                        </p>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex-shrink-0">
                      <StatusBadge status={policy?.lastCoverageStatus} />
                    </div>

                    {/* Verify button */}
                    {!policy?.lastCoverageStatus && (
                      <button
                        type="button"
                        onClick={() => handleVerify(patient)}
                        className="flex flex-shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all"
                        style={{ backgroundColor: "#0a7e87" }}
                      >
                        Verify
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {policy?.lastCoverageStatus && (
                      <button
                        type="button"
                        onClick={() => handleVerify(patient)}
                        className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
                      >
                        Re-verify
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-400">
                  Page {pagination.page} of {pagination.pages} · {pagination.total} patients total
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StaffinglyLayout>
  );
}
