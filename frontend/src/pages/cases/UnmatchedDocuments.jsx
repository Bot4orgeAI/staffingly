import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityFilterQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Search, AlertTriangle, CheckCircle, Clock, FileText, Loader2, X } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

const STORAGE_LABELS = {
  google_drive: { label: "Google Drive", color: "#4285F4", bg: "#EBF2FF" },
  onedrive: { label: "OneDrive", color: "#0078D4", bg: "#E5F2FF" },
  dropbox: { label: "Dropbox", color: "#0061FF", bg: "#E5EEFF" },
  staffingly_portal: { label: "Portal Upload", color: "#293682", bg: "#eef3ff" },
  manual_upload: { label: "Manual Upload", color: "#0a7e87", bg: "#f0fdfa" },
};

function MatchModal({ doc, onClose, onMatch }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const { data: cases = [], isLoading: loading } = useEntityFilterQuery(
    "PriorAuthCase",
    { client_id: doc.client_id },
    {
      enabled: Boolean(doc?.client_id),
      select: (data) => data.filter((c) => !["Closed"].includes(c.status)),
    }
  );
  const matchMutation = useMutation({
    mutationFn: async () => {
      await api.entities.PriorAuthDocument.create({
        case_id: selected.id,
        document_type: doc.detected_document_type || "Other",
        checklist_item_key: doc.detected_document_type || "Other",
        file_url: doc.file_url,
        file_name: doc.file_name,
        status: "Uploaded",
        ai_classification: doc.detected_document_type,
        ai_extracted_data_json: doc.extracted_data_json,
        uploaded_by: `matched_from_queue`,
      });
      await api.entities.UnmatchedDocument.update(doc.id, {
        status: "Matched",
        matched_to_case_id: selected.id,
        matched_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      onMatch();
    },
  });

  const filtered = cases.filter(
    (c) =>
      !search ||
      c.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.patient_initials?.toLowerCase().includes(search.toLowerCase()) ||
      c.payer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleMatch = async () => {
    if (!selected) return;
    await matchMutation.mutateAsync();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">Match to Case</h3>
            <p className="text-xs text-slate-400 mt-0.5">{doc.file_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Extracted data */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-2 text-xs">
          {doc.extracted_patient_initials && (
            <div>
              <span className="text-slate-400">Initials: </span>
              <span className="font-semibold text-slate-700">{doc.extracted_patient_initials}</span>
            </div>
          )}
          {doc.extracted_insurance_id && (
            <div>
              <span className="text-slate-400">Insurance ID: </span>
              <span className="font-semibold text-slate-700">{doc.extracted_insurance_id}</span>
            </div>
          )}
          {doc.extracted_dob && (
            <div>
              <span className="text-slate-400">DOB: </span>
              <span className="font-semibold text-slate-700">{doc.extracted_dob}</span>
            </div>
          )}
          {doc.detected_document_type && (
            <div>
              <span className="text-slate-400">Type: </span>
              <span className="font-semibold text-slate-700">{doc.detected_document_type}</span>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Case ID, patient, or payer…"
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
            />
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-6">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No open cases found.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${selected?.id === c.id ? "border-[#293682]" : "border-slate-200 hover:border-slate-300"}`}
                  style={selected?.id === c.id ? { backgroundColor: "#eef3ff" } : {}}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800">
                      {c.case_id || c.id?.slice(-6)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.patient_initials} · {c.payer_name} · {c.procedure_name}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                    {c.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMatch}
            disabled={!selected || matchMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: "#293682" }}
          >
            {matchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {matchMutation.isPending ? "Matching…" : "Match to Case"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UnmatchedDocuments() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Unmatched");
  const [matchingDoc, setMatchingDoc] = useState(null);
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingUser } = useAuthUserQuery();
  const { data: docs = [], isLoading: loadingDocs } = useEntityListQuery(
    "UnmatchedDocument",
    "-created_date",
    200,
    { enabled: Boolean(user) }
  );

  const handleDismiss = async (doc) => {
    await api.entities.UnmatchedDocument.update(doc.id, { status: "Dismissed" });
    await queryClient.invalidateQueries({ queryKey: ["entity", "UnmatchedDocument"] });
  };

  const filtered = docs.filter((d) => {
    const matchStatus = filterStatus === "All" || d.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      d.file_name?.toLowerCase().includes(q) ||
      d.client_name?.toLowerCase().includes(q) ||
      d.extracted_patient_initials?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Detect 48h+ old unmatched docs
  const staleCount = useMemo(
    () =>
      docs.filter(
        (d) =>
          d.status === "Unmatched" &&
          d.detected_at &&
          Date.now() - new Date(d.detected_at).getTime() > 48 * 3600000
      ).length,
    [docs]
  );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="unmatched-documents"
      title="Unmatched Documents"
      breadcrumbs={["Documents", "Unmatched Queue"]}
    >
      <div className="max-w-[1400px] mx-auto space-y-5">
        {staleCount > 0 && (
          <div className="rounded-xl p-4 flex items-center gap-3 border-2 border-red-300 bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 font-semibold">
              {staleCount} document{staleCount > 1 ? "s have" : " has"} been in the queue for over
              48 hours and require immediate attention.
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name, client, or patient…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30"
            />
          </div>
          <AppSelect
            value={filterStatus}
            onValueChange={setFilterStatus}
            options={["All", "Unmatched", "Matched", "Dismissed"]}
            triggerClassName="w-[140px]"
          />
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-sm text-slate-600">
            <FileText className="w-4 h-4" />
            <span className="font-semibold">
              {docs.filter((d) => d.status === "Unmatched").length}
            </span>{" "}
            pending
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loadingUser || loadingDocs ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: "#f0fdf4" }}
              >
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="font-semibold text-slate-700">Queue is clear</p>
              <p className="text-sm text-slate-400 mt-1">
                All documents have been matched or dismissed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "File Name",
                      "Type",
                      "Source",
                      "Client",
                      "Extracted Patient",
                      "AI Confidence",
                      "Received",
                      "Status",
                      "Actions",
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
                  {filtered.map((doc) => {
                    const storage =
                      STORAGE_LABELS[doc.storage_type] || STORAGE_LABELS.manual_upload;
                    const isStale =
                      doc.status === "Unmatched" &&
                      doc.detected_at &&
                      Date.now() - new Date(doc.detected_at).getTime() > 48 * 3600000;
                    const conf = doc.ai_classification_confidence;

                    return (
                      <tr
                        key={doc.id}
                        className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isStale ? "border-l-4 border-l-red-400" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">
                              {doc.file_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                            {doc.detected_document_type || "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{ backgroundColor: storage.bg, color: storage.color }}
                          >
                            {storage.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {doc.client_name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs space-y-0.5">
                            {doc.extracted_patient_initials && (
                              <p className="font-semibold text-slate-700">
                                {doc.extracted_patient_initials}
                              </p>
                            )}
                            {doc.extracted_insurance_id && (
                              <p className="text-slate-400 font-mono">
                                {doc.extracted_insurance_id}
                              </p>
                            )}
                            {!doc.extracted_patient_initials && !doc.extracted_insurance_id && (
                              <p className="text-slate-300">No data extracted</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {conf != null ? (
                            <span
                              className={`font-bold text-sm ${conf >= 75 ? "text-emerald-600" : conf >= 50 ? "text-amber-600" : "text-red-500"}`}
                            >
                              {Math.round(conf)}%
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            {isStale && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            <Clock className="w-3 h-3 text-slate-400" />
                            {doc.detected_at ? new Date(doc.detected_at).toLocaleDateString() : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              doc.status === "Matched"
                                ? "bg-emerald-50 text-emerald-700"
                                : doc.status === "Dismissed"
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {doc.status === "Unmatched" && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setMatchingDoc(doc)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                style={{ backgroundColor: "#293682" }}
                              >
                                Match to Case
                              </button>
                              <button
                                onClick={() => handleDismiss(doc)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                          {doc.status !== "Unmatched" && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {matchingDoc && (
        <MatchModal
          doc={matchingDoc}
          onClose={() => setMatchingDoc(null)}
          onMatch={() => {
            setMatchingDoc(null);
            queryClient.invalidateQueries({ queryKey: ["entity", "UnmatchedDocument"] });
          }}
        />
      )}
    </StaffinglyLayout>
  );
}
