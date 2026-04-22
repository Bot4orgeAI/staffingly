import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
import { useAuthUserQuery, useEntityFilterQuery } from "@/lib/query";
import { api } from "@/lib/api";
import {
  canDisputeInvoice,
  getClientId,
  getInvoiceDisputeHoursRemaining,
  normalizeBranding,
  normalizeInvoice,
} from "@/lib/utils/clientPortal";
import { CreditCard, Download, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";

const STATUS_STYLES = {
  PAID: { bg: "#f0fdf4", text: "#15803d", icon: CheckCircle },
  DISPUTE_WINDOW: { bg: "#eff6ff", text: "#1d4ed8", icon: Clock },
  PENDING: { bg: "#e0f2fe", text: "#0369a1", icon: Clock },
  PAYMENT_FAILED: { bg: "#fef2f2", text: "#b91c1c", icon: AlertTriangle },
  DISPUTED: { bg: "#fffbeb", text: "#92400e", icon: AlertTriangle },
  VOIDED: { bg: "#f8fafc", text: "#64748b", icon: Clock },
};

export default function ClientBilling() {
  const [disputingId, setDisputingId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
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
  const { data: invoices = [], isLoading: loadingInvoices } = useEntityFilterQuery(
    "ClientInvoice",
    clientId ? { clientId } : {},
    {
      enabled: Boolean(user),
      select: (data) =>
        data
          .map(normalizeInvoice)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }
  );

  const disputeMutation = useMutation({
    mutationFn: /** @param {Record<string, any>} inv */ (inv) =>
      api.entities.ClientInvoice.update(inv.id, {
        status: "DISPUTED",
        disputeReason,
        disputeStatus: "open",
        disputeOpenedAt: new Date().toISOString(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entity", "ClientInvoice"] });
      setDisputingId(null);
      setDisputeReason("");
    },
  });

  const submitDispute = async (inv) => {
    if (!disputeReason.trim()) return;
    await disputeMutation.mutateAsync(inv);
  };

  const { totalPaid, totalOpen } = useMemo(
    () => ({
      totalPaid: invoices
        .filter((i) => i.statusCode === "PAID")
        .reduce((s, i) => s + (i.totalAmount || 0), 0),
      totalOpen: invoices
        .filter((i) => ["DISPUTE_WINDOW", "PENDING"].includes(i.statusCode))
        .reduce((s, i) => s + (i.totalAmount || 0), 0),
    }),
    [invoices]
  );
  const loading = loadingUser || loadingBranding || loadingInvoices;

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
                const stStyle = STATUS_STYLES[inv.statusCode] || STATUS_STYLES.PENDING;
                const StatusIcon = stStyle.icon;
                const disputeWindow = canDisputeInvoice(inv);
                const hoursRemaining = getInvoiceDisputeHoursRemaining(inv);

                return (
                  <div key={inv.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-800">{inv.invoiceNumber}</p>
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: stStyle.bg, color: stStyle.text }}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {inv.displayStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {inv.billingPeriodStart && inv.billingPeriodEnd
                            ? `${new Date(inv.billingPeriodStart).toLocaleDateString()} — ${new Date(inv.billingPeriodEnd).toLocaleDateString()}`
                            : inv.createdAt
                              ? new Date(inv.createdAt).toLocaleDateString()
                              : "—"}
                        </p>
                        {inv.lineItemsSummary && (
                          <p className="text-xs text-slate-400 mt-0.5">{inv.lineItemsSummary}</p>
                        )}
                        {inv.disputeReason && (
                          <p className="text-xs mt-1 text-amber-700 font-medium">
                            Dispute: {inv.disputeReason} · {inv.disputeStatus || "open"}
                          </p>
                        )}
                        {disputeWindow && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Dispute window closes in {hoursRemaining}h
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className="text-lg font-bold text-slate-800">
                          $
                          {(inv.totalAmount || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        )}
                        {disputeWindow && inv.statusCode !== "DISPUTED" && (
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
