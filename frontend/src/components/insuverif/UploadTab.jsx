import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Brain,
  Camera,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  FileImage,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import AppSelect from "@/components/ui/app-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
const MULTI_ALLOWED_DOC_TYPES = new Set(["Other Document"]);

const FIELD_SOURCE_PRIORITY = {
  patientName: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 70,
    "Explanation of Benefits (EOB)": 80,
    "Referral Letter": 85,
    "Prior Authorization Letter": 85,
    "Lab/Radiology Report": 75,
    "Other Document": 60,
  },
  patientDob: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 70,
    "Explanation of Benefits (EOB)": 80,
    "Referral Letter": 75,
    "Prior Authorization Letter": 75,
    "Lab/Radiology Report": 70,
    "Other Document": 60,
  },
  gender: {
    "Insurance Card Front": 65,
    "Insurance Card Back": 55,
    "Explanation of Benefits (EOB)": 55,
    "Referral Letter": 60,
    "Prior Authorization Letter": 60,
    "Lab/Radiology Report": 60,
    "Other Document": 50,
  },
  phone: {
    "Insurance Card Front": 50,
    "Insurance Card Back": 85,
    "Explanation of Benefits (EOB)": 70,
    "Referral Letter": 75,
    "Prior Authorization Letter": 75,
    "Lab/Radiology Report": 70,
    "Other Document": 55,
  },
  email: {
    "Insurance Card Front": 45,
    "Insurance Card Back": 70,
    "Explanation of Benefits (EOB)": 55,
    "Referral Letter": 60,
    "Prior Authorization Letter": 60,
    "Lab/Radiology Report": 55,
    "Other Document": 50,
  },
  address: {
    "Insurance Card Front": 55,
    "Insurance Card Back": 75,
    "Explanation of Benefits (EOB)": 65,
    "Referral Letter": 65,
    "Prior Authorization Letter": 65,
    "Lab/Radiology Report": 60,
    "Other Document": 50,
  },
  city: {
    "Insurance Card Front": 55,
    "Insurance Card Back": 75,
    "Explanation of Benefits (EOB)": 65,
    "Referral Letter": 65,
    "Prior Authorization Letter": 65,
    "Lab/Radiology Report": 60,
    "Other Document": 50,
  },
  state: {
    "Insurance Card Front": 55,
    "Insurance Card Back": 75,
    "Explanation of Benefits (EOB)": 65,
    "Referral Letter": 65,
    "Prior Authorization Letter": 65,
    "Lab/Radiology Report": 60,
    "Other Document": 50,
  },
  zip: {
    "Insurance Card Front": 55,
    "Insurance Card Back": 75,
    "Explanation of Benefits (EOB)": 65,
    "Referral Letter": 65,
    "Prior Authorization Letter": 65,
    "Lab/Radiology Report": 60,
    "Other Document": 50,
  },
  payerName: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 80,
    "Explanation of Benefits (EOB)": 90,
    "Prior Authorization Letter": 75,
    "Referral Letter": 65,
    "Lab/Radiology Report": 55,
    "Other Document": 50,
  },
  payerId: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 80,
    "Explanation of Benefits (EOB)": 90,
    "Prior Authorization Letter": 75,
    "Referral Letter": 55,
    "Lab/Radiology Report": 45,
    "Other Document": 50,
  },
  memberId: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 75,
    "Explanation of Benefits (EOB)": 90,
    "Prior Authorization Letter": 70,
    "Referral Letter": 55,
    "Lab/Radiology Report": 45,
    "Other Document": 50,
  },
  groupNumber: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 70,
    "Explanation of Benefits (EOB)": 90,
    "Prior Authorization Letter": 70,
    "Referral Letter": 55,
    "Lab/Radiology Report": 45,
    "Other Document": 50,
  },
  planName: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 75,
    "Explanation of Benefits (EOB)": 90,
    "Prior Authorization Letter": 70,
    "Referral Letter": 55,
    "Lab/Radiology Report": 45,
    "Other Document": 50,
  },
  planType: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 75,
    "Explanation of Benefits (EOB)": 90,
    "Prior Authorization Letter": 70,
    "Referral Letter": 55,
    "Lab/Radiology Report": 45,
    "Other Document": 50,
  },
  subscriberName: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 70,
    "Explanation of Benefits (EOB)": 85,
    "Prior Authorization Letter": 75,
    "Referral Letter": 70,
    "Lab/Radiology Report": 60,
    "Other Document": 50,
  },
  subscriberDob: {
    "Insurance Card Front": 100,
    "Insurance Card Back": 70,
    "Explanation of Benefits (EOB)": 85,
    "Prior Authorization Letter": 75,
    "Referral Letter": 65,
    "Lab/Radiology Report": 55,
    "Other Document": 50,
  },
  subscriberRelationship: {
    "Insurance Card Front": 85,
    "Insurance Card Back": 70,
    "Explanation of Benefits (EOB)": 65,
    "Prior Authorization Letter": 65,
    "Referral Letter": 60,
    "Lab/Radiology Report": 50,
    "Other Document": 45,
  },
  rxBin: {
    "Insurance Card Front": 70,
    "Insurance Card Back": 100,
    "Explanation of Benefits (EOB)": 55,
    "Prior Authorization Letter": 40,
    "Referral Letter": 35,
    "Lab/Radiology Report": 35,
    "Other Document": 35,
  },
  rxPcn: {
    "Insurance Card Front": 70,
    "Insurance Card Back": 100,
    "Explanation of Benefits (EOB)": 55,
    "Prior Authorization Letter": 40,
    "Referral Letter": 35,
    "Lab/Radiology Report": 35,
    "Other Document": 35,
  },
  rxGroup: {
    "Insurance Card Front": 70,
    "Insurance Card Back": 100,
    "Explanation of Benefits (EOB)": 55,
    "Prior Authorization Letter": 40,
    "Referral Letter": 35,
    "Lab/Radiology Report": 35,
    "Other Document": 35,
  },
  effectiveDate: {
    "Insurance Card Front": 90,
    "Insurance Card Back": 65,
    "Explanation of Benefits (EOB)": 100,
    "Prior Authorization Letter": 80,
    "Referral Letter": 55,
    "Lab/Radiology Report": 45,
    "Other Document": 50,
  },
  serviceDate: {
    "Insurance Card Front": 30,
    "Insurance Card Back": 35,
    "Explanation of Benefits (EOB)": 95,
    "Prior Authorization Letter": 90,
    "Referral Letter": 80,
    "Lab/Radiology Report": 100,
    "Other Document": 55,
  },
  providerName: {
    "Insurance Card Front": 30,
    "Insurance Card Back": 35,
    "Explanation of Benefits (EOB)": 70,
    "Prior Authorization Letter": 85,
    "Referral Letter": 100,
    "Lab/Radiology Report": 95,
    "Other Document": 55,
  },
  providerNpi: {
    "Insurance Card Front": 25,
    "Insurance Card Back": 35,
    "Explanation of Benefits (EOB)": 65,
    "Prior Authorization Letter": 85,
    "Referral Letter": 95,
    "Lab/Radiology Report": 100,
    "Other Document": 55,
  },
  cptCode: {
    "Insurance Card Front": 20,
    "Insurance Card Back": 20,
    "Explanation of Benefits (EOB)": 70,
    "Prior Authorization Letter": 80,
    "Referral Letter": 75,
    "Lab/Radiology Report": 95,
    "Other Document": 55,
  },
  facilityName: {
    "Insurance Card Front": 20,
    "Insurance Card Back": 25,
    "Explanation of Benefits (EOB)": 65,
    "Prior Authorization Letter": 80,
    "Referral Letter": 75,
    "Lab/Radiology Report": 90,
    "Other Document": 55,
  },
  notes: {
    "Insurance Card Front": 10,
    "Insurance Card Back": 15,
    "Explanation of Benefits (EOB)": 75,
    "Prior Authorization Letter": 90,
    "Referral Letter": 80,
    "Lab/Radiology Report": 85,
    "Other Document": 60,
  },
};

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

function createDocument(id = Date.now(), sequence = 1) {
  return {
    id,
    sequence,
    expanded: true,
    docType: "Insurance Card Front",
    file: null,
    preview: null,
    extraction: null,
  };
}

function getNextDocumentType(documents = []) {
  const preferredTypes = DOC_TYPES.filter((type) => !MULTI_ALLOWED_DOC_TYPES.has(type));
  const usedTypes = new Set(documents.map((document) => document.docType));
  const availableType = preferredTypes.find((type) => !usedTypes.has(type));

  return availableType || "Other Document";
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

function getFieldPriorityScore(fieldKey, docType) {
  return FIELD_SOURCE_PRIORITY[fieldKey]?.[docType] ?? 50;
}

function pickPreferredField(current, next, docType, fieldKey) {
  if (!next?.value) return current;
  if (!current?.value) return { ...next, docType };

  const nextPriority = getFieldPriorityScore(fieldKey, docType);
  const currentPriority = getFieldPriorityScore(fieldKey, current.docType);
  if (nextPriority > currentPriority) {
    return { ...next, docType };
  }

  if (nextPriority < currentPriority) {
    return current;
  }

  return pickBetterField(current, next, docType);
}

function mapMergedFieldsToPrefill(mergedFields = {}) {
  const subscriberName = mergedFields.subscriberName?.value || "";
  const patientName = mergedFields.patientName?.value || subscriberName;
  const patientNameParts = splitName(patientName);
  const providerName = mergedFields.providerName?.value || "";
  const facilityName = mergedFields.facilityName?.value || providerName;

  return {
    ...patientNameParts,
    dob: mergedFields.patientDob?.value || "",
    gender: mergedFields.gender?.value || "",
    phone: mergedFields.phone?.value || "",
    email: mergedFields.email?.value || "",
    address: mergedFields.address?.value || "",
    city: mergedFields.city?.value || "",
    state: mergedFields.state?.value || "",
    zip: mergedFields.zip?.value || "",
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
    subscriber_relationship: mergedFields.subscriberRelationship?.value || "Self",
    provider_npi: mergedFields.providerNpi?.value || "",
    cpt_code: mergedFields.cptCode?.value || "",
    facility_name: facilityName,
    notes: mergedFields.notes?.value || "",
  };
}

function mergeExtractionResults(results = []) {
  const mergedFields = {};

  for (const result of results) {
    const fields = result?.data?.fields || {};
    const scores = result?.data?.confidenceScores || {};

    for (const [fieldKey, value] of Object.entries(fields)) {
      const confidence = scores[fieldKey] || 0;
      const preferredField = pickPreferredField(
        mergedFields[fieldKey],
        { value, confidence },
        result.docType,
        fieldKey
      );

      if (preferredField) {
        mergedFields[fieldKey] = preferredField;
      } else {
        delete mergedFields[fieldKey];
      }
    }
  }

  const confidenceScores = Object.fromEntries(
    Object.entries(mergedFields).map(([fieldKey, fieldValue]) => [
      fieldKey,
      fieldValue?.confidence || 0,
    ])
  );
  const lowConfidenceFields = Object.entries(confidenceScores)
    .filter(([, confidence]) => confidence < 70)
    .map(([fieldKey]) => fieldKey);
  const selectedConfidenceValues = Object.values(confidenceScores);
  const overallConfidence = selectedConfidenceValues.length
    ? Math.round(
        selectedConfidenceValues.reduce((sum, value) => sum + value, 0) /
          selectedConfidenceValues.length
      )
    : 0;

  return {
    mergedFields,
    confidenceScores,
    lowConfidenceFields,
    overallConfidence,
  };
}

function normalizeExtractionResponse(extraction, docType) {
  return {
    ...extraction,
    docType: docType || extraction?.docType || "Other Document",
    data: {
      fields:
        extraction?.data?.fields && typeof extraction.data.fields === "object"
          ? extraction.data.fields
          : {},
      confidenceScores:
        extraction?.data?.confidenceScores && typeof extraction.data.confidenceScores === "object"
          ? extraction.data.confidenceScores
          : {},
      lowConfidenceFields: Array.isArray(extraction?.data?.lowConfidenceFields)
        ? extraction.data.lowConfidenceFields
        : [],
      overallConfidence:
        typeof extraction?.data?.overallConfidence === "number" ? extraction.data.overallConfidence : 0,
      requiresReview: Boolean(extraction?.data?.requiresReview),
      channelUsed: extraction?.data?.channelUsed || "unknown",
      processingTimeMs:
        typeof extraction?.data?.processingTimeMs === "number" ? extraction.data.processingTimeMs : 0,
      documentType: extraction?.data?.documentType || docType || "Other Document",
      provider: extraction?.data?.provider || "auto",
      fileName: extraction?.data?.fileName || "",
    },
    success: Boolean(extraction?.success),
    error: extraction?.error || null,
  };
}

function buildMergedReviewState(documents = []) {
  const extractedDocuments = documents.filter((document) => document.extraction);
  if (extractedDocuments.length === 0) {
    return {
      editedData: {},
      confidenceScores: {},
      lowConfidenceFields: [],
    };
  }

  const merged = mergeExtractionResults(
    extractedDocuments.map((document) => ({
      ...normalizeExtractionResponse(document.extraction, document.docType),
    }))
  );

  return {
    editedData: mapMergedFieldsToPrefill(merged.mergedFields),
    confidenceScores: merged.confidenceScores,
    lowConfidenceFields: merged.lowConfidenceFields,
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
  gender: "Gender",
  phone: "Phone",
  email: "Email",
  address: "Address",
  city: "City",
  state: "State",
  zip: "ZIP",
  effective_date: "Effective Date",
  service_date: "Service Date",
  plan_type: "Plan Type",
  rx_bin: "Rx BIN",
  rx_pcn: "Rx PCN",
  rx_group: "Rx Group",
  subscriber_name: "Subscriber Name",
  subscriber_dob: "Subscriber DOB",
  subscriber_relationship: "Subscriber Relationship",
  provider_npi: "Provider NPI",
  cpt_code: "CPT Code",
  facility_name: "Facility Name",
  notes: "Notes",
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
  gender: "gender",
  phone: "phone",
  email: "email",
  address: "address",
  city: "city",
  state: "state",
  zip: "zip",
  effective_date: "effectiveDate",
  service_date: "serviceDate",
  plan_type: "planType",
  rx_bin: "rxBin",
  rx_pcn: "rxPcn",
  rx_group: "rxGroup",
  subscriber_name: "subscriberName",
  subscriber_dob: "subscriberDob",
  subscriber_relationship: "subscriberRelationship",
  provider_npi: "providerNpi",
  cpt_code: "cptCode",
  facility_name: "facilityName",
  notes: "notes",
};

export default function UploadTab({ onSubmit, clientId = "" }) {
  const { data: ocrProvidersResponse } = useQuery({
    queryKey: ["upload", "ocr-providers"],
    queryFn: () => api.upload.getInsuranceCardOcrProviders(),
    staleTime: 5 * 60 * 1000,
  });
  const [documents, setDocuments] = useState([createDocument(Date.now(), 1)]);
  const [extracting, setExtracting] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [lowConfidenceFields, setLowConfidenceFields] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateDialog, setDuplicateDialog] = useState(null);
  const [selectedOcrProvider, setSelectedOcrProvider] = useState("auto");
  const fileRefs = useRef({});
  const cameraRefs = useRef({});
  const nextDocumentSequenceRef = useRef(2);

  const canExtract = documents.some((document) => document.file);
  const hasExtractedData = Object.keys(editedData).length > 0;
  const availableOcrProviders = ocrProvidersResponse?.data?.providers || [];
  const ocrProviderOptions = [
    { label: "Auto Select", value: "auto" },
    ...availableOcrProviders
      .filter((provider) => provider.available)
      .map((provider) => ({
        label: provider.label,
        value: provider.id,
      })),
  ];

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

  useEffect(() => {
    try {
      const mergedState = buildMergedReviewState(documents);
      setEditedData(mergedState.editedData);
      setConfidenceScores(mergedState.confidenceScores);
      setLowConfidenceFields(mergedState.lowConfidenceFields);

      if (Object.keys(mergedState.editedData).length === 0) {
        setShowForm(false);
      }
    } catch (mergeError) {
      console.error("Failed to build merged upload review state", mergeError);
      setEditedData({});
      setConfidenceScores({});
      setLowConfidenceFields([]);
      setShowForm(false);
      setError("We couldn't prepare the extracted document review. Please try rescanning the uploaded documents.");
    }
  }, [documents]);

  const addDocument = () => {
    const sequence = nextDocumentSequenceRef.current;
    nextDocumentSequenceRef.current += 1;

    setDocuments((current) => [
      {
        ...createDocument(Date.now() + current.length, sequence),
        docType: getNextDocumentType(current),
      },
      ...current,
    ]);
  };

  const removeDocument = (id) => {
    setDocuments((current) => current.filter((document) => document.id !== id));
  };

  const replaceDuplicateDocument = (id, docType) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? {
              ...document,
              docType,
            }
          : document.docType === docType
            ? {
                ...document,
                docType: "Other Document",
              }
            : document
      )
    );
    setError(null);
    setShowForm(false);
  };

  const handleDuplicateConfirm = () => {
    if (!duplicateDialog) return;
    replaceDuplicateDocument(duplicateDialog.documentId, duplicateDialog.docType);
    setDuplicateDialog(null);
  };

  const handleFile = (id, file) => {
    if (!file) return;

    const commitPreview = (preview) => {
      setDocuments((current) =>
        current.map((document) =>
          document.id === id
            ? {
                ...document,
                file,
                preview,
                extraction: null,
              }
            : document
        )
      );
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

  const extractDocuments = async (targetDocuments) => {
    const docsToExtract = targetDocuments.filter((document) => document.file);
    if (docsToExtract.length === 0) return;

    setExtracting(true);
    setError(null);

    try {
      const extractionById = new Map();

      for (const document of docsToExtract) {
        const formData = new FormData();
        formData.append("file", document.file);
        formData.append("documentType", document.docType);
        formData.append("provider", selectedOcrProvider);

        const response = await api.upload.extractDocumentData(formData);
        if (!response.success && response.error) {
          throw new Error(response.error);
        }

        const enrichedResponse = normalizeExtractionResponse(response, document.docType);
        extractionById.set(document.id, enrichedResponse);
      }

      setDocuments((current) =>
        current.map((document) =>
          extractionById.has(document.id)
            ? {
                ...document,
                extraction: extractionById.get(document.id),
              }
            : document
        )
      );
    } catch (err) {
      setError(err.message || "Failed to extract data from document(s)");
    } finally {
      setExtracting(false);
    }
  };

  const handleExtract = async () => {
    await extractDocuments(documents);
  };

  const handleRescan = async () => {
    await extractDocuments(documents);
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

        <div className="mt-4 max-w-sm">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            OCR Platform
          </label>
          <AppSelect
            value={selectedOcrProvider}
            onValueChange={setSelectedOcrProvider}
            options={ocrProviderOptions}
            triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
          />
          <p className="mt-2 text-xs text-slate-400">
            Choose a specific OCR engine or let the app select automatically.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {documents.map((document) => (
          <div key={document.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  updateDocument(document.id, (current) => ({
                    ...current,
                    expanded: !current.expanded,
                  }))
                }
                className="flex flex-1 items-start justify-between gap-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">Document {document.sequence}</p>
                  <p className="text-xs text-slate-500">
                    {document.file?.name || "Choose the file type and upload the supporting document."}
                  </p>
                  {document.extraction ? (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Last scan confidence {document.extraction?.data?.overallConfidence || 0}%
                    </p>
                  ) : null}
                </div>
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
                  {document.expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>
              <div className="mt-1 flex flex-shrink-0 items-center gap-2">
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
            </div>

            {document.expanded ? (
              <>
                <div className="mb-4 max-w-sm">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Document Type
                  </label>
                  <AppSelect
                    value={document.docType}
                    onValueChange={(value) => {
                      const duplicate = documents.find(
                        (entry) =>
                          entry.id !== document.id &&
                          entry.docType === value &&
                          !MULTI_ALLOWED_DOC_TYPES.has(value)
                      );

                      if (duplicate) {
                        setDuplicateDialog({
                          documentId: document.id,
                          docType: value,
                        });
                        return;
                      }

                      setDocuments((current) =>
                        current.map((entry) =>
                          entry.id === document.id
                            ? {
                                ...entry,
                                docType: value,
                                file: null,
                                preview: null,
                                extraction: null,
                              }
                            : entry
                        )
                      );
                      setError(null);
                      setShowForm(false);
                    }}
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

                  <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
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
              </>
            ) : null}
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
            <>
              <Brain className="h-4 w-4" />
              Extract Data with AI
            </>
          )}
        </button>
      ) : null}

      {canExtract && hasExtractedData ? (
        <button
          type="button"
          onClick={handleRescan}
          disabled={extracting}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {extracting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Rescanning uploaded documents...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              Rescan Uploaded Documents
            </>
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
          <ManualEntryTab
            onSubmit={onSubmit}
            prefill={editedData}
            clientId={clientId}
            showPatientSelector={false}
          />
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(duplicateDialog)}
        onOpenChange={(open) => {
          if (!open) setDuplicateDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Document?</AlertDialogTitle>
            <AlertDialogDescription>
              A document of type "{duplicateDialog?.docType}" already exists. Replacing it will
              clear the current file and extracted data for that document slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateConfirm}>
              Replace Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
