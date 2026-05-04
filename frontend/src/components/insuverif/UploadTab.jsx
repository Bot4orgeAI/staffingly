import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  FileImage,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import AppSelect from "@/components/ui/app-select";
import ManualEntryTab from "./ManualEntryTab";

const DOC_TYPES = [
  "Insurance Card Front",
  "Insurance Card Back",
  "Explanation of Benefits (EOB)",
  "Prior Authorization Letter",
  "Referral Letter",
  "Lab/Radiology Report",
  "Other Document",
];

function splitName(fullName = "") {
  const parts = fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { first_name: "", last_name: "" };
  }

  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function createDocument(id = Date.now()) {
  return {
    id,
    docType: "Insurance Card Front",
    file: null,
    preview: null,
    extraction: null,
  };
}

function pickBetterField(current, next, docType) {
  if (!next?.value) return current;
  if (!current?.value) return { ...next, docType };

  const nextConfidence = next.confidence ?? 0;
  const currentConfidence = current.confidence ?? 0;

  if (nextConfidence > currentConfidence) {
    return { ...next, docType };
  }

  return current;
}

function mapMergedFieldsToPrefill(mergedFields = {}) {
  const subscriberName = mergedFields.subscriberName?.value || "";
  const patientName = mergedFields.patientName?.value || subscriberName;
  const patientNameParts = splitName(patientName);

  return {
    ...patientNameParts,
    dob: mergedFields.patientDob?.value || "",
    payer: mergedFields.payerName?.value || "",
    payer_id: mergedFields.payerId?.value || "",
    member_id: mergedFields.memberId?.value || "",
    group_number: mergedFields.groupNumber?.value || "",
    plan_name: mergedFields.planName?.value || "",
    plan_type: mergedFields.planType?.value || "",
    effective_date: mergedFields.effectiveDate?.value || "",
    service_date: mergedFields.serviceDate?.value || "",
    rx_bin: mergedFields.rxBin?.value || "",
    rx_pcn: mergedFields.rxPcn?.value || "",
    rx_group: mergedFields.rxGroup?.value || "",
    subscriber_name: subscriberName,
    subscriber_dob: mergedFields.subscriberDob?.value || "",
  };
}

function mergeExtractionResults(results = []) {
  const mergedFields = {};
  const lowConfidenceFieldSet = new Set();
  const confidenceScores = {};

  for (const result of results) {
    const fields = result?.data?.fields || {};
    const scores = result?.data?.confidenceScores || {};
    const lowConfidenceFields = result?.data?.lowConfidenceFields || [];

    for (const [fieldKey, value] of Object.entries(fields)) {
      const confidence = scores[fieldKey] || 0;
      mergedFields[fieldKey] = pickBetterField(
        mergedFields[fieldKey],
        { value, confidence },
        result.docType
      );
      confidenceScores[fieldKey] = Math.max(confidenceScores[fieldKey] || 0, confidence);
    }

    for (const field of lowConfidenceFields) {
      lowConfidenceFieldSet.add(field);
    }
  }

  const overallConfidence = results.length
    ? Math.round(
        results.reduce((sum, result) => sum + (result?.data?.overallConfidence || 0), 0) /
          results.length
      )
    : 0;

  return {
    mergedFields,
    confidenceScores,
    lowConfidenceFields: [...lowConfidenceFieldSet],
    overallConfidence,
  };
}

const FIELD_LABELS = {
  member_id: "Member ID",
  group_number: "Group Number",
  payer: "Payer Name",
  payer_id: "Payer ID",
  plan_name: "Plan Name",
  first_name: "First Name",
  last_name: "Last Name",
  dob: "DOB",
  effective_date: "Effective Date",
  service_date: "Service Date",
  plan_type: "Plan Type",
  rx_bin: "Rx BIN",
  rx_pcn: "Rx PCN",
  rx_group: "Rx Group",
  subscriber_name: "Subscriber Name",
  subscriber_dob: "Subscriber DOB",
};

const CONFIDENCE_FIELD_MAP = {
  member_id: "memberId",
  group_number: "groupNumber",
  payer: "payerName",
  payer_id: "payerId",
  plan_name: "planName",
  first_name: "subscriberName",
  last_name: "subscriberName",
  dob: "patientDob",
  effective_date: "effectiveDate",
  service_date: "serviceDate",
  plan_type: "planType",
  rx_bin: "rxBin",
  rx_pcn: "rxPcn",
  rx_group: "rxGroup",
  subscriber_name: "subscriberName",
  subscriber_dob: "subscriberDob",
};

export default function UploadTab({ onSubmit }) {
  const [documents, setDocuments] = useState([createDocument()]);
  const [extracting, setExtracting] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [lowConfidenceFields, setLowConfidenceFields] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const fileRefs = useRef({});
  const cameraRefs = useRef({});

  const canExtract = documents.some((document) => document.file);
  const hasExtractedData = Object.keys(editedData).length > 0;

  const extractionSummary = useMemo(() => {
    return documents
      .filter((document) => document.extraction)
      .map((document) => ({
        id: document.id,
        docType: document.docType,
        fileName: document.file?.name || "",
        confidence: document.extraction?.data?.overallConfidence || 0,
      }));
  }, [documents]);

  const updateDocument = (id, updater) => {
    setDocuments((current) =>
      current.map((document) => (document.id === id ? updater(document) : document))
    );
  };

  const addDocument = () => {
    setDocuments((current) => [...current, createDocument(Date.now() + current.length)]);
  };

  const removeDocument = (id) => {
    setDocuments((current) => current.filter((document) => document.id !== id));
  };

  const handleFile = (id, file) => {
    if (!file) return;

    const commitPreview = (preview) => {
      updateDocument(id, (document) => ({
        ...document,
        file,
        preview,
        extraction: null,
      }));
    };

    setError(null);
    setShowForm(false);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => commitPreview(event.target?.result);
      reader.readAsDataURL(file);
      return;
    }

    commitPreview("pdf");
  };

  const handleExtract = async () => {
    const docsToExtract = documents.filter((document) => document.file);
    if (docsToExtract.length === 0) return;

    setExtracting(true);
    setError(null);

    try {
      const results = [];

      for (const document of docsToExtract) {
        const formData = new FormData();
        formData.append("file", document.file);
        formData.append("documentType", document.docType);

        const response = await api.upload.extractDocumentData(formData);
        if (!response.success && response.error) {
          throw new Error(response.error);
        }

        const enrichedResponse = { ...response, docType: document.docType };
        results.push(enrichedResponse);

        updateDocument(document.id, (current) => ({
          ...current,
          extraction: enrichedResponse,
        }));
      }

      const merged = mergeExtractionResults(results);
      const mappedData = mapMergedFieldsToPrefill(merged.mergedFields);

      setEditedData(mappedData);
      setConfidenceScores(merged.confidenceScores);
      setLowConfidenceFields(merged.lowConfidenceFields);
    } catch (err) {
      setError(err.message || "Failed to extract data from document(s)");
    } finally {
      setExtracting(false);
    }
  };

  const getFieldConfidence = (fieldKey) => {
    const apiKey = CONFIDENCE_FIELD_MAP[fieldKey];
    return confidenceScores[apiKey] || null;
  };

  const isLowConfidence = (fieldKey) => {
    const apiKey = CONFIDENCE_FIELD_MAP[fieldKey];
    return lowConfidenceFields.includes(apiKey);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Upload Supporting Documents</h3>
            <p className="mt-1 text-xs text-slate-500">
              Add one or more documents to extract patient, insurance, and clinical details before
              completing the eligibility form.
            </p>
          </div>
          <button
            type="button"
            onClick={addDocument}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {documents.map((document, index) => (
          <div key={document.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Document {index + 1}</p>
                <p className="text-xs text-slate-500">
                  Choose the file type and upload the supporting document.
                </p>
              </div>
              {documents.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeDocument(document.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              ) : null}
            </div>

            <div className="mb-4 max-w-sm">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Document Type
              </label>
              <AppSelect
                value={document.docType}
                onValueChange={(value) =>
                  updateDocument(document.id, (current) => ({ ...current, docType: value }))
                }
                options={DOC_TYPES.map((type) => ({ label: type, value: type }))}
                triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-3">
                <div
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files[0];
                    if (file) handleFile(document.id, file);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onClick={() => fileRefs.current[document.id]?.click()}
                  className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-8 transition-colors hover:border-blue-400"
                >
                  <input
                    ref={(node) => {
                      fileRefs.current[document.id] = node;
                    }}
                    type="file"
                    accept=".jpg,.jpeg,.png,.heic,.heif,.pdf"
                    className="hidden"
                    onChange={(event) => handleFile(document.id, event.target.files?.[0])}
                  />
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "#eef3ff" }}
                  >
                    <Upload className="h-6 w-6" style={{ color: "#293682" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Drop file here or click to upload
                    </p>
                    <p className="mt-1 text-xs text-slate-400">JPG, PNG, HEIC, PDF</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => cameraRefs.current[document.id]?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 transition-colors hover:bg-slate-50"
                >
                  <input
                    ref={(node) => {
                      cameraRefs.current[document.id] = node;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => handleFile(document.id, event.target.files?.[0])}
                  />
                  <Camera className="h-5 w-5 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-600">Take Photo</span>
                </button>
              </div>

              <div
                className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                {!document.file ? (
                  <p className="text-sm text-slate-300">Preview will appear here</p>
                ) : document.preview === "pdf" ? (
                  <div className="p-6 text-center">
                    <FileImage className="mx-auto mb-2 h-12 w-12 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">{document.file.name}</p>
                    <p className="text-xs text-slate-400">PDF Document</p>
                  </div>
                ) : (
                  <img
                    src={document.preview}
                    alt="Document preview"
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {canExtract && !hasExtractedData ? (
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: "#0a7e87" }}
        >
          {extracting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing document(s) with AI...
            </>
          ) : (
            "Extract Data with AI →"
          )}
        </button>
      ) : null}

      {hasExtractedData ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-700">Extracted Data — Review & Confirm</h3>
              <p className="mt-1 text-xs text-slate-500">
                We merged the best data found across all uploaded documents.
              </p>
            </div>
            {lowConfidenceFields.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                {lowConfidenceFields.length} fields need review
              </span>
            ) : null}
          </div>

          {extractionSummary.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {extractionSummary.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="text-xs font-semibold text-slate-700">{item.docType}</p>
                  <p className="truncate text-[11px] text-slate-500">{item.fileName}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Confidence {item.confidence}%</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.keys(FIELD_LABELS).map((key) => {
              const confidence = getFieldConfidence(key);
              const lowConfidence = isLowConfidence(key);
              const hasValue = editedData[key] && String(editedData[key]).trim() !== "";

              if (!hasValue && !confidence) return null;

              return (
                <div key={key}>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {FIELD_LABELS[key]}
                    {confidence ? (
                      <span
                        className={`ml-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          lowConfidence
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {confidence}%
                      </span>
                    ) : null}
                    {!lowConfidence && hasValue ? (
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                    ) : null}
                    {lowConfidence ? <AlertTriangle className="h-3 w-3 text-amber-500" /> : null}
                  </label>
                  <input
                    value={editedData[key] || ""}
                    onChange={(event) =>
                      setEditedData((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      lowConfidence
                        ? "border-amber-300 bg-amber-50/50 focus:ring-amber-200"
                        : "border-emerald-200 bg-emerald-50/50 focus:ring-emerald-200"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: "#293682" }}
          >
            Confirm & Complete Form
          </button>
        </div>
      ) : null}

      {showForm ? (
        <div className="mt-4">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Complete Remaining Fields</h3>
          <ManualEntryTab onSubmit={onSubmit} prefill={editedData} />
        </div>
      ) : null}
    </div>
  );
}
