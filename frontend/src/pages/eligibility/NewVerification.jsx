import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { useAuthUserQuery } from "@/lib/query";
import { getWorkflowContext } from "@/lib/utils/workflow";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import ManualEntryTab from "@/components/insuverif/ManualEntryTab";
import UploadTab from "@/components/insuverif/UploadTab";
import EmrTab from "@/components/insuverif/EmrTab.jsx";
import BulkVerifyTab from "@/components/insuverif/BulkVerifyTab";
import { ArrowRight, ClipboardCheck, FileUp, Layers3, MonitorSmartphone } from "lucide-react";

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
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const workflowContext = useMemo(() => getWorkflowContext(window.location.search), []);
  const [activeWorkflow, setActiveWorkflow] = useState(() => getInitialWorkflow(params));

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

  const handleRunVerification = (formData) => {
    const verificationParams = new URLSearchParams({
      source: workflowContext.source || "",
      intent: workflowContext.intent || "",
      patientId: workflowContext.patientId || formData.patient_id || "",
      first_name: formData.first_name || "",
      last_name: formData.last_name || "",
      patient: formData.patient_name || `${formData.first_name} ${formData.last_name}`.trim(),
      payer: formData.payer || "",
      member_id: formData.member_id || "",
      payer_id: formData.payer_id || "",
      service_type: formData.service_type || "",
      provider_npi: formData.provider_npi || "",
      dob: formData.dob || "",
      service_date: formData.service_date || "",
      middle_name: formData.middle_name || "",
      gender: formData.gender || "",
      address: formData.address || "",
      city: formData.city || "",
      state: formData.state || "",
      zip: formData.zip || "",
      plan_name: formData.plan_name || "",
      plan_type: formData.plan_type || "",
      effective_date: formData.effective_date || "",
      termination_date: formData.termination_date || "",
      rx_bin: formData.rx_bin || "",
      rx_pcn: formData.rx_pcn || "",
      rx_group: formData.rx_group || "",
      copay_pcp: formData.copay_pcp || "",
      copay_specialist: formData.copay_specialist || "",
      group_number: formData.group_number || "",
      subscriber_name: formData.subscriber_name || "",
      subscriber_dob: formData.subscriber_dob || "",
      subscriber_relationship: formData.subscriber_relationship || "",
      cpt_code: formData.cpt_code || "",
      facility_name: formData.facility_name || "",
      notes: formData.notes || "",
      procedure_requested: formData.cpt_code || formData.service_type || "",
      verification_engine: "n8n",
    });

    navigate(createPageUrl(`Processing?${verificationParams.toString()}`));
  };

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

          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[220px,1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">Verification Engine</p>
              <p className="mt-1 text-xs text-slate-500">
                Eligibility verification is routed through the n8n workflow server.
              </p>
            </div>
            <div>
              <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
                n8n Gateway
              </div>
              <p className="mt-2 text-xs text-slate-400">
                In-app eligibility execution has been removed from this workflow.
              </p>
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
            <ManualEntryTab onSubmit={handleRunVerification} prefill={prefill} />
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
      </div>
    </StaffinglyLayout>
  );
}
