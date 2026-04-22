import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
import { api } from "@/lib/api";
import { useAuthUserQuery, useEntityFilterQuery } from "@/lib/query";
import {
  getAccentColor,
  getClientId,
  normalizeBranding,
  normalizeNotification,
} from "@/lib/utils/clientPortal";
import {
  Bell,
  CheckCircle,
  Loader2,
  MessageSquare,
  FileText,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

const TYPE_CONFIG = {
  case_status_change: { icon: CheckCircle, color: "#293682", bg: "#eef3ff", label: "Case Update" },
  new_message: { icon: MessageSquare, color: "#0a7e87", bg: "#f0fdfa", label: "New Message" },
  document_processed: { icon: FileText, color: "#7c3aed", bg: "#f5f3ff", label: "Document" },
  invoice_available: { icon: CreditCard, color: "#b45309", bg: "#fffbeb", label: "Invoice" },
  invoice_charged: { icon: CreditCard, color: "#15803d", bg: "#f0fdf4", label: "Payment" },
  payment_failed: { icon: AlertTriangle, color: "#b91c1c", bg: "#fef2f2", label: "Payment Failed" },
  general: { icon: Bell, color: "#64748b", bg: "#f8fafc", label: "Notice" },
};

export default function ClientNotifications() {
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
  const { data: notifications = [], isLoading: loadingNotifications } = useEntityFilterQuery(
    "ClientNotification",
    clientId ? { clientId } : {},
    {
      enabled: Boolean(user),
      select: (data) =>
        data
          .map(normalizeNotification)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }
  );

  const markReadMutation = useMutation({
    mutationFn: async (/** @type {string[]} */ ids) =>
      Promise.all(ids.map((id) => api.entities.ClientNotification.update(id, { read: true }))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "ClientNotification"] });
    },
  });

  useEffect(() => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      markReadMutation.mutate(unreadIds);
    }
  }, [notifications]);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markReadMutation.mutateAsync(unreadIds);
    }
  };

  if (loadingUser || loadingBranding || loadingNotifications)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );

  const unread = notifications.filter((n) => !n.read).length;
  const accent = getAccentColor(branding);

  return (
    <ClientPortalLayout
      user={user}
      branding={branding}
      currentPage="client-notifications"
      notifCount={unread}
    >
      <div className="max-w-[700px] mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
            <p className="text-sm text-slate-500 mt-0.5">{unread} unread</p>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm font-semibold"
              style={{ color: accent }}
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <Bell className="w-10 h-10 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500 font-semibold">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
              const NIcon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${n.read ? "bg-white border-slate-200" : "bg-blue-50/50 border-blue-200"}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <NIcon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-sm">{n.title}</p>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    {n.body && <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ClientPortalLayout>
  );
}
