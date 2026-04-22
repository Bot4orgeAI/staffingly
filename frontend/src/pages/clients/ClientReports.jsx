import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ClientPortalLayout from "@/components/portal/ClientPortalLayout";
import {
  getAccentColor,
  getClientId,
  getPracticeName,
  normalizeBranding,
  normalizeCase,
} from "@/lib/utils/clientPortal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Download, Loader2, BarChart2 } from "lucide-react";

const COLORS = ["#293682", "#0a7e87", "#f6b037", "#b91c1c", "#15803d", "#7c3aed"];

export default function ClientReports() {
  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.auth
      .me()
      .then(async (u) => {
        setUser(u);
        const clientId = getClientId(u);
        const [bData, cData] = await Promise.all([
          clientId ? api.entities.ClientBranding.filter({ clientId }).catch(() => []) : [],
          api.entities.PriorAuthCase.filter(clientId ? { clientId } : {}),
        ]);
        setBranding(normalizeBranding(bData[0] || null));
        setCases(cData.map(normalizeCase));
        setLoading(false);
      })
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const accent = getAccentColor(branding);
  const practiceName = getPracticeName(user, branding);

  // Monthly approval rates (last 6 months)
  const monthlyData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const monthCases = cases.filter((c) => {
        const cd = new Date(c.createdAt);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      });
      const approved = monthCases.filter((c) => c.displayStatus === "Approved").length;
      months.push({
        month: label,
        total: monthCases.length,
        approved,
        rate: monthCases.length > 0 ? Math.round((approved / monthCases.length) * 100) : 0,
      });
    }
    return months;
  })();

  // Denial reasons
  const denialReasons = {};
  cases
    .filter((c) => c.displayStatus === "Denied" && c.denialReason)
    .forEach((c) => {
      const r = c.denialReason.length > 30 ? c.denialReason.slice(0, 30) + "…" : c.denialReason;
      denialReasons[r] = (denialReasons[r] || 0) + 1;
    });
  const denialData = Object.entries(denialReasons)
    .map(([name, value]) => ({ name, value }))
    .slice(0, 5);

  // Cases by procedure
  const procedureCounts = {};
  cases.forEach((c) => {
    const p = c.procedureLabel || "Unknown";
    procedureCounts[p] = (procedureCounts[p] || 0) + 1;
  });
  const procedureData = Object.entries(procedureCounts)
    .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + "…" : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Avg turnaround by payer (submitted → decision)
  const payerTurnaround = {};
  cases
    .filter((c) => c.submittedAt && (c.displayStatus === "Approved" || c.displayStatus === "Denied"))
    .forEach((c) => {
      const days = Math.round(
        (new Date(c.updatedAt).getTime() - new Date(c.submittedAt).getTime()) / 86400000
      );
      if (!payerTurnaround[c.payerName]) payerTurnaround[c.payerName] = { total: 0, count: 0 };
      payerTurnaround[c.payerName].total += days;
      payerTurnaround[c.payerName].count += 1;
    });
  const turnaroundData = Object.entries(payerTurnaround)
    .map(([payer, d]) => ({
      payer: payer.length > 15 ? payer.slice(0, 15) + "…" : payer,
      days: Math.round(d.total / d.count),
    }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  const handleExportPDF = async () => {
    setGenerating(true);
    const approved = cases.filter((c) => c.displayStatus === "Approved").length;
    const denied = cases.filter((c) => c.displayStatus === "Denied").length;
    const total = cases.length;
    const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const content = `
      <h1>${practiceName} Prior Authorization Report</h1>
      <p>Generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr><th>Metric</th><th>Value</th></tr>
        </thead>
        <tbody>
          <tr><td>Total cases</td><td>${total}</td></tr>
          <tr><td>Approved</td><td>${approved}</td></tr>
          <tr><td>Denied</td><td>${denied}</td></tr>
          <tr><td>Approval rate</td><td>${rate}%</td></tr>
          <tr><td>In progress</td><td>${total - approved - denied}</td></tr>
        </tbody>
      </table>
      <h2>Monthly Approval Trends</h2>
      <table>
        <thead>
          <tr><th>Month</th><th>Total</th><th>Approved</th><th>Approval Rate</th></tr>
        </thead>
        <tbody>
          ${monthlyData
            .map(
              (row) =>
                `<tr><td>${row.month}</td><td>${row.total}</td><td>${row.approved}</td><td>${row.rate}%</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
      <h2>Top Denial Reasons</h2>
      <table>
        <thead>
          <tr><th>Reason</th><th>Count</th></tr>
        </thead>
        <tbody>
          ${
            denialData.length > 0
              ? denialData.map((row) => `<tr><td>${row.name}</td><td>${row.value}</td></tr>`).join("")
              : '<tr><td colspan="2">No denials recorded</td></tr>'
          }
        </tbody>
      </table>
      <h2>Procedure Mix</h2>
      <table>
        <thead>
          <tr><th>Procedure</th><th>Count</th></tr>
        </thead>
        <tbody>
          ${procedureData.map((row) => `<tr><td>${row.name}</td><td>${row.value}</td></tr>`).join("")}
        </tbody>
      </table>
      <h2>Average Turnaround by Payer</h2>
      <table>
        <thead>
          <tr><th>Payer</th><th>Days</th></tr>
        </thead>
        <tbody>
          ${
            turnaroundData.length > 0
              ? turnaroundData.map((row) => `<tr><td>${row.payer}</td><td>${row.days}</td></tr>`).join("")
              : '<tr><td colspan="2">Not enough decision data yet</td></tr>'
          }
        </tbody>
      </table>
      <footer>Powered by Staffingly.AI</footer>
    `;

    const blob = new Blob(
      [
        `<html><head><style>body{font-family:sans-serif;padding:40px;color:#1e293b}h1{color:#293682}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:8px;border:1px solid #e2e8f0;text-align:left}th{background:#f8fafc;font-weight:600}footer{margin-top:40px;color:#94a3b8;font-size:12px}</style></head><body>${content}</body></html>`,
      ],
      { type: "text/html" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${practiceName.replace(/\s+/g, "_")}_PA_Report_${new Date().toLocaleDateString().replace(/\//g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setGenerating(false);
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

  return (
    <ClientPortalLayout user={user} branding={branding} currentPage="client-reports">
      <div className="max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Your prior authorization performance data
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={generating || cases.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generating ? "Generating…" : "Export Report"}
          </button>
        </div>

        {cases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
            <BarChart2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-semibold">No case data yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Reports will appear once your first cases are created.
            </p>
          </div>
        ) : (
          <>
            {/* Monthly Approval Rate */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-4">Monthly Approval Rate</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v, n) => [
                      v,
                      n === "rate" ? "Approval %" : n === "approved" ? "Approved" : "Total",
                    ]}
                  />
                  <Bar dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="approved" fill={accent} radius={[4, 4, 0, 0]} name="Approved" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Cases by Procedure */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 mb-4">Cases by Procedure</h3>
                {procedureData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={procedureData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {procedureData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No data</p>
                )}
              </div>

              {/* Denial Reasons */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 mb-4">Common Denial Reasons</h3>
                {denialData.length > 0 ? (
                  <div className="space-y-3">
                    {denialData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <p className="text-xs text-slate-600 flex-1 truncate">{d.name}</p>
                        <span className="text-xs font-bold text-slate-700">{d.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No denied cases</p>
                )}
              </div>
            </div>

            {/* Avg Turnaround by Payer */}
            {turnaroundData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 mb-4">
                  Average Turnaround by Payer (days)
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={turnaroundData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis
                      type="category"
                      dataKey="payer"
                      width={100}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <Tooltip formatter={(v) => [`${v} days`, "Avg Turnaround"]} />
                    <Bar dataKey="days" fill="#0a7e87" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </ClientPortalLayout>
  );
}
