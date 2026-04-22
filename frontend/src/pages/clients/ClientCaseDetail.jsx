import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
import { queryKeys, useAuthUserQuery, useEntityDetailQuery, useEntityFilterQuery } from "@/lib/query";
import {
  getAccentColor,
  getClientId,
  getUserDisplayName,
  normalizeBranding,
  normalizeCase,
  normalizeDocument,
  normalizeMessage,
} from "@/lib/utils/clientPortal";
import {
  ChevronLeft,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  MessageSquare,
  Clock,
  Plus,
} from "lucide-react";

const STATUS_STYLES = {
  New: { bg: "#f1f5f9", text: "#475569" },
  "In Progress": { bg: "#eff6ff", text: "#1d4ed8" },
  "Awaiting Documents": { bg: "#fffbeb", text: "#92400e" },
  "Ready for Submission": { bg: "#e0f2fe", text: "#0369a1" },
  Submitted: { bg: "#f0fdfa", text: "#0f766e" },
  Approved: { bg: "#f0fdf4", text: "#15803d" },
  Denied: { bg: "#fef2f2", text: "#b91c1c" },
  "Appeal In Progress": { bg: "#fff7ed", text: "#9a3412" },
  "Peer To Peer Requested": { bg: "#fdf4ff", text: "#a21caf" },
  Closed: { bg: "#f8fafc", text: "#64748b" },
};

const STATUS_ORDER = [
  "New",
  "Awaiting Documents",
  "Ready for Submission",
  "Submitted",
  "Approved",
];

export default function ClientCaseDetail() {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get("id");

  const [msgInput, setMsgInput] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const msgBottomRef = useRef(null);
  const queryClient = useQueryClient();
  const { data: user, isLoading: loadingUser } = useAuthUserQuery();
  const clientId = getClientId(user);
  const { data: branding = null, isLoading: loadingBranding } = useEntityFilterQuery(
    "ClientBranding",
    clientId ? { clientId } : {},
    {
      enabled: Boolean(clientId),
      select: (data) => normalizeBranding(data[0] || null),
    }
  );
  const { data: caseData, isLoading: loadingCase } = useEntityDetailQuery("PriorAuthCase", caseId, {
    enabled: Boolean(user && caseId),
  });
  const { data: messages = [], isLoading: loadingMessages } = useEntityFilterQuery(
    "CaseMessage",
    caseId ? { caseId } : {},
    {
      enabled: Boolean(user && caseId),
      select: (data) =>
        data
          .map(normalizeMessage)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }
  );

  const paCase = caseData ? normalizeCase(caseData) : null;
  const docs = useMemo(
    () => (Array.isArray(caseData?.documents) ? caseData.documents.map(normalizeDocument) : []),
    [caseData]
  );

  const sendMessageMutation = useMutation({
    mutationFn: /** @param {Record<string, any>} message */ (message) => api.entities.CaseMessage.create(message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.entity.filter("CaseMessage", { caseId }, { sortBy: null, limit: null }),
      });
      setMsgInput("");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (/** @type {FileList | File[]} */ files) => {
      for (const file of Array.from(files)) {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        await api.client.post(`/api/prior-auth/cases/${caseId}/documents`, {
          documentType: "Client Upload",
          checklistItemKey: "client-upload",
          fileUrl: file_url,
          fileName: file.name,
        });
        await api.entities.CaseMessage.create({
          caseId,
          clientId: getClientId(user),
          senderRole: "client",
          senderId: user?.id,
          senderName: getUserDisplayName(user),
          message: `Uploaded document: ${file.name}`,
          readByClient: true,
          readByStaff: false,
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.entity.detail("PriorAuthCase", caseId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.entity.filter("CaseMessage", { caseId }, { sortBy: null, limit: null }),
        }),
      ]);
    },
  });

  useEffect(() => {
    const unreadStaffMessages = messages.filter((m) => m.senderRole === "staff" && !m.readByClient);
    unreadStaffMessages.forEach((message) => {
      api.entities.CaseMessage.update(message.id, { readByClient: true });
    });
  }, [messages]);

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const handleSendMessage = async () => {
    if (!msgInput.trim() || sendMessageMutation.isPending) return;
    await sendMessageMutation.mutateAsync({
      caseId,
      clientId: getClientId(user),
      senderRole: "client",
      senderId: user?.id,
      senderName: getUserDisplayName(user),
      message: msgInput.trim(),
      readByClient: true,
      readByStaff: false,
    });
  };

  const handleFileUpload = async (files) => {
    await uploadMutation.mutateAsync(files);
  };

  const loading = loadingUser || loadingBranding || loadingCase || loadingMessages;
  const sendingMsg = sendMessageMutation.isPending;
  const uploading = uploadMutation.isPending;

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );

  if (!paCase)
    return (
      <ClientPortalLayout user={user} branding={branding} currentPage="client-cases">
        <div className="text-center p-12 text-slate-400">Case not found.</div>
      </ClientPortalLayout>
    );

  const accent = getAccentColor(branding);
  const st = STATUS_STYLES[paCase.displayStatus] || STATUS_STYLES["New"];

  const TABS = [
    { key: "overview", label: "Overview", icon: Clock },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "outcome", label: "Outcome", icon: CheckCircle },
  ];

  return (
    <ClientPortalLayout user={user} branding={branding} currentPage="client-cases">
      <div className="max-w-[900px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("client-cases")}>
            <button className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-white transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">
                Case {paCase.caseNumber || paCase.id?.slice(-6)}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: st.bg, color: st.text }}
              >
                {paCase.displayStatus}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {paCase.procedureLabel} · {paCase.payerName}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
              style={activeTab === tab.key ? { backgroundColor: accent } : {}}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab — Status Timeline */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-5">Case Timeline</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
              <div className="space-y-4">
                {STATUS_ORDER.map((status, i) => {
                  const currentIdx = STATUS_ORDER.indexOf(paCase.displayStatus);
                  const isDone = i <= currentIdx || paCase.displayStatus === "Approved";
                  const isCurrent = status === paCase.displayStatus;
                  return (
                    <div key={status} className="flex items-start gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all ${isDone ? "border-transparent" : "border-slate-200 bg-white"}`}
                        style={isDone ? { backgroundColor: accent } : {}}
                      >
                        {isDone ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p
                          className={`text-sm font-semibold ${isCurrent ? "text-slate-800" : isDone ? "text-slate-600" : "text-slate-400"}`}
                        >
                          {status}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Current status ·{" "}
                            {paCase.updatedAt
                              ? new Date(paCase.updatedAt).toLocaleDateString()
                              : "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {paCase.displayStatus === "Denied" && (
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 bg-red-500">
                      <XCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-semibold text-red-700">Denied</p>
                      {paCase.denialReason && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Reason: {paCase.denialReason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Documents</h3>
                <label
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold cursor-pointer hover:opacity-90 ${uploading ? "opacity-50" : ""}`}
                  style={{ backgroundColor: accent }}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {uploading ? "Uploading…" : "Upload Document"}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={(e) => e.target.files?.length && handleFileUpload(e.target.files)}
                    disabled={uploading}
                  />
                </label>
              </div>
              {docs.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  No documents attached yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">
                          {doc.fileName || doc.documentType}
                        </p>
                        <p className="text-xs text-slate-400">{doc.documentType}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${doc.status === "VERIFIED" ? "bg-emerald-50 text-emerald-700" : doc.status === "UPLOADED" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {doc.status === "VERIFIED"
                          ? "✓ Processed"
                          : doc.status === "UPLOADED"
                            ? "Received"
                            : doc.status}
                      </span>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold hover:underline"
                          style={{ color: accent }}
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              <p className="font-semibold text-slate-700 mb-1">
                Need to share documents via cloud storage?
              </p>
              <p className="text-xs">
                You can also drop documents into your connected <strong>Incoming Documents</strong>{" "}
                folder. They'll be automatically picked up and attached to your cases.
              </p>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div
            className="bg-white rounded-2xl border border-slate-200 flex flex-col"
            style={{ height: "500px" }}
          >
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Messages with Staffingly Team</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">
                  No messages yet. Send a message to the Staffingly team below.
                </p>
              )}
              {messages.map((msg) => {
                const isClient = msg.senderRole === "client";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isClient ? "justify-end" : "justify-start"}`}
                  >
                    {!isClient && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: accent }}
                      >
                        S
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isClient ? "text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}
                      style={isClient ? { backgroundColor: accent } : {}}
                    >
                      {!isClient && (
                        <p className="text-[10px] font-bold mb-1 opacity-60">Staffingly Team</p>
                      )}
                      <p className="leading-relaxed">{msg.body}</p>
                      <p
                        className={`text-[10px] mt-1 ${isClient ? "text-white/60 text-right" : "text-slate-400"}`}
                      >
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                    {isClient && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: "#f6b037" }}
                      >
                        {getUserDisplayName(user).charAt(0)}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={msgBottomRef} />
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <textarea
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())
                }
                placeholder="Type a message to the Staffingly team…"
                rows={2}
                className="flex-1 resize-none px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/20"
              />
              <button
                onClick={handleSendMessage}
                disabled={!msgInput.trim() || sendingMsg}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-40 self-end"
                style={{ backgroundColor: accent }}
              >
                {sendingMsg ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Outcome Tab */}
        {activeTab === "outcome" && (
          <div className="space-y-4">
            {paCase.displayStatus === "Approved" && (
              <div className="bg-white rounded-2xl border-2 border-emerald-300 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-800 text-lg">Authorization Approved</h3>
                    <p className="text-sm text-emerald-700">{paCase.payerName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {paCase.confirmation_number && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Authorization Number
                      </p>
                      <p className="font-bold font-mono text-slate-800">
                        {paCase.confirmation_number}
                      </p>
                    </div>
                  )}
                  {paCase.submission_timestamp && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Decision Date
                      </p>
                      <p className="font-semibold text-slate-700">
                        {new Date(paCase.submission_timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {paCase.displayStatus === "Denied" && (
              <div className="bg-white rounded-2xl border-2 border-red-300 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-800 text-lg">Authorization Denied</h3>
                    <p className="text-sm text-red-700">{paCase.payerName}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {paCase.denialReason && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Denial Reason
                      </p>
                      <p className="text-slate-700">{paCase.denialReason}</p>
                    </div>
                  )}
                  {paCase.denial_date && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Denial Date
                      </p>
                      <p className="text-slate-700">
                        {new Date(paCase.denial_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {paCase.appeal_deadline && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Appeal Deadline
                      </p>
                      <p className="font-bold text-red-700">
                        {new Date(paCase.appeal_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {paCase.appeal_submitted_at && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs font-bold text-amber-800">✓ Appeal Filed</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Filed {new Date(paCase.appeal_submitted_at).toLocaleDateString()} ·{" "}
                        {paCase.displayStatus}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!["Approved", "Denied"].includes(paCase.displayStatus) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-600">Outcome Pending</p>
                <p className="text-sm text-slate-400 mt-1">
                  Current status: <strong>{paCase.displayStatus}</strong>. We'll notify you when a decision
                  is made.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
}
