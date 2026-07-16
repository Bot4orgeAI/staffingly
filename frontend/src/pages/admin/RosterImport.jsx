import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthUserQuery } from "@/lib/query";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import AppSelect from "@/components/ui/app-select";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
} from "lucide-react";

const STAFFINGLY_ROLES = new Set([
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
]);

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RosterImport() {
  const { data: user } = useAuthUserQuery({ redirectOnError: false });
  const fileRef = useRef(null);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const { data: clientsResponse, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients", "roster-selector"],
    queryFn: () => api.clients.list({ limit: 100 }),
    enabled: Boolean(user && !user.clientId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: importsResponse, refetch: refetchImports } = useQuery({
    queryKey: ["roster", "imports", selectedClientId],
    queryFn: () => api.roster.listImports(selectedClientId ? { clientId: selectedClientId } : {}),
    staleTime: 30 * 1000,
  });

  const availableClients = clientsResponse?.data || clientsResponse?.clients || [];
  const resolvedClientId = user?.clientId || selectedClientId;
  const imports = importsResponse?.data || [];

  const isAllowed = user && STAFFINGLY_ROLES.has(user.role);

  const handleFile = async (file) => {
    if (!file || !resolvedClientId) return;
    setUploading(true);
    setUploadError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", resolvedClientId);
      const response = await api.roster.importRoster(formData);
      setResult(response);
      void refetchImports();
    } catch (err) {
      setUploadError(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!isAllowed) {
    return (
      <StaffinglyLayout>
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <p className="text-lg font-semibold text-slate-700">Access Restricted</p>
          <p className="text-sm text-slate-400">
            Only StaffVerify operations team members can upload patient rosters.
          </p>
        </div>
      </StaffinglyLayout>
    );
  }

  return (
    <StaffinglyLayout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Patient Roster</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload a CSV export from the clinic's EHR. Patients will be added to the client's
            eligibility work queue.
          </p>
        </div>

        {/* Client selector (super admins / ops only) */}
        {!user?.clientId && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Client Workspace
            </label>
            <AppSelect
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              placeholder={clientsLoading ? "Loading clients…" : "Select a client workspace"}
              options={availableClients.map((c) => ({ label: c.practiceName || c.name, value: c.id }))}
              disabled={clientsLoading}
              triggerClassName="h-[46px] bg-white px-3 py-2.5 text-sm"
            />
            {!resolvedClientId && (
              <p className="mt-2 text-xs text-slate-400">
                Select the clinic this roster belongs to before uploading.
              </p>
            )}
          </div>
        )}

        {/* Upload area */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-800">Roster CSV File</h2>
          </div>

          {!result && !uploading && (
            <div
              onDragOver={(e) => {
                if (!resolvedClientId) return;
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!resolvedClientId) return;
                const file = e.dataTransfer.files[0];
                if (file) void handleFile(file);
              }}
              onClick={() => {
                if (!resolvedClientId) return;
                fileRef.current?.click();
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-12 transition-all ${
                !resolvedClientId
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : dragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) void handleFile(e.target.files[0]);
                }}
              />
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "#eef3ff" }}
              >
                <Upload className="h-7 w-7" style={{ color: "#293682" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {resolvedClientId
                    ? "Drop CSV here or click to browse"
                    : "Select a client workspace first"}
                </p>
                <p className="mt-1 text-xs text-slate-400">CSV format only • Max 5MB</p>
              </div>
            </div>
          )}

          {uploading && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
              <p className="text-sm font-semibold text-slate-600">Parsing and importing roster…</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Roster imported successfully
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-600">
                    {result.importedCount} patients added to the work queue
                    {result.skippedCount > 0 ? ` · ${result.skippedCount} rows skipped` : ""}
                  </p>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-2 text-xs font-bold text-amber-700">
                    Skipped rows ({result.errors.length}):
                  </p>
                  <ul className="space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-xs text-amber-700">
                        Row {err.row}: {err.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Upload another file
              </button>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          )}
        </div>

        {/* Column mapping hint */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Download className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-800">Accepted Column Names</h2>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            The importer auto-detects common EHR export headers. You don't need to rename columns.
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
            <div><span className="font-semibold text-slate-700">Patient Name:</span> First Name, Pt First, FNAME</div>
            <div><span className="font-semibold text-slate-700">DOB:</span> DOB, Date of Birth, Birthdate</div>
            <div><span className="font-semibold text-slate-700">Member ID:</span> Member ID, Ins ID, Subscriber ID</div>
            <div><span className="font-semibold text-slate-700">Insurance:</span> Insurance, Payer, Carrier</div>
            <div><span className="font-semibold text-slate-700">Group #:</span> Group #, Group Number, Grp No</div>
            <div><span className="font-semibold text-slate-700">Appt Date:</span> Appt Date, Visit Date, Schedule Date</div>
          </div>
        </div>

        {/* Recent imports audit log */}
        {imports.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800">Recent Imports</h2>
            </div>
            <div className="space-y-2">
              {imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{imp.fileName}</p>
                    <p className="text-xs text-slate-400">
                      {imp.importedCount} imported · {imp.skippedCount} skipped ·{" "}
                      {imp.client?.name || imp.clientId} ·{" "}
                      {imp.uploadedBy?.name || imp.uploadedBy?.email} · {formatDate(imp.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    {imp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StaffinglyLayout>
  );
}
