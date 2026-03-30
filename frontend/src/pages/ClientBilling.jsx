import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
import { CreditCard, Download, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";

const STATUS_STYLES = {
  paid: { bg: "#f0fdf4", text: "#15803d", icon: CheckCircle },
  sent: { bg: "#eff6ff", text: "#1d4ed8", icon: Clock },
  overdue: { bg: "#fef2f2", text: "#b91c1c", icon: AlertTriangle },
  disputed: { bg: "#fffbeb", text: "#92400e", icon: AlertTriangle },
  draft: { bg: "#f8fafc", text: "#64748b", icon: Clock },
};

export default function ClientBilling() {
  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disputingId, setDisputingId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    api.auth
      .me()
      .then(async (u) => {
        setUser(u);
        const [bData, iData] = await Promise.all([
          api.entities.ClientBranding.filter({ client_id: u.id }).catch(() => []),
          api.entities.ClientInvoice.filter({ client_id: u.id }),
        ]);
        setBranding(bData[0] || null);
        setInvoices(
          iData.sort(
            (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
          )
        );
        setLoading(false);
      })
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const canDispute = (inv) => {
    if (!["sent", "overdue"].includes(inv.status)) return false;
    const hours = (Date.now() - new Date(inv.created_date).getTime()) / 3600000;
    return hours <= 24;
  };

  const submitDispute = async (inv) => {
    if (!disputeReason.trim()) return;
    await api.entities.ClientInvoice.update(inv.id, {
      status: "disputed",
      dispute_reason: disputeReason,
      dispute_status: "open",
      dispute_opened_at: new Date().toISOString(),
    });
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === inv.id
          ? { ...i, status: "disputed", dispute_reason: disputeReason, dispute_status: "open" }
          : i
      )
    );
    setDisputingId(null);
    setDisputeReason("");
  };

  const accent = branding?.accent_color || "#293682";
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalOpen = invoices
    .filter((i) => ["sent", "overdue"].includes(i.status))
    .reduce((s, i) => s + (i.total_amount || 0), 0);

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );

  return (
    <ClientPortalLayout user={user} branding={branding} currentPage="client-billing">
      <div className="max-w-[900px] mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your invoice history and payment status</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Total Paid (All Time)
            </p>
            <p className="text-3xl font-bold" style={{ color: "#15803d" }}>
              ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Outstanding Balance
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: totalOpen > 0 ? "#b91c1c" : "#15803d" }}
            >
              ${totalOpen.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Invoices</h3>
          </div>
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              No invoices yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {invoices.map((inv) => {
                const stStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.sent;
                const StatusIcon = stStyle.icon;
                const hoursOld = (Date.now() - new Date(inv.created_date).getTime()) / 3600000;
                const disputeWindow = canDispute(inv);

                return (
                  <div key={inv.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-800">{inv.invoice_number}</p>
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: stStyle.bg, color: stStyle.text }}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {inv.billing_period_start && inv.billing_period_end
                            ? `${new Date(inv.billing_period_start).toLocaleDateString()} — ${new Date(inv.billing_period_end).toLocaleDateString()}`
                            : inv.created_date
                              ? new Date(inv.created_date).toLocaleDateString()
                              : "—"}
                        </p>
                        {inv.line_items_summary && (
                          <p className="text-xs text-slate-400 mt-0.5">{inv.line_items_summary}</p>
                        )}
                        {inv.dispute_reason && (
                          <p className="text-xs mt-1 text-amber-700 font-medium">
                            Dispute: {inv.dispute_reason} · {inv.dispute_status}
                          </p>
                        )}
                        {disputeWindow && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            ⏱ Dispute window closes in {Math.round(24 - hoursOld)}h
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className="text-lg font-bold text-slate-800">
                          $
                          {(inv.total_amount || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        {inv.pdf_url && (
                          <a
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        )}
                        {disputeWindow && inv.status !== "disputed" && (
                          <button
                            onClick={() => setDisputingId(inv.id)}
                            className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            Dispute
                          </button>
                        )}
                      </div>
                    </div>

                    {disputingId === inv.id && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-xs font-bold text-amber-800 mb-2">
                          Describe your dispute reason:
                        </p>
                        <textarea
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          rows={2}
                          placeholder="e.g. Incorrect case count, duplicate charge…"
                          className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs focus:outline-none bg-white"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setDisputingId(null);
                              setDisputeReason("");
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => submitDispute(inv)}
                            disabled={!disputeReason.trim()}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                          >
                            Submit Dispute
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ClientPortalLayout>
  );
}
