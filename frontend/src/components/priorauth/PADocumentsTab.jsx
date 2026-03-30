import { useState, useEffect } from "react";
import { api } from "@/api";
import { Upload, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

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

const STATUS_STYLES = {
  Missing: { bg: "#fef2f2", text: "#b91c1c", icon: XCircle, iconColor: "#ef4444" },
  Uploaded: { bg: "#fffbeb", text: "#92400e", icon: AlertTriangle, iconColor: "#f59e0b" },
  Verified: { bg: "#f0fdf4", text: "#15803d", icon: CheckCircle, iconColor: "#22c55e" },
};

export default function PADocumentsTab({ paCase, onUpdate }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [checklist, setChecklist] = useState([]);

  useEffect(() => {
    loadDocs();
    buildChecklist();
  }, [paCase.id]);

  const buildChecklist = () => {
    // Try to parse payer rules checklist from case
    let items = DEFAULT_CHECKLIST;
    if (paCase.required_docs_checklist_json) {
      try {
        items = JSON.parse(paCase.required_docs_checklist_json);
      } catch {}
    }
    setChecklist(items);
  };

  const loadDocs = async () => {
    setLoading(true);
    const data = await api.entities.PriorAuthDocument.filter({ case_id: paCase.id });
    setDocs(data);
    setLoading(false);
  };

  const getDocForItem = (itemLabel) => {
    return docs.find((d) => d.document_type === itemLabel || d.checklist_item_key === itemLabel);
  };

  const handleUpload = async (itemLabel, file) => {
    setUploading(itemLabel);
    const { file_url } = await api.integrations.Core.UploadFile({ file });

    // Auto-classify with AI
    let classification = itemLabel;
    let extractedData = null;
    try {
      const aiResult = await api.integrations.Core.InvokeLLM({
        prompt: `You are a medical document classifier. Given this document uploaded for a prior authorization case, classify it and extract key data. The expected document type is: "${itemLabel}". Return a JSON object with: classification (string), key_data (object with relevant extracted fields like dates, provider names, diagnoses, etc.). Be concise.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            classification: { type: "string" },
            key_data: { type: "object", additionalProperties: true },
          },
        },
      });
      classification = aiResult.classification || itemLabel;
      extractedData = aiResult.key_data;
    } catch {}

    // Upsert document
    const existing = getDocForItem(itemLabel);
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
        document_type: itemLabel,
        checklist_item_key: itemLabel,
        status: "Uploaded",
        file_url,
        file_name: file.name,
        ai_classification: classification,
        ai_extracted_data_json: JSON.stringify(extractedData),
        uploaded_by: "specialist",
      });
    }

    await loadDocs();
    setUploading(null);
  };

  const toggleVerify = async (doc) => {
    const newStatus = doc.status === "Verified" ? "Uploaded" : "Verified";
    await api.entities.PriorAuthDocument.update(doc.id, { status: newStatus });
    await loadDocs();
  };

  const allVerified = checklist.every((item) => {
    const doc = getDocForItem(item);
    return doc?.status === "Verified";
  });

  if (loading)
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-[#293682] rounded-full animate-spin mx-auto" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Submission Gate */}
      {!allVerified && (
        <div className="rounded-xl p-4 flex items-center gap-3 border-2 border-amber-300 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-semibold">
            Submission is blocked until all required documents are uploaded and verified.
          </p>
        </div>
      )}
      {allVerified && (
        <div className="rounded-xl p-4 flex items-center gap-3 border-2 border-emerald-300 bg-emerald-50">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-semibold">
            All documents verified — case is ready to proceed to AI Review.
          </p>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Required Documents Checklist</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Based on payer rules for {paCase.payer_name} / CPT {paCase.cpt_code || "N/A"}
          </p>
        </div>
        <div className="divide-y divide-slate-50">
          {checklist.map((itemLabel) => {
            const doc = getDocForItem(itemLabel);
            const status = doc?.status || "Missing";
            const st = STATUS_STYLES[status];
            const StatusIcon = st.icon;
            const isUploading = uploading === itemLabel;

            return (
              <div key={itemLabel} className="p-4 flex items-center gap-4">
                <StatusIcon className="w-5 h-5 flex-shrink-0" style={{ color: st.iconColor }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{itemLabel}</p>
                  {doc && (
                    <div className="mt-1">
                      <p className="text-xs text-slate-500">{doc.file_name}</p>
                      {doc.ai_classification && (
                        <p className="text-xs text-slate-400">AI: {doc.ai_classification}</p>
                      )}
                    </div>
                  )}
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0"
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
                    <label className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-slate-500" />
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files[0] && handleUpload(itemLabel, e.target.files[0])
                        }
                      />
                    </label>
                  )}
                  {doc && doc.status !== "Missing" && (
                    <button
                      onClick={() => toggleVerify(doc)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${doc.status === "Verified" ? "bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600" : "bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"}`}
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
    </div>
  );
}
