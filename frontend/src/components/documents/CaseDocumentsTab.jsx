import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Upload, CheckCircle, XCircle, AlertTriangle, Loader2, FileText, Plus } from "lucide-react";

const MAX_FILE_SIZE_MB = 25;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"];

const DEFAULT_CHECKLIST = [
  "Clinical Notes / Progress Notes",
  "Prior Treatment Records",
  "Lab Results",
  "Imaging Reports",
  "Letter of Medical Necessity",
  "Prescription",
  "Step Therapy Documentation",
  "Physician Order",
];

const DOC_STATUS_STYLES = {
  Missing: { bg: "#fef2f2", text: "#b91c1c", icon: XCircle, iconColor: "#ef4444" },
  Uploaded: { bg: "#fffbeb", text: "#92400e", icon: AlertTriangle, iconColor: "#f59e0b" },
  Verified: { bg: "#f0fdf4", text: "#15803d", icon: CheckCircle, iconColor: "#22c55e" },
};

const SUBMISSION_STATUS = {
  included: { label: "Included", bg: "#f0fdf4", text: "#15803d" },
  not_needed: { label: "Not Needed", bg: "#f8fafc", text: "#64748b" },
  needs_followup: { label: "Needs Follow-up", bg: "#fffbeb", text: "#92400e" },
};

const SOURCE_BADGE = {
  "sync:google_drive": { label: "Google Drive", color: "#4285F4", bg: "#EBF2FF" },
  "sync:onedrive": { label: "OneDrive", color: "#0078D4", bg: "#E5F2FF" },
  "sync:dropbox": { label: "Dropbox", color: "#0061FF", bg: "#E5EEFF" },
  "sync:staffingly_portal": { label: "Portal Sync", color: "#293682", bg: "#eef3ff" },
  specialist: { label: "Manual Upload", color: "#0a7e87", bg: "#f0fdfa" },
  matched_from_queue: { label: "Queue Match", color: "#7c3aed", bg: "#f5f3ff" },
};

function getSourceBadge(uploadedBy) {
  if (!uploadedBy) return SOURCE_BADGE["specialist"];
  if (uploadedBy.startsWith("sync:"))
    return SOURCE_BADGE[uploadedBy] || { label: "Cloud Sync", color: "#293682", bg: "#eef3ff" };
  return SOURCE_BADGE[uploadedBy] || SOURCE_BADGE["specialist"];
}

export default function CaseDocumentsTab({ paCase, onUpdate }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingItem, setUploadingItem] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const dropRef = useRef(null);

  useEffect(() => {
    loadDocs();
    const items = paCase.required_docs_checklist_json
      ? (() => {
          try {
            return JSON.parse(paCase.required_docs_checklist_json);
          } catch {
            return DEFAULT_CHECKLIST;
          }
        })()
      : DEFAULT_CHECKLIST;
    setChecklist(items);
  }, [paCase.id]);

  const loadDocs = async () => {
    setLoading(true);
    const data = await api.entities.PriorAuthDocument.filter({ case_id: paCase.id });
    setDocs(data);
    setLoading(false);
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `${file.name} exceeds 25MB limit.`;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext))
      return `${file.name}: unsupported format. Use PDF, JPG, PNG, DOCX, or XLSX.`;
    return null;
  };

  const processFiles = async (files, itemLabel = null) => {
    setUploadError(null);
    const validFiles = [];
    for (const f of files) {
      const err = validateFile(f);
      if (err) {
        setUploadError(err);
        return;
      }
      validFiles.push(f);
    }

    for (const file of validFiles) {
      const label = itemLabel || "Other";
      setUploadingItem(label);
      setUploading(true);

      const { file_url } = await api.integrations.Core.UploadFile({ file });

      let classification = label;
      let extractedData = null;
      try {
        const aiResult = await api.integrations.Core.InvokeLLM({
          prompt: `You are a medical document classifier. Classify this document and extract key clinical data.
Return JSON with:
- classification: string (document type e.g. "Clinical Notes", "Lab Results", etc.)
- confidence: number 0-100
- key_data: object with relevant fields (dates, provider names, diagnoses, patient info, etc.)
- checklist_mapping: string (which checklist item this best maps to from: ${DEFAULT_CHECKLIST.join(", ")})
- summary: string (1 sentence description)`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              classification: { type: "string" },
              confidence: { type: "number" },
              key_data: { type: "object", additionalProperties: true },
              checklist_mapping: { type: "string" },
              summary: { type: "string" },
            },
          },
        });
        classification = aiResult.classification || label;
        extractedData = {
          ...aiResult.key_data,
          confidence: aiResult.confidence,
          checklist_mapping: aiResult.checklist_mapping,
          summary: aiResult.summary,
        };
      } catch {}

      const existing = docs.find(
        (d) => (d.document_type === label || d.checklist_item_key === label) && itemLabel
      );

      if (existing) {
        await api.entities.PriorAuthDocument.update(existing.id, {
          file_url,
          file_name: file.name,
          status: "Uploaded",
          ai_classification: classification,
          ai_extracted_data_json: JSON.stringify(extractedData),
        });
      } else {
        await api.entities.PriorAuthDocument.create({
          case_id: paCase.id,
          document_type: classification,
          checklist_item_key: label,
          status: "Uploaded",
          file_url,
          file_name: file.name,
          ai_classification: classification,
          ai_extracted_data_json: JSON.stringify(extractedData),
          uploaded_by: "specialist",
        });
      }
    }

    await loadDocs();
    setUploading(false);
    setUploadingItem(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const toggleVerify = async (doc) => {
    const newStatus = doc.status === "Verified" ? "Uploaded" : "Verified";
    await api.entities.PriorAuthDocument.update(doc.id, { status: newStatus });
    await loadDocs();
  };

  const setSubmissionStatus = async (doc, submissionStatus) => {
    await api.entities.PriorAuthDocument.update(doc.id, { submission_status: submissionStatus });
    await loadDocs();
  };

  const getDocForItem = (itemLabel) =>
    docs.find((d) => d.document_type === itemLabel || d.checklist_item_key === itemLabel);

  const allVerified = checklist.every((item) => getDocForItem(item)?.status === "Verified");
  const extraDocs = docs.filter(
    (d) => !checklist.includes(d.checklist_item_key) && !checklist.includes(d.document_type)
  );

  if (loading)
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-[#293682] rounded-full animate-spin mx-auto" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Gate banners */}
      <div
        className={`rounded-xl p-4 flex items-center gap-3 border-2 ${allVerified ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}
      >
        {allVerified ? (
          <>
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800 font-semibold">
              All required documents verified — case ready for AI Review.
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-semibold">
              Submission blocked until all required documents are uploaded and verified.
            </p>
          </>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${dragOver ? "border-[#293682] bg-[#eef3ff]" : "border-slate-200 bg-white hover:border-slate-300"}`}
      >
        {uploading ? (
          <div className="space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#293682]" />
            <p className="text-sm font-semibold text-slate-700">Uploading & classifying with AI…</p>
            {uploadingItem && <p className="text-xs text-slate-400">{uploadingItem}</p>}
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Drag & drop files here</p>
            <p className="text-xs text-slate-400 mt-0.5">
              PDF, JPG, PNG, DOCX, XLSX · Max 25MB per file
            </p>
            <label
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold cursor-pointer hover:opacity-90"
              style={{ backgroundColor: "#293682" }}
            >
              <Plus className="w-4 h-4" /> Browse Files
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                onChange={(e) => processFiles(Array.from(e.target.files))}
              />
            </label>
          </>
        )}
        {uploadError && <p className="mt-2 text-xs text-red-600 font-semibold">{uploadError}</p>}
      </div>

      {/* Required Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Required Documents Checklist</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {paCase.payer_name} / CPT {paCase.cpt_code || "N/A"}
          </p>
        </div>
        <div className="divide-y divide-slate-50">
          {checklist.map((itemLabel) => {
            const doc = getDocForItem(itemLabel);
            const status = doc?.status || "Missing";
            const st = DOC_STATUS_STYLES[status];
            const StatusIcon = st.icon;
            const isUploading = uploadingItem === itemLabel && uploading;
            const source = doc ? getSourceBadge(doc.uploaded_by) : null;

            return (
              <div key={itemLabel} className="p-4 flex items-start gap-4">
                <StatusIcon
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  style={{ color: st.iconColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{itemLabel}</p>
                  {doc && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-slate-500">{doc.file_name}</p>
                      {source && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: source.bg, color: source.color }}
                        >
                          {source.label}
                        </span>
                      )}
                      {doc.ai_classification && (
                        <p className="text-xs text-slate-400">AI: {doc.ai_classification}</p>
                      )}
                    </div>
                  )}
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 whitespace-nowrap"
                  style={{ backgroundColor: st.bg, color: st.text }}
                >
                  {status}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isUploading ? (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <label
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                      title="Upload file"
                    >
                      <Upload className="w-4 h-4 text-slate-500" />
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                        onChange={(e) =>
                          e.target.files[0] && processFiles([e.target.files[0]], itemLabel)
                        }
                      />
                    </label>
                  )}
                  {doc && doc.status !== "Missing" && (
                    <button
                      onClick={() => toggleVerify(doc)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                        doc.status === "Verified"
                          ? "bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600"
                          : "bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      {doc.status === "Verified" ? "Unverify" : "Verify"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Documents Table */}
      {docs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">All Attached Documents</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {docs.length} file{docs.length !== 1 ? "s" : ""} attached to this case
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    "File Name",
                    "Type",
                    "Source",
                    "Date",
                    "AI Confidence",
                    "Verified",
                    "Submission",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const source = getSourceBadge(doc.uploaded_by);
                  let aiConf = null;
                  try {
                    aiConf = JSON.parse(doc.ai_extracted_data_json)?.confidence;
                  } catch {}
                  const subStatus = doc.submission_status || "included";
                  const subStyle = SUBMISSION_STATUS[subStatus] || SUBMISSION_STATUS.included;

                  return (
                    <tr
                      key={doc.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#293682] hover:underline truncate max-w-[160px]"
                          >
                            {doc.file_name}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                          {doc.ai_classification || doc.document_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: source.bg, color: source.color }}
                        >
                          {source.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {doc.created_date ? new Date(doc.created_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {aiConf != null ? (
                          <span
                            className={`font-bold ${aiConf >= 80 ? "text-emerald-600" : "text-amber-600"}`}
                          >
                            {Math.round(aiConf)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${doc.status === "Verified" ? "text-emerald-600" : "text-slate-400"}`}
                        >
                          {doc.status === "Verified" ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {doc.status === "Verified" ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={subStatus}
                          onChange={(e) => setSubmissionStatus(doc, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          style={{ backgroundColor: subStyle.bg, color: subStyle.text }}
                        >
                          <option value="included">Included</option>
                          <option value="not_needed">Not Needed</option>
                          <option value="needs_followup">Needs Follow-up</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
