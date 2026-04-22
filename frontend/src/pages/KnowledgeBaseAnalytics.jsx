import { useMemo } from "react";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { BookOpen, TrendingUp, AlertTriangle, MessageSquare, Loader2 } from "lucide-react";

const ALLOWED_ROLES = ["super_admin", "staffingly_admin"];

export default function KnowledgeBaseAnalytics() {
  const { data: user } = useAuthUserQuery();
  const canAccess = ALLOWED_ROLES.includes(user?.role);
  const { data: entries = [], isLoading: loadingEntries } = useEntityListQuery(
    "KnowledgeBaseEntry",
    "-access_count",
    500,
    { enabled: canAccess }
  );
  const { data: conversations = [], isLoading: loadingConversations } = useEntityListQuery(
    "ChatbotConversation",
    "-created_date",
    200,
    { enabled: canAccess }
  );
  const loading = loadingEntries || loadingConversations;
  const now = Date.now();
  const thisMonth = entries.filter(
    (e) => e.last_accessed_at && now - new Date(e.last_accessed_at).getTime() < 30 * 24 * 3600000
  );
  const stale90 = entries.filter(
    (e) => !e.last_accessed_at || now - new Date(e.last_accessed_at).getTime() > 90 * 24 * 3600000
  );
  const topAccessed = [...entries]
    .sort((a, b) => (b.access_count || 0) - (a.access_count || 0))
    .slice(0, 10);
  const categorySorted = useMemo(() => {
    const categoryCount = {};
    entries.forEach((e) => {
      categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
    });
    return Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  }, [entries]);
  const totalMessages = conversations.reduce((s, c) => {
    try {
      return s + JSON.parse(c.messages_json || "[]").filter((m) => m.role === "user").length;
    } catch {
      return s;
    }
  }, 0);
  const totalUnanswered = conversations.reduce((s, c) => s + (c.unanswered_count || 0), 0);

  if (!user) return null;
  if (!ALLOWED_ROLES.includes(user.role))
    return (
      <StaffinglyLayout
        user={user}
        currentPage="knowledge-base-analytics"
        title="KB Analytics"
        breadcrumbs={["Knowledge Base", "Analytics"]}
      >
        <div className="text-center p-12 text-slate-400">Access restricted to Admins only.</div>
      </StaffinglyLayout>
    );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="knowledge-base-analytics"
      title="Knowledge Base Analytics"
      breadcrumbs={["Knowledge Base", "Analytics"]}
    >
      <div className="max-w-[1200px] mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Entries",
              value: entries.length,
              icon: BookOpen,
              color: "#293682",
              bg: "#eef3ff",
            },
            {
              label: "Accessed This Month",
              value: thisMonth.length,
              icon: TrendingUp,
              color: "#15803d",
              bg: "#f0fdf4",
            },
            {
              label: "Possibly Outdated (90d+)",
              value: stale90.length,
              icon: AlertTriangle,
              color: "#d97706",
              bg: "#fffbeb",
            },
            {
              label: "Chatbot Sessions",
              value: conversations.length,
              icon: MessageSquare,
              color: "#7c3aed",
              bg: "#f5f3ff",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: s.bg }}
              >
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Accessed Entries */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Most Accessed This Month</h3>
              <p className="text-xs text-slate-400 mt-0.5">Entries specialists rely on most</p>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              </div>
            ) : topAccessed.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No access data yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {topAccessed.map((e, i) => (
                  <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400 w-5 text-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{e.title}</p>
                      <p className="text-xs text-slate-400">
                        {e.category} · {e.client_name}
                      </p>
                    </div>
                    <span
                      className="flex items-center gap-1 text-xs font-bold"
                      style={{ color: "#293682" }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {e.access_count || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Possibly Outdated */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Possibly Outdated Entries</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Not accessed in 90+ days — may need review
              </p>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              </div>
            ) : stale90.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                All entries accessed recently. ✓
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {stale90.slice(0, 15).map((e) => (
                  <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{e.title}</p>
                      <p className="text-xs text-slate-400">
                        {e.category} · {e.client_name}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {e.last_accessed_at
                        ? new Date(e.last_accessed_at).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4">Entries by Category</h3>
          <div className="space-y-3">
            {categorySorted.map(([cat, count]) => {
              const pct = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 w-40 truncate flex-shrink-0">
                    {cat}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: "#293682" }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chatbot Usage */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-1">AI Chatbot Usage (Anonymized)</h3>
          <p className="text-xs text-slate-400 mb-4">
            Session totals only — no PII stored in analytics view.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold" style={{ color: "#293682" }}>
                {conversations.length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Total Sessions</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold" style={{ color: "#15803d" }}>
                {totalMessages}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Questions Asked</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50">
              <p className="text-2xl font-bold text-amber-600">{totalUnanswered}</p>
              <p className="text-xs text-slate-500 mt-0.5">Unanswered (KB Gaps)</p>
            </div>
          </div>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
