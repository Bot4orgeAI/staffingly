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
  first_name: "",
  last_name: "",
  dob: "",
  payer: "",
  payer_id: "",
  member_id: "",
  provider_npi: "",
  service_type: "Specialist Visit",
  service_date: "",
};

const SAMPLE_CSV = [
  "first_name,last_name,dob,payer,payer_id,member_id,provider_npi,service_type,service_date",
  "Sarah,Mitchell,1985-03-14,UnitedHealthcare,UHC,884720193,1234567890,Specialist Visit,2026-02-21",
  "James,Holloway,1971-07-22,Aetna,AETNA,562901847,0987654321,Primary Care,2026-02-21",
].join("\n");

function validateRow(row) {
  const issues = [];
  if (!row.last_name?.trim()) issues.push("last_name required");
  if (!row.payer?.trim() && !row.payer_id?.trim()) issues.push("payer or payer_id required");
  if (!row.member_id?.trim()) issues.push("member_id required");
  if (row.dob && Number.isNaN(Date.parse(row.dob))) issues.push("invalid DOB");
  if (row.service_date && Number.isNaN(Date.parse(row.service_date))) issues.push("invalid service date");
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

const COLS = [
  "first_name",
  "last_name",
  "dob",
  "payer",
  "payer_id",
  "member_id",
  "provider_npi",
  "service_type",
  "service_date",
];

function toBatchPayloadRow(row) {
  return {
    patient_name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    dob: row.dob || "",
    payer: row.payer || "",
    payer_id: row.payer_id || "",
    member_id: row.member_id || "",
    provider_npi: row.provider_npi || "",
    service_type: row.service_type || "",
    service_date: row.service_date || "",
  };
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
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="rounded-lg border border-slate-200 bg-slate-50">
                  {COLS.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-semibold capitalize text-slate-500"
                    >
                      {column.replace(/_/g, " ")}
                    </th>
                  ))}
                  <th className="border-b border-slate-200 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const issues = validateRow(row);
                  const status = results[row._id];
                  return (
                    <tr
                      key={row._id}
                      className={`border-b border-slate-100 ${
                        status === "ok"
                          ? "bg-emerald-50"
                          : status === "error"
                            ? "bg-red-50"
                            : issues.length
                              ? "bg-amber-50/40"
                              : ""
                      }`}
                    >
                      {COLS.map((column) => (
                        <td key={column} className="px-1 py-1">
                          <input
                            value={row[column] || ""}
                            onChange={(event) => updateRow(row._id, column, event.target.value)}
                            className="min-w-[90px] w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder={column.replace(/_/g, " ")}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1">
                        {status === "ok" && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                        {status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                        {!status && (
                          <button
                            onClick={() => removeRow(row._id)}
                            className="text-slate-300 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              onClick={addRow}
              className="mt-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
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
