import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { X, Upload, Download, CheckCircle, AlertCircle, Loader2, Brain, Eye } from "lucide-react";

const REQUIRED_COLS = ["last_name"];
const ALL_COLS = [
  "first_name",
  "last_name",
  "provider_type",
  "specialty",
  "npi",
  "email",
  "phone",
  "license_number",
  "license_state",
  "license_expiry",
  "status",
];

const SAMPLE_CSV = [
  ALL_COLS.join(","),
  "John,Smith,MD,Cardiology,1234567890,jsmith@clinic.com,(555) 010-0100,MED-001,TX,2027-06-30,Active",
  "Jane,Doe,NP,Pediatrics,0987654321,jdoe@clinic.com,(555) 020-0200,NP-002,CA,2026-12-31,Credentialing",
].join("\n");

const VALID_PROVIDER_TYPES = ["MD", "DO", "NP", "PA", "LCSW", "PT", "OT", "DDS", "Other"];
const VALID_STATUSES = ["Active", "Inactive", "Credentialing"];

function validateRow(row) {
  const issues = [];
  if (!row.last_name?.trim()) issues.push("last_name required");
  if (row.npi && !/^\d{10}$/.test(row.npi)) issues.push("NPI must be 10 digits");
  if (row.email && !/\S+@\S+\.\S+/.test(row.email)) issues.push("invalid email");
  if (row.provider_type && !VALID_PROVIDER_TYPES.includes(row.provider_type))
    issues.push(`unknown provider_type "${row.provider_type}"`);
  if (row.status && !VALID_STATUSES.includes(row.status))
    issues.push(`unknown status "${row.status}"`);
  if (row.license_expiry && isNaN(Date.parse(row.license_expiry)))
    issues.push("invalid license_expiry date");
  return issues;
}

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2)
    return { rows: [], error: "CSV must have at least a header row and one data row." };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(", ")}` };
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

// ── AI Validation (batch prompt for all rows) ─────────────────────────────────
async function runAiValidation(rows) {
  if (!rows.length) return rows;
  const prompt = `You are a healthcare data validator. Review these provider records and for each one identify any suspicious, inconsistent, or potentially erroneous data.

Return a JSON array with one object per record in the same order. Each object must have:
- "index": number (0-based index matching input)
- "ai_flag": boolean (true if something looks suspicious or needs review)
- "ai_note": string (brief explanation, empty string if ai_flag=false)

Look for things like: mismatched specialty/provider_type (e.g., NP with Cardiology specialty), expired licenses, implausible values, missing critical info for certain types.

Records:
${JSON.stringify(
  rows.map((r, i) => ({
    index: i,
    first_name: r.first_name,
    last_name: r.last_name,
    provider_type: r.provider_type,
    specialty: r.specialty,
    npi: r.npi,
    email: r.email,
    license_state: r.license_state,
    license_expiry: r.license_expiry,
    status: r.status,
  })),
  null,
  2
)}`;

  const result = await api.integrations.Core.InvokeLLM({
    prompt,
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

  const validations = result?.validations || [];
  return rows.map((row, i) => {
    const v = validations.find((x) => x.index === i) || {};
    return { ...row, _ai_flag: !!v.ai_flag, _ai_note: v.ai_note || "" };
  });
}

// ── OCR extraction for PDFs and images ───────────────────────────────────────
async function extractFromFile(file) {
  const { file_url } = await api.integrations.Core.UploadFile({ file });
  const result = await api.integrations.Core.ExtractDataFromUploadedFile({
    file_url,
    json_schema: {
      type: "object",
      properties: {
        providers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              first_name: { type: "string" },
              last_name: { type: "string" },
              provider_type: { type: "string" },
              specialty: { type: "string" },
              npi: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              license_number: { type: "string" },
              license_state: { type: "string" },
              license_expiry: { type: "string" },
              status: { type: "string" },
            },
          },
        },
      },
    },
  });
  if (result.status !== "success") throw new Error(result.details || "OCR extraction failed");
  return (result.output?.providers || []).map((r, i) => ({ ...r, _line: i + 1 }));
}

const TABS = ["✓ Valid", "⚠ Needs Review", "✗ Errors"];

export default function ImportProviders({ clientId, onClose, onSaved }) {
  const [stage, setStage] = useState("upload"); // upload | processing | preview | importing | done
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const inputRef = useRef();

  const validRows = rows.filter((r) => !r._issues?.length && !r._ai_flag);
  const reviewRows = rows.filter((r) => !r._issues?.length && r._ai_flag);
  const errorRows = rows.filter((r) => r._issues?.length > 0);

  const processFile = async (file) => {
    setStage("processing");
    setError(null);
    try {
      let rawRows = [];
      const isPDF = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");

      if (isPDF || isImage) {
        setProcessingStep("Running OCR to extract provider data…");
        rawRows = await extractFromFile(file);
      } else {
        setProcessingStep("Parsing CSV…");
        const text = await file.text();
        const { rows: parsed, error: parseErr } = parseCSV(text);
        if (parseErr) {
          setError(parseErr);
          setStage("upload");
          return;
        }
        rawRows = parsed;
      }

      // Basic validation
      setProcessingStep("Validating rows…");
      const validated = rawRows.map((row) => ({ ...row, _issues: validateRow(row) }));

      // AI validation only on rows that pass basic checks
      setProcessingStep("Running AI validation…");
      const cleanForAI = validated.filter((r) => !r._issues.length);
      const aiValidated = await runAiValidation(cleanForAI);

      // Merge back
      let aiIdx = 0;
      const final = validated.map((row) => {
        if (row._issues.length) return row;
        return aiValidated[aiIdx++];
      });

      setRows(final);
      setStage("preview");
    } catch (err) {
      setError(err.message || "Failed to process file.");
      setStage("upload");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleImport = async (rowsToImport) => {
    setStage("importing");
    let count = 0;
    for (const row of rowsToImport) {
      const { _issues, _line, _ai_flag, _ai_note, ...data } = row;
      await api.entities.Provider.create({
        ...data,
        client_id: clientId,
        status: data.status || "Credentialing",
        provider_type: data.provider_type || "MD",
      });
      count++;
      setImportedCount(count);
      setProgress(Math.round((count / rowsToImport.length) * 100));
    }
    setStage("done");
    setTimeout(() => onSaved(), 1400);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "providers_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const tabCounts = [validRows.length, reviewRows.length, errorRows.length];
  const tabRows = [validRows, reviewRows, errorRows];

  const colsToShow = ["last_name", "first_name", "provider_type", "npi", "specialty", "status"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Import Providers</h3>
            <p className="text-xs text-slate-400">
              Upload CSV, PDF, or image — AI validates and flags issues
            </p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Upload stage */}
          {stage === "upload" && (
            <>
              <button
                onClick={downloadSample}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download CSV Template
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Drop file here, or click to browse
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports <span className="font-semibold">.csv</span>,{" "}
                  <span className="font-semibold">.pdf</span>,{" "}
                  <span className="font-semibold">.png</span>,{" "}
                  <span className="font-semibold">.jpg</span>
                </p>
                <p className="text-[11px] text-slate-300 mt-2">
                  PDF/images will be OCR-extracted and AI-validated automatically
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files[0]) processFile(e.target.files[0]);
                  }}
                />
              </div>
            </>
          )}

          {/* Processing */}
          {stage === "processing" && (
            <div className="py-20 text-center space-y-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: "#eef3ff" }}
              >
                <Brain className="w-8 h-8 animate-pulse" style={{ color: "#293682" }} />
              </div>
              <p className="font-semibold text-slate-700">{processingStep}</p>
              <p className="text-xs text-slate-400">AI is reviewing each row for data quality…</p>
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" />
            </div>
          )}

          {/* Preview with tabs */}
          {stage === "preview" && (
            <div className="space-y-4">
              {/* Summary pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                  ✓ {validRows.length} ready to import
                </span>
                {reviewRows.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                    ⚠ {reviewRows.length} need review
                  </span>
                )}
                {errorRows.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 font-semibold">
                    ✗ {errorRows.length} have errors
                  </span>
                )}
                <button
                  onClick={() => setStage("upload")}
                  className="ml-auto text-slate-400 hover:text-slate-600"
                >
                  Change file
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {TABS.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    disabled={tabCounts[i] === 0}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${activeTab === i ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {t} <span className="ml-1 opacity-70">({tabCounts[i]})</span>
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-500 font-semibold">#</th>
                      {colsToShow.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-slate-500 font-semibold capitalize whitespace-nowrap"
                        >
                          {h.replace(/_/g, " ")}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-slate-500 font-semibold">
                        Issues / AI Note
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tabRows[activeTab].length === 0 ? (
                      <tr>
                        <td
                          colSpan={colsToShow.length + 3}
                          className="py-8 text-center text-slate-400"
                        >
                          No records in this category
                        </td>
                      </tr>
                    ) : (
                      tabRows[activeTab].map((row, i) => (
                        <tr
                          key={i}
                          className={
                            row._issues?.length ? "bg-red-50" : row._ai_flag ? "bg-amber-50" : ""
                          }
                        >
                          <td className="px-3 py-2 text-slate-400">{row._line}</td>
                          {colsToShow.map((h) => (
                            <td key={h} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                              {row[h] || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            {row._issues?.length > 0 && (
                              <span className="text-red-500">{row._issues.join("; ")}</span>
                            )}
                            {row._ai_flag && row._ai_note && (
                              <span className="flex items-start gap-1 text-amber-700">
                                <Brain className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                {row._ai_note}
                              </span>
                            )}
                            {!row._issues?.length && !row._ai_flag && (
                              <span className="text-emerald-500 font-semibold">✓ OK</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* AI Review note */}
              {reviewRows.length > 0 && activeTab === 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                  <Brain className="w-4 h-4 flex-shrink-0" />
                  <span>
                    These rows passed basic validation but were flagged by AI for potential data
                    quality issues. You can still import them — review the notes and decide.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Importing progress */}
          {stage === "importing" && (
            <div className="py-8 space-y-4">
              <p className="text-sm font-semibold text-slate-700 text-center">
                Importing providers… {importedCount}/{validRows.length + reviewRows.length}
              </p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: "#293682" }}
                />
              </div>
              <p className="text-center text-xs text-slate-400">{progress}% complete</p>
            </div>
          )}

          {/* Done */}
          {stage === "done" && (
            <div className="py-12 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800">
                {importedCount} providers imported successfully!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {stage === "preview" &&
              errorRows.length > 0 &&
              `${errorRows.length} error row(s) will not be imported`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            {stage === "preview" && (
              <>
                {reviewRows.length > 0 && (
                  <button
                    onClick={() => handleImport([...validRows, ...reviewRows])}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold border border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Eye className="w-4 h-4" /> Import All incl. Flagged (
                    {validRows.length + reviewRows.length})
                  </button>
                )}
                <button
                  onClick={() => handleImport(validRows)}
                  disabled={!validRows.length}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: "#0a7e87" }}
                >
                  <Upload className="w-4 h-4" /> Import Valid ({validRows.length})
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
