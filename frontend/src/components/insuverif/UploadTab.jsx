import { useState, useRef } from "react";
import { Upload, FileImage, CheckCircle, Loader2, AlertTriangle, Camera } from "lucide-react";
import { api } from "@/lib/api";
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

const CONFIDENCE_THRESHOLD = 80;

export default function UploadTab({ onSubmit }) {
  const [docType, setDocType] = useState("Insurance Card Front");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [lowConfidenceFields, setLowConfidenceFields] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [error, setError] = useState(null);
  const fileRef = useRef();
  const cameraRef = useRef();
  const dropRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview("pdf");
    }
    setExtracted(null);
    setConfidenceScores({});
    setLowConfidenceFields([]);
    setShowForm(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleExtract = async () => {
    if (!file) return;

    setExtracting(true);
    setError(null);

    try {
      // Call the real OCR extraction API
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.upload.extractInsuranceCard(formData);

      if (!response.success && response.error) {
        throw new Error(response.error);
      }

      const data = response.data;

      // Map extracted fields to form fields
      const mappedData = {
        member_id: data.fields?.memberId || "",
        group_number: data.fields?.groupNumber || "",
        payer: data.fields?.payerName || "",
        plan_name: data.fields?.planName || "",
        first_name: data.fields?.subscriberName?.split(" ")[0] || "",
        last_name: data.fields?.subscriberName?.split(" ").slice(1).join(" ") || "",
        effective_date: data.fields?.effectiveDate || "",
        plan_type: data.fields?.planType || "",
        rx_bin: data.fields?.rxBin || "",
        rx_pcn: data.fields?.rxPcn || "",
        rx_group: data.fields?.rxGroup || "",
      };

      setExtracted(mappedData);
      setEditedData(mappedData);
      setConfidenceScores(data.confidenceScores || {});
      setLowConfidenceFields(data.lowConfidenceFields || []);
    } catch (err) {
      setError(err.message || "Failed to extract data from document");
    } finally {
      setExtracting(false);
    }
  };

  const FIELD_LABELS = {
    member_id: "Member ID",
    group_number: "Group Number",
    payer: "Payer Name",
    plan_name: "Plan Name",
    first_name: "First Name",
    last_name: "Last Name",
    effective_date: "Effective Date",
    plan_type: "Plan Type",
    rx_bin: "Rx BIN",
    rx_pcn: "Rx PCN",
    rx_group: "Rx Group",
  };

  // Map form field names to API confidence field names
  const CONFIDENCE_FIELD_MAP = {
    member_id: "memberId",
    group_number: "groupNumber",
    payer: "payerName",
    plan_name: "planName",
    first_name: "subscriberName",
    last_name: "subscriberName",
    effective_date: "effectiveDate",
    plan_type: "planType",
    rx_bin: "rxBin",
    rx_pcn: "rxPcn",
    rx_group: "rxGroup",
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
      {/* Doc Type */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
          Document Type
        </label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none max-w-sm"
        >
          {DOC_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Upload Zone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-3">
          {/* Drag & Drop Area */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
            style={{ minHeight: 160 }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.heic,.heif,.pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#eef3ff" }}
            >
              <Upload className="w-6 h-6" style={{ color: "#293682" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                Drop file here or click to upload
              </p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC, PDF - Max 10MB</p>
            </div>
          </div>

          {/* Camera Capture (Mobile) */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <Camera className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-600">Take Photo</span>
          </button>
        </div>

        {/* Preview */}
        <div
          className="bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden"
          style={{ minHeight: 200 }}
        >
          {!file && <p className="text-slate-300 text-sm">Preview will appear here</p>}
          {file && preview === "pdf" && (
            <div className="text-center p-6">
              <FileImage className="w-12 h-12 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">{file.name}</p>
              <p className="text-xs text-slate-400">PDF Document</p>
            </div>
          )}
          {file && preview && preview !== "pdf" && (
            <img src={preview} alt="Document preview" className="w-full h-full object-contain" />
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Extract Button */}
      {file && !extracted && (
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm"
          style={{ backgroundColor: "#0a7e87" }}
        >
          {extracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Analyzing document with AI...
            </>
          ) : (
            "Extract Data with AI →"
          )}
        </button>
      )}

      {/* Extracted Data */}
      {extracted && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700 text-sm">Extracted Data — Review & Confirm</h3>
            {lowConfidenceFields.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {lowConfidenceFields.length} fields need review
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.keys(FIELD_LABELS).map((key) => {
              const confidence = getFieldConfidence(key);
              const lowConf = isLowConfidence(key);
              const hasValue = editedData[key] && editedData[key].trim() !== "";

              if (!hasValue && !confidence) return null;

              return (
                <div key={key}>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    {FIELD_LABELS[key]}
                    {confidence && (
                      <span
                        className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          lowConf
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {confidence}%
                      </span>
                    )}
                    {!lowConf && hasValue && (
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                    )}
                    {lowConf && (
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                    )}
                  </label>
                  <input
                    value={editedData[key] || ""}
                    onChange={(e) => setEditedData((p) => ({ ...p, [key]: e.target.value }))}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      lowConf
                        ? "border-amber-300 bg-amber-50/50 focus:ring-amber-200"
                        : "border-emerald-200 bg-emerald-50/50 focus:ring-emerald-200"
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: "#293682" }}
          >
            Confirm & Complete Form
          </button>
        </div>
      )}

      {/* Full form */}
      {showForm && (
        <div className="mt-4">
          <h3 className="font-bold text-slate-700 text-sm mb-4">Complete Remaining Fields</h3>
          <ManualEntryTab onSubmit={onSubmit} prefill={editedData} />
        </div>
      )}
    </div>
  );
}
