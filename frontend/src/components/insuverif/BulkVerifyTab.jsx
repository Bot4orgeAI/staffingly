import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuthUserQuery } from "@/lib/query";
import { useQuery } from "@tanstack/react-query";
import AppSelect from "@/components/ui/app-select";
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Download,
  Loader2,
  Play,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

const EMPTY_ROW = {
  patient_id: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  payer: "",
  payer_id: "",
  member_id: "",
  group_number: "",
  plan_name: "",
  plan_type: "",
  effective_date: "",
  termination_date: "",
  rx_bin: "",
  rx_pcn: "",
  rx_group: "",
  copay_pcp: "",
  copay_specialist: "",
  subscriber_name: "",
  subscriber_dob: "",
  subscriber_relationship: "Self",
  provider_npi: "",
  cpt_code: "",
  facility_name: "",
  notes: "",
  service_type: "Specialist Visit",
  service_date: "",
};

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const PLAN_TYPES = [
  "PPO",
  "HMO",
  "EPO",
  "POS",
  "HDHP",
  "Medicare Advantage",
  "Medicaid Managed Care",
  "Unknown",
];
const SERVICE_TYPES = [
  "Primary Care Visit",
  "Specialist Visit",
  "Urgent Care",
  "Emergency Room",
  "Lab/Diagnostics",
  "Imaging/Radiology",
  "Mental Health/Behavioral",
  "Physical Therapy",
  "Chiropractic",
  "Surgery",
  "Preventive/Wellness",
  "Pharmacy",
  "Other",
];
const RELATIONSHIPS = ["Self", "Spouse", "Child", "Other Dependent"];
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const SAMPLE_CSV = [
  "patient_id,first_name,middle_name,last_name,dob,gender,phone,email,address,city,state,zip,payer,payer_id,member_id,group_number,plan_name,plan_type,effective_date,termination_date,rx_bin,rx_pcn,rx_group,copay_pcp,copay_specialist,subscriber_name,subscriber_dob,subscriber_relationship,provider_npi,service_type,service_date,cpt_code,facility_name,notes",
  "pat-1001,Sarah,A,Mitchell,1985-03-14,Female,555-0101,sarah@example.com,12 Lake St,Austin,TX,78701,UnitedHealthcare,UHC,884720193,GRP-100,Choice Plus,PPO,2026-01-01,2026-12-31,610014,OHCARD,OHRX,25,45,Sarah Mitchell,1985-03-14,Self,1234567890,Specialist Visit,2026-02-21,99213,North Clinic,Follow-up visit",
  "pat-1002,James,,Holloway,1971-07-22,Male,555-0102,james@example.com,99 Cedar Ave,Dallas,TX,75201,Aetna,AETNA,562901847,GRP-200,Open Access,HMO,2026-01-01,2026-12-31,610502,AETRX,AETGRP,20,40,James Holloway,1971-07-22,Self,0987654321,Primary Care Visit,2026-02-21,99214,Central Care,Annual review",
].join("\n");

function validateRow(row) {
  const issues = [];
  if (!row.first_name?.trim()) issues.push("first_name required");
  if (!row.last_name?.trim()) issues.push("last_name required");
  if (!row.dob?.trim()) issues.push("dob required");
  if (!row.payer?.trim() && !row.payer_id?.trim()) issues.push("payer or payer_id required");
  if (!row.member_id?.trim()) issues.push("member_id required");
  if (row.dob && Number.isNaN(Date.parse(row.dob))) issues.push("invalid DOB");
  if (row.service_date && Number.isNaN(Date.parse(row.service_date))) issues.push("invalid service date");
  if (row.subscriber_dob && Number.isNaN(Date.parse(row.subscriber_dob))) {
    issues.push("invalid subscriber DOB");
  }
  return issues;
}

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "Need header + at least 1 data row." };
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((header, valueIndex) => {
      row[header] = values[valueIndex] || "";
    });
    row._line = index + 2;
    return row;
  });
  return { rows, error: null };
}

function toBatchPayloadRow(row) {
  return {
    patient_id: row.patient_id || "",
    patient_name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
    first_name: row.first_name || "",
    middle_name: row.middle_name || "",
    last_name: row.last_name || "",
    dob: row.dob || "",
    gender: row.gender || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    city: row.city || "",
    state: row.state || "",
    zip: row.zip || "",
    payer: row.payer || "",
    payer_id: row.payer_id || "",
    member_id: row.member_id || "",
    group_number: row.group_number || "",
    plan_name: row.plan_name || "",
    plan_type: row.plan_type || "",
    effective_date: row.effective_date || "",
    termination_date: row.termination_date || "",
    rx_bin: row.rx_bin || "",
    rx_pcn: row.rx_pcn || "",
    rx_group: row.rx_group || "",
    copay_pcp: row.copay_pcp || "",
    copay_specialist: row.copay_specialist || "",
    subscriber_name: row.subscriber_name || "",
    subscriber_dob: row.subscriber_dob || "",
    subscriber_relationship: row.subscriber_relationship || "",
    provider_npi: row.provider_npi || "",
    cpt_code: row.cpt_code || "",
    facility_name: row.facility_name || "",
    notes: row.notes || "",
    service_type: row.service_type || "",
    service_date: row.service_date || "",
  };
}

function FieldShell({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, type = "text", placeholder = "" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
    />
  );
}

function RowSection({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-4 text-sm font-bold text-slate-800">{title}</h4>
      {children}
    </div>
  );
}

function BulkRowCard({ row, index, status, onUpdate, onRemove }) {
  const issues = validateRow(row);
  const patientName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  const statusTone =
    status === "ok"
      ? "border-emerald-200 bg-emerald-50"
      : status === "error"
        ? "border-red-200 bg-red-50"
        : issues.length
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[24px] border p-5 shadow-sm ${statusTone}`}>
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Patient {index + 1}
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-800">
            {patientName || "New bulk verification row"}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {status === "ok" ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
                Verified
              </span>
            ) : null}
            {status === "error" ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700">
                Failed
              </span>
            ) : null}
            {issues.length > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                {issues.length} issue{issues.length !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                Ready for batch validation
              </span>
            )}
          </div>
          {issues.length > 0 ? (
            <p className="mt-2 text-xs text-amber-700">{issues.join(" • ")}</p>
          ) : null}
        </div>
        {!status ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        <RowSection title="Patient Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FieldShell label="Patient ID">
              <TextInput value={row.patient_id || ""} onChange={(e) => onUpdate("patient_id", e.target.value)} />
            </FieldShell>
            <FieldShell label="First Name">
              <TextInput value={row.first_name || ""} onChange={(e) => onUpdate("first_name", e.target.value)} />
            </FieldShell>
            <FieldShell label="Middle Name">
              <TextInput value={row.middle_name || ""} onChange={(e) => onUpdate("middle_name", e.target.value)} />
            </FieldShell>
            <FieldShell label="Last Name">
              <TextInput value={row.last_name || ""} onChange={(e) => onUpdate("last_name", e.target.value)} />
            </FieldShell>
            <FieldShell label="Date of Birth">
              <TextInput type="date" value={row.dob || ""} onChange={(e) => onUpdate("dob", e.target.value)} />
            </FieldShell>
            <FieldShell label="Gender">
              <AppSelect
                value={row.gender || ""}
                onValueChange={(value) => onUpdate("gender", value)}
                options={GENDERS.map((item) => ({ label: item, value: item }))}
                placeholder="Select..."
                triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
            </FieldShell>
            <FieldShell label="Phone">
              <TextInput value={row.phone || ""} onChange={(e) => onUpdate("phone", e.target.value)} />
            </FieldShell>
            <FieldShell label="Email">
              <TextInput type="email" value={row.email || ""} onChange={(e) => onUpdate("email", e.target.value)} />
            </FieldShell>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldShell label="Street Address">
                <textarea
                  value={row.address || ""}
                  onChange={(e) => onUpdate("address", e.target.value)}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
              </FieldShell>
            </div>
            <FieldShell label="City">
              <TextInput value={row.city || ""} onChange={(e) => onUpdate("city", e.target.value)} />
            </FieldShell>
            <FieldShell label="State">
              <AppSelect
                value={row.state || ""}
                onValueChange={(value) => onUpdate("state", value)}
                options={US_STATES.map((item) => ({ label: item, value: item }))}
                placeholder="Select..."
                triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
            </FieldShell>
            <FieldShell label="ZIP">
              <TextInput value={row.zip || ""} onChange={(e) => onUpdate("zip", e.target.value)} />
            </FieldShell>
          </div>
        </RowSection>

        <RowSection title="Insurance Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FieldShell label="Insurance Payer">
              <TextInput value={row.payer || ""} onChange={(e) => onUpdate("payer", e.target.value)} />
            </FieldShell>
            <FieldShell label="Payer ID">
              <TextInput value={row.payer_id || ""} onChange={(e) => onUpdate("payer_id", e.target.value)} />
            </FieldShell>
            <FieldShell label="Member ID">
              <TextInput value={row.member_id || ""} onChange={(e) => onUpdate("member_id", e.target.value)} />
            </FieldShell>
            <FieldShell label="Group Number">
              <TextInput value={row.group_number || ""} onChange={(e) => onUpdate("group_number", e.target.value)} />
            </FieldShell>
            <FieldShell label="Plan Name">
              <TextInput value={row.plan_name || ""} onChange={(e) => onUpdate("plan_name", e.target.value)} />
            </FieldShell>
            <FieldShell label="Plan Type">
              <AppSelect
                value={row.plan_type || ""}
                onValueChange={(value) => onUpdate("plan_type", value)}
                options={PLAN_TYPES.map((item) => ({ label: item, value: item }))}
                placeholder="Select..."
                triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
            </FieldShell>
            <FieldShell label="Effective Date">
              <TextInput type="date" value={row.effective_date || ""} onChange={(e) => onUpdate("effective_date", e.target.value)} />
            </FieldShell>
            <FieldShell label="Termination Date">
              <TextInput type="date" value={row.termination_date || ""} onChange={(e) => onUpdate("termination_date", e.target.value)} />
            </FieldShell>
            <FieldShell label="Subscriber Name">
              <TextInput value={row.subscriber_name || ""} onChange={(e) => onUpdate("subscriber_name", e.target.value)} />
            </FieldShell>
            <FieldShell label="Subscriber DOB">
              <TextInput type="date" value={row.subscriber_dob || ""} onChange={(e) => onUpdate("subscriber_dob", e.target.value)} />
            </FieldShell>
            <FieldShell label="Subscriber Relationship">
              <AppSelect
                value={row.subscriber_relationship || "Self"}
                onValueChange={(value) => onUpdate("subscriber_relationship", value)}
                options={RELATIONSHIPS.map((item) => ({ label: item, value: item }))}
                placeholder="Select..."
                triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
            </FieldShell>
            <FieldShell label="Rx BIN">
              <TextInput value={row.rx_bin || ""} onChange={(e) => onUpdate("rx_bin", e.target.value)} />
            </FieldShell>
            <FieldShell label="Rx PCN">
              <TextInput value={row.rx_pcn || ""} onChange={(e) => onUpdate("rx_pcn", e.target.value)} />
            </FieldShell>
            <FieldShell label="Rx Group">
              <TextInput value={row.rx_group || ""} onChange={(e) => onUpdate("rx_group", e.target.value)} />
            </FieldShell>
            <FieldShell label="Copay (PCP)">
              <TextInput value={row.copay_pcp || ""} onChange={(e) => onUpdate("copay_pcp", e.target.value)} />
            </FieldShell>
            <FieldShell label="Copay (Specialist)">
              <TextInput value={row.copay_specialist || ""} onChange={(e) => onUpdate("copay_specialist", e.target.value)} />
            </FieldShell>
          </div>
        </RowSection>

        <RowSection title="Visit Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FieldShell label="Provider NPI">
              <TextInput value={row.provider_npi || ""} onChange={(e) => onUpdate("provider_npi", e.target.value)} />
            </FieldShell>
            <FieldShell label="Service Date">
              <TextInput type="date" value={row.service_date || ""} onChange={(e) => onUpdate("service_date", e.target.value)} />
            </FieldShell>
            <FieldShell label="Service Type">
              <AppSelect
                value={row.service_type || ""}
                onValueChange={(value) => onUpdate("service_type", value)}
                options={SERVICE_TYPES.map((item) => ({ label: item, value: item }))}
                placeholder="Select..."
                triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
            </FieldShell>
            <FieldShell label="CPT Code">
              <TextInput value={row.cpt_code || ""} onChange={(e) => onUpdate("cpt_code", e.target.value)} />
            </FieldShell>
            <FieldShell label="Facility Name">
              <TextInput value={row.facility_name || ""} onChange={(e) => onUpdate("facility_name", e.target.value)} />
            </FieldShell>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldShell label="Notes">
                <textarea
                  value={row.notes || ""}
                  onChange={(e) => onUpdate("notes", e.target.value)}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
              </FieldShell>
            </div>
          </div>
        </RowSection>
      </div>
    </div>
  );
}

export default function BulkVerifyTab() {
  const { data: user } = useAuthUserQuery({ redirectOnError: false });
  const { data: clientsResponse, error: clientsError, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients", "bulk-eligibility-selector"],
    queryFn: () => api.clients.list({ limit: 100 }),
    enabled: Boolean(user && !user.clientId),
    staleTime: 5 * 60 * 1000,
  });
  const [mode, setMode] = useState("manual");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [rows, setRows] = useState([{ ...EMPTY_ROW, _id: Date.now() }]);
  const [csvRows, setCsvRows] = useState(null);
  const [aiValidating, setAiValidating] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [batchJobId, setBatchJobId] = useState(null);
  const [batchStatus, setBatchStatus] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [batchError, setBatchError] = useState(null);
  const [submittedRowIds, setSubmittedRowIds] = useState([]);
  const fileRef = useRef();

  const addRow = () => setRows((current) => [...current, { ...EMPTY_ROW, _id: Date.now() }]);
  const removeRow = (id) => setRows((current) => current.filter((row) => row._id !== id));
  const updateRow = (id, field, value) =>
    setRows((current) => current.map((row) => (row._id === id ? { ...row, [field]: value } : row)));

  const processCSV = async (file) => {
    const text = await file.text();
    const { rows: parsed, error } = parseCSV(text);
    if (error) {
      alert(error);
      return;
    }

    setAiValidating(true);
    setBatchError(null);
    const validated = parsed.map((row) => ({
      ...EMPTY_ROW,
      ...row,
      _id: `csv_${row._line}`,
      _issues: validateRow(row),
    }));

    const clean = validated.filter((row) => !row._issues.length);
    if (clean.length > 0) {
      const aiResult = await api.integrations.Core.InvokeLLM({
        prompt: `You are a healthcare data validator. For each subscriber record below, flag if there are obvious data issues (wrong member ID format for the payer, suspicious DOB, etc).
Return JSON array: [{ "index": number, "ai_flag": boolean, "ai_note": string }]

Records: ${JSON.stringify(clean.map((row, index) => ({ index, ...row })))}`,
        response_json_schema: {
          type: "object",
          properties: {
            validations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  ai_flag: { type: "boolean" },
                  ai_note: { type: "string" },
                },
              },
            },
          },
        },
      });

      const validations = aiResult?.validations || [];
      let cleanIndex = 0;
      validated.forEach((row) => {
        if (!row._issues.length) {
          const match = validations.find((item) => item.index === cleanIndex) || {};
          row._ai_flag = Boolean(match.ai_flag);
          row._ai_note = match.ai_note || "";
          cleanIndex += 1;
        }
      });
    }

    setAiValidating(false);
    setCsvRows(validated);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bulk_verify_template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!batchJobId || !running) return undefined;

    let cancelled = false;

    const pollBatch = async () => {
      try {
        const response = await api.eligibility.getBatch(batchJobId);
        if (cancelled) return;

        setBatchStatus(response.status || null);
        setBatchResult(response.result || null);
        setBatchError(response.errorMessage || null);

        const nextResults = {};
        (response.result?.rows || []).forEach((rowResult) => {
          const rowId = submittedRowIds[rowResult.index];
          if (!rowId) return;
          nextResults[rowId] = rowResult.status === "completed" ? "ok" : "error";
        });
        setResults(nextResults);

        if (response.status === "completed" || response.status === "failed") {
          setRunning(false);
        }
      } catch (error) {
        if (cancelled) return;
        setBatchError(error.message || "Failed to refresh batch status");
        setRunning(false);
      }
    };

    void pollBatch();
    const intervalId = window.setInterval(() => {
      void pollBatch();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [batchJobId, running, submittedRowIds]);

  const sourceRows = mode === "csv" ? csvRows || [] : rows;
  const availableClients = clientsResponse?.data || clientsResponse?.clients || [];
  const resolvedClientId = user?.clientId || selectedClientId || "";
  const validRows = useMemo(
    () => sourceRows.filter((row) => !validateRow(row).length),
    [sourceRows]
  );
  const validCount = validRows.length;
  const doneCount = batchResult?.completedRows || 0;
  const progressPercent =
    batchResult?.totalRows > 0
      ? Math.round((batchResult.completedRows / batchResult.totalRows) * 100)
      : 0;

  const handleRunAll = async () => {
    const toRun = validRows;
    if (!toRun.length) return;

    setRunning(true);
    setBatchError(null);
    setBatchResult({
      totalRows: toRun.length,
      completedRows: 0,
      successCount: 0,
      failureCount: 0,
      rows: [],
    });
    setResults({});
    setSubmittedRowIds(toRun.map((row) => row._id));

    try {
      const response = await api.eligibility.createBatch({
        clientId: resolvedClientId || undefined,
        verificationEngine: "n8n",
        rows: toRun.map(toBatchPayloadRow),
      });

      setBatchJobId(response.batchJobId);
      setBatchStatus(response.status || "queued");
    } catch (error) {
      setBatchError(error.message || "Failed to create bulk eligibility batch");
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Bulk Eligibility Verification</h3>
            <p className="text-xs text-slate-400">
              Create a backend batch job for multiple verifications and track row-level progress.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => {
                setMode("manual");
                setCsvRows(null);
              }}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-all ${
                mode === "manual" ? "bg-white text-slate-800 shadow" : "text-slate-500"
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setMode("csv")}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-all ${
                mode === "csv" ? "bg-white text-slate-800 shadow" : "text-slate-500"
              }`}
            >
              Upload CSV
            </button>
          </div>
        </div>

        {!user?.clientId ? (
          <div className="mb-4 max-w-md">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Client
            </label>
            <AppSelect
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              placeholder={clientsLoading ? "Loading clients..." : "Select client"}
              options={availableClients.map((client) => ({
                label: client.name,
                value: client.id,
              }))}
              disabled={clientsLoading || availableClients.length === 0}
              triggerClassName="h-[42px] bg-white px-3 py-2 text-sm"
            />
            {clientsError ? (
              <p className="mt-2 text-xs text-red-500">
                {clientsError.message || "Unable to load clients for selection."}
              </p>
            ) : availableClients.length === 0 && !clientsLoading ? (
              <p className="mt-2 text-xs text-slate-400">
                No clients are available to select.
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                Bulk eligibility batches must be associated with a client.
              </p>
            )}
          </div>
        ) : null}

        {mode === "csv" && (
          <div className="space-y-4">
            <button
              onClick={downloadSample}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Download Template
            </button>

            {aiValidating && (
              <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                <Brain className="h-5 w-5 animate-pulse" />
                <span>AI is validating records…</span>
              </div>
            )}

            {!csvRows && !aiValidating && (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = event.dataTransfer.files[0];
                  if (file) void processCSV(file);
                }}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Upload className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Drop CSV here or click to browse
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files[0]) {
                      void processCSV(event.target.files[0]);
                    }
                  }}
                />
              </div>
            )}

            {csvRows && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                    {csvRows.filter((row) => !row._issues?.length && !row._ai_flag).length} clean
                  </span>
                  {csvRows.filter((row) => row._ai_flag).length > 0 && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                      {csvRows.filter((row) => row._ai_flag).length} AI-flagged
                    </span>
                  )}
                  {csvRows.filter((row) => row._issues?.length).length > 0 && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-600">
                      {csvRows.filter((row) => row._issues?.length).length} errors
                    </span>
                  )}
                  <button
                    onClick={() => setCsvRows(null)}
                    className="ml-auto text-xs text-slate-400 hover:text-slate-600"
                  >
                    Change file
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-4">
            {rows.map((row, index) => (
              <BulkRowCard
                key={row._id}
                row={row}
                index={index}
                status={results[row._id]}
                onUpdate={(field, value) => updateRow(row._id, field, value)}
                onRemove={() => removeRow(row._id)}
              />
            ))}
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" /> Add Patient Row
            </button>
          </div>
        )}
      </div>

      {batchError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {batchError}
        </div>
      ) : null}

      {(validCount > 0 || doneCount > 0) && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-sm font-bold text-slate-800">
              {running
                ? `Processing ${doneCount} of ${batchResult?.totalRows || validCount} records…`
                : batchResult?.completedRows
                  ? `Batch complete — ${batchResult.successCount} successful, ${batchResult.failureCount} failed`
                  : `${validCount} record${validCount !== 1 ? "s" : ""} ready to verify`}
            </p>
            <p className="text-xs text-slate-400">
              {batchStatus
                ? `Backend batch status: ${batchStatus}`
                : !resolvedClientId
                  ? "Select a client before starting the bulk batch"
                  : "Runs as a persisted backend batch job with stored row results"}
            </p>
            {(running || batchResult?.completedRows) && (
              <div className="mt-2 h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: "#293682",
                  }}
                />
              </div>
            )}
          </div>
          <button
            onClick={handleRunAll}
            disabled={running || validCount === 0 || aiValidating || !resolvedClientId}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#293682" }}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Batch Running…" : "Run All Verifications"}
          </button>
        </div>
      )}

      {batchResult?.rows?.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Batch Results</h3>
            <p className="text-xs text-slate-400">
              Stored row-level results from the backend batch job.
            </p>
          </div>
          <div className="space-y-2">
            {batchResult.rows.map((rowResult) => (
              <div
                key={`${rowResult.index}-${rowResult.input.memberId}`}
                className={`rounded-xl border px-4 py-3 ${
                  rowResult.status === "completed"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {rowResult.input.patientName || `Row ${rowResult.index + 1}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {rowResult.input.payerName || rowResult.input.payerId || "Unknown payer"} · Member ID{" "}
                      {rowResult.input.memberId}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      rowResult.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {rowResult.status === "completed" ? "Completed" : "Failed"}
                  </span>
                </div>
                {rowResult.result ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Coverage: {rowResult.result.coverageStatus || "Unknown"} · Plan:{" "}
                    {rowResult.result.planName || "N/A"} · Confidence:{" "}
                    {rowResult.result.confidenceScore ?? "N/A"}
                  </p>
                ) : null}
                {rowResult.error ? (
                  <p className="mt-2 text-xs text-red-600">{rowResult.error}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
