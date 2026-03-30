import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { MessageSquare, X, Send, Loader2, Bot, RotateCcw, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SESSION_KEY = "staffingly_chat_session";
const MESSAGES_KEY = "staffingly_chat_messages";

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function usePersistedMessages() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(MESSAGES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addMessage = useCallback((msg) => {
    setMessages((prev) => {
      const next = [...prev, { ...msg, timestamp: new Date().toISOString() }];
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(MESSAGES_KEY);
  }, []);

  return { messages, addMessage, clearMessages };
}

export default function AIChatbot({
  user,
  contextType = "general",
  contextData = null,
  clientData = null,
  payerRules = [],
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { messages, addMessage, clearMessages } = usePersistedMessages();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, messages]);

  const buildSystemPrompt = useCallback(async () => {
    const roleLabel =
      {
        super_admin: "Super Admin",
        finance_admin: "Finance Admin",
        staffingly_admin: "Staffingly Admin",
        staffingly_supervisor: "Supervisor",
        staffingly_specialist: "Specialist",
        client_user: "Client User",
      }[user?.role] || "Staff";

    let ctx = `You are Staffingly AI, an intelligent assistant for StaffAuth — a medical prior authorization platform.

CURRENT USER:
- Name: ${user?.full_name || "Staff Member"}
- Role: ${roleLabel}
- Email: ${user?.email}

CRITICAL RULES:
1. NEVER reveal data from other clients. Only discuss the current context client.
2. NEVER make final clinical determinations. Always recommend specialist or supervisor review for clinical decisions.
3. Keep answers concise, actionable, and practical.
4. If you cannot answer accurately, say so clearly and suggest who to contact (supervisor, payer directly, etc.).
5. Always cite which knowledge base entry or source you're drawing from.
6. Do not fabricate payer rules, deadlines, or clinical criteria.
`;

    if (contextType === "case" && contextData) {
      ctx += `
CURRENT CASE CONTEXT:
- Case ID: ${contextData.case_id || contextData.id?.slice(-6)}
- Patient: ${contextData.patient_initials}
- DOB: ${contextData.patient_dob || "N/A"}
- Payer: ${contextData.payer_name} (ID: ${contextData.payer_id || "N/A"})
- Procedure: ${contextData.procedure_name} (CPT: ${contextData.cpt_code || "N/A"})
- Diagnosis Codes: ${(contextData.diagnosis_codes || []).join(", ") || "N/A"}
- Status: ${contextData.status}
- Urgency: ${contextData.urgency}
- Physician: ${contextData.ordering_physician_name || "N/A"} (NPI: ${contextData.ordering_physician_npi || "N/A"})
- Facility: ${contextData.facility_name || "N/A"}
- Assigned Specialist: ${contextData.assigned_specialist_name || "N/A"}
- Intake Notes: ${contextData.intake_notes || "None"}
- AI Confidence: ${contextData.ai_confidence_score != null ? contextData.ai_confidence_score + "%" : "Not reviewed"}
- Submission Method: ${contextData.submission_method || "Not set"}
- Confirmation #: ${contextData.confirmation_number || "Not submitted"}
`;
    }

    if (contextType === "client" && clientData) {
      ctx += `
CURRENT CLIENT CONTEXT:
- Practice: ${clientData.practice_name}
- NPI: ${clientData.npi || "N/A"}
- Storage: ${clientData.cloud_storage_type || "None"}
- EMR: ${clientData.emr_system || "N/A"}
`;
    }

    // Load knowledge base for the relevant client
    const clientId = contextData?.client_id || clientData?.id || null;
    if (clientId) {
      try {
        const kb = await api.entities.KnowledgeBaseEntry.filter({ client_id: clientId });
        const visibleKb = kb.filter((e) => e.category !== "Payroll and Finance");
        if (visibleKb.length > 0) {
          ctx += `\nCLIENT KNOWLEDGE BASE (${visibleKb.length} entries):\n`;
          visibleKb.forEach((e, i) => {
            ctx += `\n[KB-${i + 1}] "${e.title}" (${e.category})\n${e.content}\nTags: ${(e.tags || []).join(", ") || "none"}\n`;
          });
        }
      } catch {}
    }

    // Relevant payer rules
    if (payerRules.length > 0) {
      const relevantPayer = payerRules.find(
        (p) => p.payer_name?.toLowerCase() === contextData?.payer_name?.toLowerCase()
      );
      if (relevantPayer) {
        ctx += `
PAYER RULES — ${relevantPayer.payer_name}:
- Portal: ${relevantPayer.portal_url || "N/A"}
- Phone: ${relevantPayer.phone_number || "N/A"}
- Fax: ${relevantPayer.fax_number || "N/A"}
- Prior Auth CPT codes: ${(relevantPayer.prior_auth_cpt_codes || []).join(", ") || "N/A"}
- Avg Turnaround: ${relevantPayer.average_turnaround_days || "N/A"} days
- Appeal Deadline: ${relevantPayer.appeal_deadline_days || "N/A"} days
- P2P Process: ${relevantPayer.peer_to_peer_process || "N/A"}
- Notes: ${relevantPayer.notes || "None"}
`;
      }
    }

    ctx += `\nSOPs: Always recommend supervisor approval before submitting contested cases. Always verify eligibility before initiating PA. For urgent cases prioritize same-day submission. Log all payer communications.`;
    return ctx;
  }, [user, contextType, contextData, clientData, payerRules]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    addMessage({ role: "user", content: text });
    setLoading(true);

    try {
      const systemPrompt = await buildSystemPrompt();
      const historyForPrompt = messages
        .slice(-10)
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");

      const response = await api.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}

CONVERSATION HISTORY:
${historyForPrompt}

User: ${text}

Assistant (be concise, cite sources when using knowledge base, never fabricate clinical facts):`,
      });

      addMessage({ role: "assistant", content: response });

      // Log conversation
      const sessionId = getSessionId();
      try {
        const existing = await api.entities.ChatbotConversation.filter({ session_id: sessionId });
        const allMsgs = [
          ...messages,
          { role: "user", content: text },
          { role: "assistant", content: response },
        ];
        if (existing.length > 0) {
          await api.entities.ChatbotConversation.update(existing[0].id, {
            messages_json: JSON.stringify(allMsgs.slice(-50)),
            context_type: contextType,
            context_id: contextData?.id || clientData?.id || null,
          });
        } else {
          await api.entities.ChatbotConversation.create({
            user_id: user?.id || user?.email,
            user_role: user?.role,
            session_id: sessionId,
            context_type: contextType,
            context_id: contextData?.id || clientData?.id || null,
            context_label: contextData?.case_id || clientData?.practice_name || "General",
            messages_json: JSON.stringify(allMsgs.slice(-50)),
          });
        }
      } catch {}
    } catch (err) {
      addMessage({
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again or contact your supervisor if the issue persists.",
      });
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const contextLabel =
    contextType === "case"
      ? `Case ${contextData?.case_id || contextData?.id?.slice(-6)}`
      : contextType === "client"
        ? clientData?.practice_name
        : "General";

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#f6b037" }}
        title="Ask Staffingly AI"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 flex flex-col rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden"
          style={{ width: "min(400px, calc(33vw + 40px))", height: "min(580px, 70vh)" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0"
            style={{ backgroundColor: "#293682" }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#f6b037" }}
            >
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Staffingly AI</p>
              <p className="text-[11px] text-blue-200 truncate">{contextLabel}</p>
            </div>
            <button
              onClick={clearMessages}
              title="Clear conversation"
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-200" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-blue-200" />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ backgroundColor: "#f8fafc" }}
          >
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: "#eef3ff" }}
                >
                  <Bot className="w-6 h-6" style={{ color: "#293682" }} />
                </div>
                <p className="font-semibold text-slate-700 text-sm">Hi, I'm Staffingly AI</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                  Ask me about this case, payer rules, documentation requirements, or prior auth
                  processes.
                </p>
                <div className="mt-4 space-y-2">
                  {[
                    "What's missing for Aetna submission?",
                    "What's the appeal deadline for this payer?",
                    "How do I submit a peer-to-peer request?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        inputRef.current?.focus();
                      }}
                      className="block w-full text-left text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#293682] hover:text-[#293682] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "#eef3ff" }}
                  >
                    <Bot className="w-3.5 h-3.5" style={{ color: "#293682" }} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                  }`}
                  style={msg.role === "user" ? { backgroundColor: "#293682" } : {}}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown className="prose prose-xs prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-xs leading-relaxed">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-xs leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold"
                    style={{ backgroundColor: "#f6b037" }}
                  >
                    {user?.full_name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#eef3ff" }}
                >
                  <Bot className="w-3.5 h-3.5" style={{ color: "#293682" }} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: "#293682", animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 flex-shrink-0 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about this case, payer rules, SOPs…"
                rows={1}
                className="flex-1 resize-none px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#293682]/30 max-h-24 overflow-y-auto"
                style={{ lineHeight: "1.4" }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all flex-shrink-0"
                style={{ backgroundColor: "#f6b037" }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              AI may make mistakes. Verify clinical decisions with a supervisor.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
