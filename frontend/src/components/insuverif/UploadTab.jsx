import { useState, useRef } from "react";
import { Upload, FileImage, CheckCircle, Loader2 } from "lucide-react";
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

const EXTRACTED_DUMMY = {
  member_id: "UHC-884720193",
  group_number: "GRP-44821",
  payer: "UnitedHealthcare",
  plan_name: "Choice Plus PPO",
  first_name: "Sarah",
  last_name: "Mitchell",
  effective_date: "01/01/2025",
};

export default function UploadTab({ onSubmit }) {
  const [docType, setDocType] = useState("Insurance Card Front");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editedData, setEditedData] = useState({});
  const fileRef = useRef();
  const dropRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview("pdf");
    }
    setExtracted(null);
    setShowForm(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleExtract = () => {
    setExtracting(true);
    setTimeout(() => {
      setExtracting(false);
      setExtracted(EXTRACTED_DUMMY);
      setEditedData(EXTRACTED_DUMMY);
    }, 2000);
  };

  const FIELD_LABELS = {
    member_id: "Member ID",
    group_number: "Group Number",
    payer: "Payer Name",
    plan_name: "Plan Name",
    first_name: "First Name",
    last_name: "Last Name",
    effective_date: "Effective Date",
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
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
          style={{ minHeight: 200 }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
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
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF · Max 10MB</p>
          </div>
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
          <h3 className="font-bold text-slate-700 text-sm">Extracted Data — Review & Confirm</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.keys(FIELD_LABELS).map((key) => (
              <div key={key}>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  {FIELD_LABELS[key]}
                  <span className="ml-2 text-emerald-500">
                    <CheckCircle className="w-3 h-3 inline" />
                  </span>
                </label>
                <input
                  value={editedData[key] || ""}
                  onChange={(e) => setEditedData((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full border border-emerald-200 bg-emerald-50/50 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: "#293682" }}
          >
            Confirm & Complete Form →
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
