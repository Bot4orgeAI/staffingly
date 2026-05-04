import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthUserQuery } from "@/lib/query";
import { api } from "@/lib/api";
import { getWorkflowContext } from "@/lib/utils/workflow";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import ManualEntryTab from "@/components/insuverif/ManualEntryTab";
import UploadTab from "@/components/insuverif/UploadTab";
import EmrTab from "@/components/insuverif/EmrTab.jsx";
import BulkVerifyTab from "@/components/insuverif/BulkVerifyTab";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  FileUp,
  Layers3,
  Loader2,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";

const WORKFLOWS = [
  {
    id: "manual",
    label: "Manual",
    description: "Fastest for a single check.",
    icon: ClipboardCheck,
  },
  {
    id: "upload",
    label: "Upload Documents",
    description: "Extract details from uploaded documents.",
    icon: FileUp,
  },
  {
    id: "bulk",
    label: "Bulk",
    description: "Run multiple verifications.",
    icon: Layers3,
  },
  {
    id: "emr",
    label: "EMR",
    description: "Pull from a connected chart.",
    icon: MonitorSmartphone,
  },
];

function getInitialWorkflow(params) {
  if (params.get("source") === "patients") {
    return "manual";
  }

  return "manual";
}

const COVERAGE_COLORS = {
  Active: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", icon: CheckCircle },
  Inactive: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca", icon: AlertTriangle },
  Unknown: { bg: "#fffbeb", text: "#b45309", border: "#fde68a", icon: AlertTriangle },
};

function normalizeEligibilityResult(data = {}) {
  return {
    coverage_status: data.coverage_status || data.coverageStatus || "Unknown",
    plan_name: data.plan_name || data.planName || "",
    plan_type: data.plan_type || data.planType || "",
    network_status: data.network_status || data.networkStatus || "",
    effective_date: data.effective_date || data.effectiveDate || "",
    termination_date: data.termination_date || data.terminationDate || "",
    prior_auth_required: data.prior_auth_required ?? data.priorAuthRequired ?? null,
    confidence_score: data.confidence_score || data.confidenceScore || 0,
    channel_used: data.channel_used || data.channelUsed || "n8n Master Gateway",
    response_time_seconds: data.response_time_seconds || data.responseTimeSeconds || "",
    check_id: data.check_id || data.checkId || "",
    gateway_patient_id: data.gateway_patient_id || data.gatewayPatientId || "",
    flags: Array.isArray(data.flags) ? data.flags : [],
    error: data.error || "",
  };
}

function ResultField({ label, value }) {
  if (!value && value !== 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function WorkflowOption({ workflow, active, onSelect }) {
  const Icon = workflow.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(workflow.id)}
      className={`flex min-w-[150px] flex-1 items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
        active ? "border-[#293682] bg-[#eef1ff]" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${
          active ? "bg-[#293682] text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{workflow.label}</p>
        <p className="mt-1 text-xs text-slate-500">{workflow.description}</p>
      </div>
    </button>
  );
}

export default function NewVerification() {
  const { data: user } = useAuthUserQuery();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const workflowContext = useMemo(() => getWorkflowContext(window.location.search), []);
  const [activeWorkflow, setActiveWorkflow] = useState(() => getInitialWorkflow(params));
  const [lastRequest, setLastRequest] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState("");
  const statusSectionRef = useRef(null);

  const prefill = useMemo(() => {
    const patientName = params.get("patient_name") || "";
    const firstName = params.get("first_name") || patientName.split(" ")[0] || "";
    const lastName = params.get("last_name") || patientName.split(" ").slice(1).join(" ") || "";

    return {
      patient_id: params.get("patientId") || "",
      first_name: firstName,
      last_name: lastName,
      middle_name: params.get("middle_name") || "",
      dob: params.get("dob") || "",
      gender: params.get("gender") || "",
      phone: params.get("phone") || "",
      email: params.get("email") || "",
      address: params.get("address") || "",
      city: params.get("city") || "",
      state: params.get("state") || "",
      zip: params.get("zip") || "",
      payer: params.get("payer") || "",
      payer_id: params.get("payer_id") || "",
      member_id: params.get("member_id") || "",
      group_number: params.get("group_number") || "",
      plan_name: params.get("plan_name") || "",
      plan_type: params.get("plan_type") || "",
      effective_date: params.get("effective_date") || "",
      termination_date: params.get("termination_date") || "",
      rx_bin: params.get("rx_bin") || "",
      rx_pcn: params.get("rx_pcn") || "",
      rx_group: params.get("rx_group") || "",
      copay_pcp: params.get("copay_pcp") || "",
      copay_specialist: params.get("copay_specialist") || "",
      subscriber_name: params.get("subscriber_name") || "",
      subscriber_dob: params.get("subscriber_dob") || "",
      subscriber_relationship: params.get("subscriber_relationship") || "Self",
      provider_npi: params.get("provider_npi") || "",
      service_date: params.get("service_date") || "",
      service_type: params.get("service_type") || "",
      cpt_code: params.get("cpt_code") || "",
      facility_name: params.get("facility_name") || "",
      notes: params.get("notes") || "",
    };
  }, [params]);

  const hasPrefill = Boolean(
    prefill.first_name ||
    prefill.last_name ||
    prefill.payer ||
    prefill.member_id ||
    prefill.plan_name
  );

  const selectedWorkflow =
    WORKFLOWS.find((workflow) => workflow.id === activeWorkflow) || WORKFLOWS[0];
  const isPriorAuthFlow = workflowContext.intent === "prior-auth";

  const verifyMutation = useMutation({
    mutationFn: (payload) => api.functions.invoke("availityEligibility", payload),
  });

  const handleRunVerification = async (formData) => {
    const patientName =
      formData.patient_name || `${formData.first_name || ""} ${formData.last_name || ""}`.trim();
    const submissionType =
      activeWorkflow === "upload"
        ? "ocr"
        : activeWorkflow === "emr"
          ? "emr"
          : activeWorkflow === "bulk"
            ? "bulk"
            : "manual";

    const requestSnapshot = {
      patientName,
      payer: formData.payer || "",
      memberId: formData.member_id || "",
      providerNpi: formData.provider_npi || "",
      serviceDate: formData.service_date || "",
      submissionType,
    };

    setLastRequest(requestSnapshot);
    setVerificationResult(null);
    setVerificationError("");

    try {
      const response = await verifyMutation.mutateAsync({
        patient_name: patientName,
        patient_first_name: formData.first_name || "",
        patient_last_name: formData.last_name || "",
        dob: formData.dob || "",
        member_id: formData.member_id || "",
        payer_id: formData.payer_id || "",
        payer_name: formData.payer || "",
        provider_npi: formData.provider_npi || "",
        service_date: formData.service_date || new Date().toISOString().slice(0, 10),
        service_type_code: "30",
        patient_id: workflowContext.patientId || formData.patient_id || "",
        gateway_patient_id: formData.gateway_patient_id || "",
        submission_type: submissionType,
        emr_type: submissionType === "emr" ? "athenahealth" : "",
      });

      const normalized = normalizeEligibilityResult(response.data || {});

      if (normalized.error) {
        setVerificationError(normalized.error);
        return;
      }

      setVerificationResult(normalized);
    } catch (error) {
      setVerificationError(error?.message || "Eligibility verification failed.");
    }
  };

  const statusTone = verificationResult
    ? COVERAGE_COLORS[verificationResult.coverage_status] || COVERAGE_COLORS.Unknown
    : null;
  const StatusIcon = statusTone?.icon || ShieldCheck;

  useEffect(() => {
    if (verifyMutation.isPending) return;
    if (!lastRequest) return;

    statusSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [lastRequest, verificationError, verificationResult, verifyMutation.isPending]);

  return (
    <StaffinglyLayout
      user={user}
      currentPage="new-verification"
      title={
        isPriorAuthFlow ? "Eligibility For Prior Authorization" : "New Eligibility Verification"
      }
      breadcrumbs={
        isPriorAuthFlow ? ["Patients", "Eligibility", "Prior Auth"] : ["Eligibility", "New Check"]
      }
    >
      <div className="max-w-[1400px] mx-auto space-y-5">
        {isPriorAuthFlow ? (
          <div className="rounded-2xl border border-[#f6b037]/30 bg-[#fff9ec] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b45309]">
              Connected Workflow
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="rounded-full bg-white px-3 py-1">Patient record</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-[#293682]">
                Eligibility review
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <span className="rounded-full bg-white px-3 py-1">Prior auth case</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              The PRD flow starts prior authorization with an eligibility check. We already pulled
              the patient and payer details forward so the next handoff stays clean.
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isPriorAuthFlow
                  ? "Verify coverage before starting prior auth"
                  : "Run eligibility verification"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {isPriorAuthFlow
                  ? "Confirm active coverage and prior auth requirements before opening the case."
                  : "Choose a verification method and continue."}
              </p>
            </div>

            {hasPrefill ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Prefilled from patient record
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            {WORKFLOWS.map((workflow) => (
              <WorkflowOption
                key={workflow.id}
                workflow={workflow}
                active={activeWorkflow === workflow.id}
                onSelect={setActiveWorkflow}
              />
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Verification Engine</p>
                <p className="mt-1 text-xs text-slate-500">
                  Eligibility verification is routed through the n8n workflow server.
                </p>
              </div>
              <div className="flex justify-start lg:justify-end">
                <div className="inline-flex h-[46px] items-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
                  n8n Gateway
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeWorkflow === "manual" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedWorkflow.label}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter or confirm the details below, then run the check.
              </p>
            </div>
            <ManualEntryTab
              onSubmit={handleRunVerification}
              prefill={prefill}
              submitting={verifyMutation.isPending}
            />
          </div>
        ) : null}

        {activeWorkflow === "upload" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedWorkflow.label}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload supporting documents, review the extracted data, and continue.
              </p>
            </div>
            <UploadTab onSubmit={handleRunVerification} />
          </div>
        ) : null}

        {activeWorkflow === "bulk" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedWorkflow.label}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add multiple records manually or upload a CSV.
              </p>
            </div>
            <BulkVerifyTab />
          </div>
        ) : null}

        {activeWorkflow === "emr" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedWorkflow.label}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search a connected system and complete any missing details.
              </p>
            </div>
            <EmrTab onSubmit={handleRunVerification} />
          </div>
        ) : null}

        {(lastRequest || verifyMutation.isPending || verificationResult || verificationError) && (
          <div
            ref={statusSectionRef}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Verification Status</h2>
              <p className="mt-1 text-sm text-slate-500">
                This panel reflects the real request lifecycle between the portal backend and the
                `n8n` gateway.
              </p>
            </div>

            {lastRequest ? (
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <ResultField label="Patient" value={lastRequest.patientName} />
                <ResultField label="Payer" value={lastRequest.payer} />
                <ResultField label="Submission Type" value={lastRequest.submissionType} />
                <ResultField label="Service Date" value={lastRequest.serviceDate} />
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#293682]">
                  {verifyMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : verificationError ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : verificationResult ? (
                    <StatusIcon className="h-5 w-5" style={{ color: statusTone.text }} />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {verifyMutation.isPending
                      ? "Submitting eligibility request"
                      : verificationError
                        ? "Eligibility request failed"
                        : verificationResult
                          ? "Eligibility response received"
                          : "Ready to send"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {verifyMutation.isPending
                      ? "The frontend has sent the request to the portal backend, and the backend is waiting for the n8n gateway response."
                      : verificationError
                        ? verificationError
                        : verificationResult
                          ? "The backend returned a normalized response, and the values below are coming from that response."
                          : "Submit a verification request to see the live response state here."}
                  </p>
                </div>
              </div>

              {verificationResult ? (
                <div
                  className="rounded-2xl border-2 p-5"
                  style={{
                    backgroundColor: statusTone.bg,
                    borderColor: statusTone.border,
                  }}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: statusTone.text }}>
                        Coverage Status
                      </p>
                      <p className="mt-2 text-2xl font-bold" style={{ color: statusTone.text }}>
                        {verificationResult.coverage_status}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <ResultField label="Confidence" value={`${verificationResult.confidence_score}%`} />
                      <ResultField label="Channel" value={verificationResult.channel_used} />
                      <ResultField
                        label="Response Time"
                        value={
                          verificationResult.response_time_seconds
                            ? `${verificationResult.response_time_seconds}s`
                            : ""
                        }
                      />
                      <ResultField label="Plan Name" value={verificationResult.plan_name} />
                      <ResultField label="Plan Type" value={verificationResult.plan_type} />
                      <ResultField label="Network" value={verificationResult.network_status} />
                      <ResultField label="Effective Date" value={verificationResult.effective_date} />
                      <ResultField
                        label="Termination Date"
                        value={verificationResult.termination_date}
                      />
                      <ResultField
                        label="Prior Auth Required"
                        value={
                          verificationResult.prior_auth_required == null
                            ? ""
                            : verificationResult.prior_auth_required
                              ? "Yes"
                              : "No"
                        }
                      />
                    </div>
                  </div>

                  {verificationResult.flags.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {verificationResult.flags.map((flag) => (
                        <div
                          key={flag}
                          className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </StaffinglyLayout>
  );
}
