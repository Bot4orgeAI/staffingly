import { useState, useRef, useCallback } from "react";
import {
  X,
  Upload,
  Camera,
  FileImage,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";

const CONFIDENCE_THRESHOLD = 80;

function ConfidenceBadge({ score }) {
  const isLow = score < CONFIDENCE_THRESHOLD;
  return (
    <span
      className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
        isLow
          ? "bg-amber-100 text-amber-700 border border-amber-200"
          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
      }`}
    >
      {score}%
    </span>
  );
}

export default function InsuranceCardCapture({
  clientId,
  patientId,
  onExtracted,
  onClose,
}) {
  const [cardSide, setCardSide] = useState("FRONT");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [_uploading, _setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [error, setError] = useState(null);

  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setExtraction(null);
    setEditedFields({});
    setError(null);

    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview("pdf");
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleExtract = async () => {
    if (!file) return;

    setExtracting(true);
    setError(null);

    try {
      // First upload the card
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", clientId);
      if (patientId) formData.append("patientId", patientId);
      formData.append("cardSide", cardSide);

      const uploadResponse = await api.upload.insuranceCard(formData);

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || "Upload failed");
      }

      // Then extract data
      const extractFormData = new FormData();
      extractFormData.append("file", file);

      const extractResponse = await api.upload.extractInsuranceCard(extractFormData);

      if (!extractResponse.success && extractResponse.error) {
        throw new Error(extractResponse.error);
      }

      setExtraction(extractResponse.data);
      setEditedFields(extractResponse.data.fields || {});
    } catch (err) {
      setError(err.message || "Failed to extract data from card");
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirm = () => {
    onExtracted(editedFields);
  };

  const handleRetry = () => {
    setFile(null);
    setPreview(null);
    setExtraction(null);
    setEditedFields({});
    setError(null);
  };

  const updateField = (key, value) => {
    setEditedFields((prev) => ({ ...prev, [key]: value }));
  };

  const FIELD_LABELS = {
    payerName: "Insurance Payer",
    memberId: "Member ID",
    groupNumber: "Group Number",
    subscriberName: "Subscriber Name",
    subscriberDob: "Subscriber DOB",
    planName: "Plan Name",
    planType: "Plan Type",
    rxBin: "Rx BIN",
    rxPcn: "Rx PCN",
    rxGroup: "Rx Group",
    copay: "Copay",
    effectiveDate: "Effective Date",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Upload Insurance Card
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Take a photo or upload an image for automatic data extraction
            </p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Card Side Toggle */}
          <div className="flex gap-2">
            {["FRONT", "BACK"].map((side) => (
              <button
                key={side}
                onClick={() => setCardSide(side)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  cardSide === side
                    ? "text-white"
                    : "text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
                style={cardSide === side ? { backgroundColor: "#293682" } : {}}
              >
                {side === "FRONT" ? "Front of Card" : "Back of Card"}
              </button>
            ))}
          </div>

          {/* Upload Area */}
          {!file && (
            <div className="space-y-3">
              {/* Drag & Drop */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "#eef3ff" }}
                >
                  <Upload className="w-6 h-6" style={{ color: "#293682" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Drop image here or click to upload
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    JPEG, PNG, HEIC - Max 10MB
                  </p>
                </div>
              </div>

              {/* Camera Button (Mobile) */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Camera className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-600">
                  Take Photo with Camera
                </span>
              </button>
            </div>
          )}

          {/* Preview */}
          {file && !extraction && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                {preview === "pdf" ? (
                  <div className="p-8 text-center">
                    <FileImage className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-600">{file.name}</p>
                    <p className="text-xs text-slate-400">PDF Document</p>
                  </div>
                ) : (
                  <img
                    src={preview}
                    alt="Card preview"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm font-semibold text-slate-600">
                    Change Image
                  </span>
                </button>
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
                  style={{ backgroundColor: "#0a7e87" }}
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Extract Data"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Extraction Results */}
          {extraction && (
            <div className="space-y-4">
              {/* Confidence Summary */}
              <div
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  extraction.requiresReview
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-emerald-50 border border-emerald-200"
                }`}
              >
                {extraction.requiresReview ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                )}
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      extraction.requiresReview ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {extraction.requiresReview
                      ? "Review Required - Some fields have low confidence"
                      : "Extraction Complete"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Overall confidence: {extraction.overallConfidence}% | Channel:{" "}
                    {extraction.channelUsed}
                  </p>
                </div>
              </div>

              {/* Low Confidence Warning */}
              {extraction.lowConfidenceFields?.length > 0 && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  <strong>Low confidence fields:</strong>{" "}
                  {extraction.lowConfidenceFields.map((f) => FIELD_LABELS[f] || f).join(", ")}
                </div>
              )}

              {/* Editable Fields */}
              <div className="space-y-3">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const value = editedFields[key] || "";
                  const confidence = extraction.confidenceScores?.[key];
                  const isLowConfidence = confidence && confidence < CONFIDENCE_THRESHOLD;

                  if (!value && !confidence) return null;

                  return (
                    <div key={key}>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center mb-1">
                        {label}
                        {confidence && <ConfidenceBadge score={confidence} />}
                      </label>
                      <input
                        value={value}
                        onChange={(e) => updateField(key, e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                          isLowConfidence
                            ? "border-amber-300 bg-amber-50/50 focus:ring-amber-200"
                            : "border-emerald-200 bg-emerald-50/50 focus:ring-emerald-200"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Re-scan Card
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
                  style={{ backgroundColor: "#293682" }}
                >
                  Use This Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
