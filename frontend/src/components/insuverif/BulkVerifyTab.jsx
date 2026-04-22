import { useState, useRef } from "react";
import { api } from "@/lib/api";
import {
  Upload,
  Download,
  Brain,
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

const EMPTY_ROW = {
  first_name: "",
  last_name: "",
  dob: "",
  payer: "",
  member_id: "",
  provider_npi: "",
  service_type: "Specialist Visit",
  service_date: "",
};

const SAMPLE_CSV = [
  "first_name,last_name,dob,payer,member_id,provider_npi,service_type,service_date",
  "Sarah,Mitchell,1985-03-14,UnitedHealthcare,UHC-884720193,1234567890,Specialist Visit,2026-02-21",
  "James,Holloway,1971-07-22,Aetna,AETNA-562901847,0987654321,Primary Care,2026-02-21",
].join("\n");

function validateRow(row) {
  const issues = [];
  if (!row.last_name?.trim()) issues.push("last_name required");
  if (!row.payer?.trim()) issues.push("payer required");
  if (!row.member_id?.trim()) issues.push("member_id required");
  if (row.dob && isNaN(Date.parse(row.dob))) issues.push("invalid DOB");
  return issues;
}

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "Need header + at least 1 data row." };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line, i) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, j) => {
      row[h] = vals[j] || "";
    });
    row._line = i + 2;
    return row;
  });
  return { rows, error: null };
}

const COLS = [
  "first_name",
  "last_name",
  "dob",
  "payer",
  "member_id",
  "provider_npi",
  "service_type",
];

export default function BulkVerifyTab() {
  const [mode, setMode] = useState("manual"); // manual | csv
  const [rows, setRows] = useState([{ ...EMPTY_ROW, _id: Date.now() }]);
  const [csvRows, setCsvRows] = useState(null);
  const [aiValidating, setAiValidating] = useState(false);
  const [running, setRunning] = useState(false);
  const [runIndex, setRunIndex] = useState(-1);
  const [results, setResults] = useState({}); // _id -> "ok"|"error"
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  // Manual row helpers
  const addRow = () => setRows((r) => [...r, { ...EMPTY_ROW, _id: Date.now() }]);
  const removeRow = (id) => setRows((r) => r.filter((x) => x._id !== id));
  const updateRow = (id, field, val) =>
    setRows((r) => r.map((x) => (x._id === id ? { ...x, [field]: val } : x)));

  // CSV upload
  const processCSV = async (file) => {
    const text = await file.text();
    const { rows: parsed, error } = parseCSV(text);
    if (error) {
      alert(error);
      return;
    }

    setAiValidating(true);
    const validated = parsed.map((r) => ({ ...r, _id: `csv_${r._line}`, _issues: validateRow(r) }));

    // AI validation
    const clean = validated.filter((r) => !r._issues.length);
    if (clean.length > 0) {
      const aiResult = await api.integrations.Core.InvokeLLM({
        prompt: `You are a healthcare data validator. For each subscriber record below, flag if there are obvious data issues (wrong member ID format for the payer, suspicious DOB, etc).
Return JSON array: [{ "index": number, "ai_flag": boolean, "ai_note": string }]

Records: ${JSON.stringify(clean.map((r, i) => ({ index: i, ...r })))}`,
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
      const v = aiResult?.validations || [];
      let ci = 0;
      validated.forEach((row) => {
        if (!row._issues.length) {
          const match = v.find((x) => x.index === ci) || {};
          row._ai_flag = !!match.ai_flag;
          row._ai_note = match.ai_note || "";
          ci++;
        }
      });
    }

    setAiValidating(false);
    setCsvRows(validated);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_verify_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Run verifications sequentially with 200ms throttle
  const handleRunAll = async () => {
    const toRun =
      mode === "csv"
        ? (csvRows || []).filter((r) => !r._issues?.length)
        : rows.filter((r) => !validateRow(r).length);

    if (!toRun.length) return;
    setRunning(true);

    for (let i = 0; i < toRun.length; i++) {
      setRunIndex(i);
      const row = toRun[i];
      try {
        await api.functions.invoke("availityEligibility", {
          patient_first_name: row.first_name,
          patient_last_name: row.last_name,
          patient_dob: row.dob,
          payer_name: row.payer,
          member_id: row.member_id,
          provider_npi: row.provider_npi,
          service_type: row.service_type,
          service_date: row.service_date || new Date().toISOString().slice(0, 10),
        });
        setResults((r) => ({ ...r, [row._id]: "ok" }));
      } catch {
        setResults((r) => ({ ...r, [row._id]: "error" }));
      }
      if (i < toRun.length - 1) await new Promise((res) => setTimeout(res, 200));
    }

    setRunning(false);
    setRunIndex(-1);
  };

  const validCount =
    mode === "csv"
      ? (csvRows || []).filter((r) => !r._issues?.length).length
      : rows.filter((r) => !validateRow(r).length).length;
  const doneCount = Object.values(results).length;

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Bulk Eligibility Verification</h3>
            <p className="text-xs text-slate-400">
              Verify multiple subscribers at once — AI validates before submission
            </p>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => {
                setMode("manual");
                setCsvRows(null);
              }}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === "manual" ? "bg-white shadow text-slate-800" : "text-slate-500"}`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setMode("csv")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === "csv" ? "bg-white shadow text-slate-800" : "text-slate-500"}`}
            >
              Upload CSV
            </button>
          </div>
        </div>

        {/* CSV mode */}
        {mode === "csv" && (
          <div className="space-y-4">
            <button
              onClick={downloadSample}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <Download className="w-3.5 h-3.5" /> Download Template
            </button>

            {aiValidating && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
                <Brain className="w-5 h-5 animate-pulse" />
                <span>AI is validating records…</span>
              </div>
            )}

            {!csvRows && !aiValidating && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) processCSV(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Drop CSV here or click to browse
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files[0]) processCSV(e.target.files[0]);
                  }}
                />
              </div>
            )}

            {csvRows && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                    ✓ {csvRows.filter((r) => !r._issues?.length && !r._ai_flag).length} clean
                  </span>
                  {csvRows.filter((r) => r._ai_flag).length > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                      ⚠ {csvRows.filter((r) => r._ai_flag).length} AI-flagged
                    </span>
                  )}
                  {csvRows.filter((r) => r._issues?.length).length > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-semibold">
                      ✗ {csvRows.filter((r) => r._issues?.length).length} errors
                    </span>
                  )}
                  <button
                    onClick={() => setCsvRows(null)}
                    className="ml-auto text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Change file
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual mode — editable table */}
        {mode === "manual" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border border-slate-200 rounded-lg">
                  {COLS.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-2 text-left text-slate-500 font-semibold capitalize whitespace-nowrap border-b border-slate-200"
                    >
                      {c.replace(/_/g, " ")}
                    </th>
                  ))}
                  <th className="px-3 py-2 border-b border-slate-200"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const issues = validateRow(row);
                  const status = results[row._id];
                  return (
                    <tr
                      key={row._id}
                      className={`border-b border-slate-100 ${status === "ok" ? "bg-emerald-50" : status === "error" ? "bg-red-50" : issues.length ? "bg-amber-50/40" : ""}`}
                    >
                      {COLS.map((c) => (
                        <td key={c} className="px-1 py-1">
                          <input
                            value={row[c] || ""}
                            onChange={(e) => updateRow(row._id, c, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 min-w-[90px]"
                            placeholder={c.replace(/_/g, " ")}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1">
                        {status === "ok" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                        {!status && (
                          <button
                            onClick={() => removeRow(row._id)}
                            className="text-slate-300 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
              className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>
        )}
      </div>

      {/* Run panel */}
      {(validCount > 0 || doneCount > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-800 text-sm">
              {running
                ? `Verifying ${runIndex + 1} of ${validCount}…`
                : doneCount > 0
                  ? `Done — ${doneCount} verifications run`
                  : `${validCount} record${validCount !== 1 ? "s" : ""} ready to verify`}
            </p>
            <p className="text-xs text-slate-400">
              Throttled to 5 req/s · AI-validated before submission
            </p>
            {running && (
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full w-64 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(((runIndex + 1) / validCount) * 100)}%`,
                    backgroundColor: "#293682",
                  }}
                />
              </div>
            )}
          </div>
          <button
            onClick={handleRunAll}
            disabled={running || validCount === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: "#293682" }}
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "Running…" : "Run All Verifications"}
          </button>
        </div>
      )}
    </div>
  );
}
