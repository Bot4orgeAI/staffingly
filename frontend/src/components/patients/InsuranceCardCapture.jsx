import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  FileImage,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import AppSelect from "@/components/ui/app-select";

const CONFIDENCE_THRESHOLD = 80;
const CARD_SIDES = ["FRONT", "BACK"];

function createEmptyScan() {
  return {
    file: null,
    preview: null,
    uploadId: null,
    fields: {},
    confidenceScores: {},
    lowConfidenceFields: [],
    overallConfidence: null,
    requiresReview: false,
    channelUsed: null,
    processingTimeMs: null,
    error: null,
  };
}

function mergeFieldsByConfidence(scans) {
  return Object.entries(scans).reduce((merged, [side, scan]) => {
    Object.entries(scan.fields || {}).forEach(([field, value]) => {
      if (!value) return;

      const confidence = scan.confidenceScores?.[field] || 0;
      const existing = merged[field];
      const sidePriority = side === "FRONT" ? 2 : 1;

      if (
        !existing ||
        sidePriority > (existing.sidePriority || 0) ||
        (sidePriority === (existing.sidePriority || 0) && confidence >= existing.confidence)
      ) {
        merged[field] = {
          value,
          confidence,
          side,
          sidePriority,
        };
      }
    });

    return merged;
  }, {});
}

function ConfidenceBadge({ score }) {
  const low = score < CONFIDENCE_THRESHOLD;
  return (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
        low
          ? "border border-amber-200 bg-amber-100 text-amber-700"
          : "border border-emerald-200 bg-emerald-100 text-emerald-700"
      }`}
    >
      {score}%
    </span>
  );
}

function StepPill({ number, label, active, complete }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
        complete
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : active
            ? "border-[#293682]/20 bg-[#eef1ff] text-[#293682]"
            : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
          complete
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-[#293682] text-white"
              : "bg-slate-100 text-slate-500"
        }`}
      >
        {number}
      </span>
      {label}
    </div>
  );
}

function SideCard({ side, scan, selected, onSelect, onDrop, onBrowse, onClear }) {
  const title = side === "FRONT" ? "Front" : "Back";
  const status = scan.uploadId ? "Scanned" : scan.file ? "Ready" : "Missing";

  return (
    <div
      onClick={onBrowse}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      className={`cursor-pointer rounded-2xl border p-3 text-left transition-all ${
        selected
          ? "border-[#293682] bg-[#f6f7ff] shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title} of card</p>
          <p className="mt-1 text-xs text-slate-500">
            {scan.file ? scan.file.name : `Upload the ${title.toLowerCase()} image`}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            scan.uploadId
              ? "bg-emerald-100 text-emerald-700"
              : scan.file
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {scan.preview && scan.preview !== "pdf" ? (
          <img src={scan.preview} alt={`${title} preview`} className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-28 flex-col items-center justify-center gap-2 px-4 text-center">
            <FileImage className="h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-500">Click to browse or drag an image here</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBrowse();
          }}
          className="font-semibold text-[#293682] hover:text-[#1f285f]"
        >
          {scan.file ? "Replace image" : "Choose image"}
        </button>
        {scan.file ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className="font-semibold text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        ) : (
          <span className="text-slate-400">JPEG, PNG, HEIC</span>
        )}
      </div>
    </div>
  );
}

export default function InsuranceCardCapture({
  clientId,
  patientId,
  onExtracted,
  onClose,
  embedded = false,
}) {
  const [screen, setScreen] = useState("capture");
  const [activeSide, setActiveSide] = useState("FRONT");
  const [extracting, setExtracting] = useState(false);
  const [review, setReview] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const [ocrProviders, setOcrProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [scans, setScans] = useState({
    FRONT: createEmptyScan(),
    BACK: createEmptyScan(),
  });

  const fileInputRefs = useRef({});
  const providerOptions = ocrProviders.map((p) => ({
    value: p.id,
    label: p.available ? p.label : `${p.label} (Not configured)`,
    disabled: !p.available,
  }));

  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      setLoadingProviders(true);

      try {
        const response = await api.upload.getInsuranceCardOcrProviders();
        if (!response.success || cancelled) {
          return;
        }

        const providers = response.data?.providers || [];
        setOcrProviders(providers);
        setSelectedProvider(
          response.data?.defaultProvider ||
            providers.find((provider) => provider.available)?.id ||
            ""
        );
      } catch (error) {
        if (!cancelled) {
          setGlobalError(error.message || "Failed to load OCR provider options.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProviders(false);
        }
      }
    };

    loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFile = (file, side) => {
    if (!file) return;

    const commitPreview = (preview) => {
      setScans((prev) => ({
        ...prev,
        [side]: {
          ...createEmptyScan(),
          file,
          preview,
        },
      }));
      setActiveSide(side);
      setGlobalError(null);
    };

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => commitPreview(event.target?.result);
      reader.readAsDataURL(file);
      return;
    }

    commitPreview("pdf");
  };

  const handleDrop = (event, side) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleFile(file, side);
    }
  };

  const handleResetSide = (side = activeSide) => {
    setScans((prev) => ({
      ...prev,
      [side]: createEmptyScan(),
    }));
    setGlobalError(null);
  };

  const handleExtract = async () => {
    const selectedSides = CARD_SIDES.filter((side) => Boolean(scans[side].file));
    if (selectedSides.length === 0) {
      setGlobalError("Add at least one card image before continuing.");
      return;
    }

    if (!selectedProvider) {
      setGlobalError("Select an OCR platform before extraction.");
      return;
    }

    setExtracting(true);
    setGlobalError(null);

    try {
      const nextScans = { ...scans };

      for (const side of selectedSides) {
        const current = nextScans[side];
        const formData = new FormData();
        formData.append("file", current.file);
        formData.append("clientId", clientId);
        if (patientId) formData.append("patientId", patientId);
        formData.append("cardSide", side);

        const uploadResponse = await api.upload.insuranceCard(formData);
        if (!uploadResponse.success) {
          throw new Error(uploadResponse.error || `Failed to upload ${side.toLowerCase()} image`);
        }

        const extractFormData = new FormData();
        extractFormData.append("uploadId", uploadResponse.data.id);
        extractFormData.append("provider", selectedProvider);

        const extractResponse = await api.upload.extractInsuranceCard(extractFormData);
        if (!extractResponse.success && extractResponse.error) {
          throw new Error(extractResponse.error);
        }

        nextScans[side] = {
          ...current,
          uploadId: uploadResponse.data.id,
          fields: extractResponse.data.fields || {},
          confidenceScores: extractResponse.data.confidenceScores || {},
          lowConfidenceFields: extractResponse.data.lowConfidenceFields || [],
          overallConfidence: extractResponse.data.overallConfidence || null,
          requiresReview: extractResponse.data.requiresReview || false,
          channelUsed: extractResponse.data.channelUsed || null,
          processingTimeMs: extractResponse.data.processingTimeMs || null,
          error: null,
        };
      }

      setScans(nextScans);

      const mergedFieldMap = mergeFieldsByConfidence(nextScans);
      const mergedFields = Object.fromEntries(
        Object.entries(mergedFieldMap).map(([field, info]) => [field, info.value])
      );
      const mergedConfidenceScores = Object.fromEntries(
        Object.entries(mergedFieldMap).map(([field, info]) => [field, info.confidence])
      );
      const lowConfidenceFields = Object.entries(mergedFieldMap)
        .filter(([, info]) => info.confidence < CONFIDENCE_THRESHOLD)
        .map(([field]) => field);

      const sideResults = selectedSides.map((side) => nextScans[side]);
      const overallConfidence = Math.round(
        sideResults.reduce((sum, side) => sum + (side.overallConfidence || 0), 0) /
          sideResults.length
      );

      setReview({
        editedFields: mergedFields,
        confidenceScores: mergedConfidenceScores,
        overallConfidence,
        requiresReview:
          sideResults.some((side) => side.requiresReview) || lowConfidenceFields.length > 0,
        lowConfidenceFields,
        channelUsed: [...new Set(sideResults.map((side) => side.channelUsed).filter(Boolean))].join(
          " + "
        ),
        scannedSides: selectedSides,
      });
      setScreen("review");
    } catch (error) {
      setGlobalError(error.message || "Failed to extract data from card images.");
    } finally {
      setExtracting(false);
    }
  };

  const updateField = (field, value) => {
    setReview((prev) =>
      prev
        ? {
            ...prev,
            editedFields: {
              ...prev.editedFields,
              [field]: value,
            },
          }
        : prev
    );
  };

  const handleConfirm = () => {
    const uploads = Object.fromEntries(
      CARD_SIDES.filter((side) => scans[side].uploadId).map((side) => [
        side,
        {
          uploadId: scans[side].uploadId,
          confidenceScores: scans[side].confidenceScores || {},
          overallConfidence: scans[side].overallConfidence || null,
          requiresReview: scans[side].requiresReview || false,
          lowConfidenceFields: scans[side].lowConfidenceFields || [],
          preview: scans[side].preview,
          originalFileName: scans[side].file?.name || null,
          fields: review?.editedFields || {},
        },
      ])
    );

    onExtracted({
      fields: review?.editedFields || {},
      uploads,
      scannedSides: review?.scannedSides || [],
      confidenceScores: review?.confidenceScores || {},
      overallConfidence: review?.overallConfidence || null,
      requiresReview: review?.requiresReview || false,
      lowConfidenceFields: review?.lowConfidenceFields || [],
    });
  };

  const selectedSideCount = CARD_SIDES.filter((side) => Boolean(scans[side].file)).length;

  const FIELD_LABELS = {
    payerName: "Insurance Payer",
    payerId: "Payer ID",
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
    <div
      className={
        embedded
          ? "w-full"
          : "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      }
    >
      <div
        className={
          embedded
            ? "flex w-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
            : "flex h-full max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl sm:h-[92vh]"
        }
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-br from-[#f5f8ff] via-white to-[#eef8f7] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0a7e87]">
              Insurance Intake
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">Capture Insurance Card</h3>
            <p className="mt-1 text-sm text-slate-500">
              Upload front and back separately, then review the auto-filled insurance form.
            </p>
          </div>
          {onClose ? (
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className={embedded ? "px-6 py-6" : "min-h-0 flex-1 overflow-y-auto px-6 py-6"}>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <StepPill
                  number="1"
                  label="Upload images"
                  active={screen === "capture"}
                  complete={screen === "review"}
                />
                <StepPill
                  number="2"
                  label="Review auto-fill"
                  active={screen === "review"}
                  complete={false}
                />
              </div>

              {screen === "capture" ? (
                <>
                  <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Card images</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Add the front first, then add the back if more details are printed there.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 lg:min-w-[320px] lg:max-w-[360px]">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            OCR Platform
                          </label>
                          <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                            {selectedSideCount}/2 selected
                          </div>
                        </div>
                        <AppSelect
                          value={selectedProvider}
                          onValueChange={setSelectedProvider}
                          options={providerOptions}
                          placeholder="Select OCR platform"
                          triggerClassName="h-12 rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm focus:ring-[#d9e0ff] focus:border-[#293682]"
                          contentClassName="rounded-2xl"
                          disabled={loadingProviders}
                        />
                        <p className="text-xs text-slate-500">
                          {loadingProviders
                            ? "Loading configured OCR services..."
                            : selectedProvider
                              ? "The selected service will scan each side separately."
                              : "Choose a configured OCR service before extraction."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {CARD_SIDES.map((side) => (
                        <div key={side} className="space-y-0">
                          <input
                            ref={(node) => {
                              fileInputRefs.current[side] = node;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/heic,image/heif"
                            className="hidden"
                            onChange={(event) => handleFile(event.target.files?.[0], side)}
                          />
                          <SideCard
                            side={side}
                            scan={scans[side]}
                            selected={activeSide === side}
                            onSelect={() => setActiveSide(side)}
                            onDrop={(event) => handleDrop(event, side)}
                            onBrowse={() => {
                              setActiveSide(side);
                              fileInputRefs.current[side]?.click();
                            }}
                            onClear={() => handleResetSide(side)}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div
                    className={`flex items-center gap-3 rounded-2xl p-3 ${
                      review?.requiresReview
                        ? "border border-amber-200 bg-amber-50"
                        : "border border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    {review?.requiresReview ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    )}
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          review?.requiresReview ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {review?.requiresReview
                          ? "Review required before saving"
                          : "Auto-fill is ready"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Confidence {review?.overallConfidence || 0}% via{" "}
                        {review?.channelUsed || "OCR"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Scanned sides: {(review?.scannedSides || []).join(", ") || "None"}
                      </p>
                    </div>
                  </div>

                  {(review?.scannedSides || []).length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Uploaded card images</h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Compare the extracted fields against the original card before saving.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {review.scannedSides.map((side) => {
                          const scan = scans[side];
                          const title = side === "FRONT" ? "Front of card" : "Back of card";

                          return (
                            <div
                              key={side}
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                            >
                              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  {title}
                                </p>
                                {scan?.file?.name ? (
                                  <span className="truncate text-[11px] text-slate-400">
                                    {scan.file.name}
                                  </span>
                                ) : null}
                              </div>

                              {scan?.preview && scan.preview !== "pdf" ? (
                                <img
                                  src={scan.preview}
                                  alt={title}
                                  className="h-48 w-full object-contain bg-slate-50"
                                />
                              ) : (
                                <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center">
                                  <FileImage className="h-10 w-10 text-slate-300" />
                                  <p className="text-xs text-slate-500">
                                    {scan?.file?.name || "No preview available"}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {review?.lowConfidenceFields?.length > 0 ? (
                    <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                      <strong>Needs review:</strong>{" "}
                      {review.lowConfidenceFields
                        .map((field) => FIELD_LABELS[field] || field)
                        .join(", ")}
                    </div>
                  ) : null}

                  <div className="mt-5 space-y-3">
                    {Object.entries(FIELD_LABELS).map(([field, label]) => {
                      const value = review?.editedFields?.[field] || "";
                      const confidence = review?.confidenceScores?.[field];
                      const isLow = confidence && confidence < CONFIDENCE_THRESHOLD;

                      if (!value && !confidence) return null;

                      return (
                        <div key={field}>
                          <label className="mb-1 flex items-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {label}
                            {confidence ? <ConfidenceBadge score={confidence} /> : null}
                          </label>
                          <input
                            value={value}
                            onChange={(event) => updateField(field, event.target.value)}
                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                              isLow
                                ? "border-amber-300 bg-amber-50/50 focus:ring-amber-200"
                                : "border-emerald-200 bg-emerald-50/50 focus:ring-emerald-200"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
        </div>

        {globalError ? (
          <div className="shrink-0 border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
            {globalError}
          </div>
        ) : null}

        <div className="shrink-0 border-t border-slate-200 bg-white/96 px-6 py-4 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {screen === "review" ? (
              <button
                onClick={() => setScreen("capture")}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Uploads
              </button>
            ) : onClose ? (
              <button
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
            ) : null}

            {screen === "capture" ? (
              <>
                <button
                  onClick={() => handleResetSide(activeSide)}
                  disabled={!scans[activeSide]?.file}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                >
                  Clear Selected Side
                </button>
                <button
                  onClick={handleExtract}
                  disabled={
                    extracting || selectedSideCount === 0 || !selectedProvider || loadingProviders
                  }
                  className="rounded-2xl px-8 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: "#0a7e87" }}
                >
                  {extracting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting...
                    </span>
                  ) : (
                    "Continue to Auto-Fill Review"
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={handleConfirm}
                className="rounded-2xl px-8 py-3 text-sm font-bold text-white"
                style={{ backgroundColor: "#293682" }}
              >
                Confirm and Use Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
