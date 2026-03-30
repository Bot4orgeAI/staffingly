import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
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
  Submitted: { bg: "#f0fdfa", text: "#0f766e" },
  Approved: { bg: "#f0fdf4", text: "#15803d" },
  Denied: { bg: "#fef2f2", text: "#b91c1c" },
  "Appeal In Progress": { bg: "#fff7ed", text: "#9a3412" },
  Closed: { bg: "#f8fafc", text: "#64748b" },
};

const STATUS_ORDER = [
  "New",
  "In Progress",
  "Awaiting Documents",
  "Awaiting AI Review",
  "Pending Supervisor Approval",
  "Submitted",
  "Approved",
];

export default function ClientCaseDetail() {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get("id");

  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState(null);
  const [paCase, setPaCase] = useState(null);
  const [docs, setDocs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const msgBottomRef = useRef(null);

  useEffect(() => {
    api.auth
      .me()
      .then(async (u) => {
        setUser(u);
        const [bData, cData, dData, mData] = await Promise.all([
          api.entities.ClientBranding.filter({ client_id: u.id }).catch(() => []),
          api.entities.PriorAuthCase.filter({ id: caseId }),
          api.entities.PriorAuthDocument.filter({ case_id: caseId }),
          api.entities.CaseMessage.filter({ case_id: caseId }),
        ]);
        setBranding(bData[0] || null);
        setPaCase(cData[0] || null);
        setDocs(dData);
        setMessages(
          mData.sort(
            (a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
          )
        );
        // Mark messages as read by client
        mData
          .filter((m) => m.sender_role === "staffingly" && !m.read_by_client)
          .forEach((m) => {
            api.entities.CaseMessage.update(m.id, { read_by_client: true });
          });
        setLoading(false);
      })
      .catch(() => api.auth.redirectToLogin());
  }, [caseId]);

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const handleSendMessage = async () => {
    if (!msgInput.trim() || sendingMsg) return;
    setSendingMsg(true);
    const msg = await api.entities.CaseMessage.create({
      case_id: caseId,
      client_id: user.id,
      sender_role: "client",
      sender_id: user.id,
      sender_name: user.full_name || "Client",
      content: msgInput.trim(),
      read_by_client: true,
      read_by_specialist: false,
    });
    setMessages((prev) => [...prev, msg]);
    setMsgInput("");
    setSendingMsg(false);
  };

  const handleFileUpload = async (files) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      await api.entities.PriorAuthDocument.create({
        case_id: caseId,
        document_type: "Client Upload",
        checklist_item_key: "Client Upload",
        file_url,
        file_name: file.name,
        status: "Uploaded",
        uploaded_by: "specialist",
      });
      // Notify via message
      await api.entities.CaseMessage.create({
        case_id: caseId,
        client_id: user.id,
        sender_role: "client",
        sender_id: user.id,
        sender_name: user.full_name || "Client",
        content: `📎 Uploaded document: ${file.name}`,
        read_by_client: true,
        read_by_specialist: false,
      });
    }
    const dData = await api.entities.PriorAuthDocument.filter({ case_id: caseId });
    setDocs(dData);
    setUploading(false);
  };

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

  const accent = branding?.accent_color || "#293682";
  const st = STATUS_STYLES[paCase.status] || STATUS_STYLES["New"];

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
                Case {paCase.case_id || paCase.id?.slice(-6)}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: st.bg, color: st.text }}
              >
                {paCase.status}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {paCase.procedure_name} · {paCase.payer_name}
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
                  const currentIdx = STATUS_ORDER.indexOf(paCase.status);
                  const isDone = i <= currentIdx || paCase.status === "Approved";
                  const isCurrent = status === paCase.status;
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
                            {paCase.updated_date
                              ? new Date(paCase.updated_date).toLocaleDateString()
                              : "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {paCase.status === "Denied" && (
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 bg-red-500">
                      <XCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-semibold text-red-700">Denied</p>
                      {paCase.denial_reason && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Reason: {paCase.denial_reason}
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
                          {doc.file_name || doc.document_type}
                        </p>
                        <p className="text-xs text-slate-400">{doc.document_type}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${doc.status === "Verified" ? "bg-emerald-50 text-emerald-700" : doc.status === "Uploaded" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {doc.status === "Verified"
                          ? "✓ Processed"
                          : doc.status === "Uploaded"
                            ? "Received"
                            : doc.status}
                      </span>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
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
                const isClient = msg.sender_role === "client";
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
                      <p className="leading-relaxed">{msg.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${isClient ? "text-white/60 text-right" : "text-slate-400"}`}
                      >
                        {msg.created_date ? new Date(msg.created_date).toLocaleString() : ""}
                      </p>
                    </div>
                    {isClient && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: "#f6b037" }}
                      >
                        {user?.full_name?.charAt(0) || "C"}
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
            {paCase.status === "Approved" && (
              <div className="bg-white rounded-2xl border-2 border-emerald-300 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-800 text-lg">Authorization Approved</h3>
                    <p className="text-sm text-emerald-700">{paCase.payer_name}</p>
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

            {paCase.status === "Denied" && (
              <div className="bg-white rounded-2xl border-2 border-red-300 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-800 text-lg">Authorization Denied</h3>
                    <p className="text-sm text-red-700">{paCase.payer_name}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {paCase.denial_reason && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                        Denial Reason
                      </p>
                      <p className="text-slate-700">{paCase.denial_reason}</p>
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
                        {paCase.status}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!["Approved", "Denied"].includes(paCase.status) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-600">Outcome Pending</p>
                <p className="text-sm text-slate-400 mt-1">
                  Current status: <strong>{paCase.status}</strong>. We'll notify you when a decision
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
