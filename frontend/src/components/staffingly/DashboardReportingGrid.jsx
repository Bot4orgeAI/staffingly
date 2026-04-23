import { Link } from "react-router-dom";
import {
  BarChart3,
  Clock3,
  ExternalLink,
  LineChart as LineChartIcon,
  TriangleAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createPageUrl } from "@/lib/utils/page";

const HEATMAP_BUCKETS = ["Night", "Morning", "Afternoon", "Evening"];
const HEATMAP_COLORS = ["#eff6ff", "#bfdbfe", "#60a5fa", "#1d4ed8"];
const BAR_COLORS = ["#293682", "#0a7e87", "#f6b037", "#dc2626", "#7c3aed", "#475569"];

function formatTooltipValue(value, name) {
  if (name === "verifications" || name === "exceptions") {
    return [value, name === "verifications" ? "Verifications" : "Exceptions"];
  }

  return [value, name];
}

function getHeatColor(value, maxValue) {
  if (!value || !maxValue) return HEATMAP_COLORS[0];
  const ratio = value / maxValue;
  if (ratio >= 0.85) return HEATMAP_COLORS[3];
  if (ratio >= 0.55) return HEATMAP_COLORS[2];
  if (ratio >= 0.25) return HEATMAP_COLORS[1];
  return HEATMAP_COLORS[0];
}

export default function DashboardReportingGrid({
  volumeTrend,
  heatmapRows,
  denialReasons,
  exceptionQueue,
}) {
  const maxHeatValue = Math.max(
    0,
    ...heatmapRows.flatMap((row) => HEATMAP_BUCKETS.map((bucket) => row[bucket] || 0))
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-[#eef3ff] p-2.5">
              <LineChartIcon className="h-4.5 w-4.5 text-[#293682]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Verification volume trend</h3>
              <p className="mt-1 text-sm text-slate-500">
                Daily verification activity with exception pressure over the same period.
              </p>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={formatTooltipValue} />
                <Line
                  type="monotone"
                  dataKey="verifications"
                  stroke="#293682"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="exceptions"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="6 6"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-[#eefaf9] p-2.5">
              <Clock3 className="h-4.5 w-4.5 text-[#0a7e87]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Payer response heatmap</h3>
              <p className="mt-1 text-sm text-slate-500">
                Average response time by payer and time-of-day bucket.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid grid-cols-[1.15fr_repeat(4,minmax(0,1fr))] gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <div>Payer</div>
                {HEATMAP_BUCKETS.map((bucket) => (
                  <div key={bucket} className="text-center">
                    {bucket}
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                {heatmapRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                    No response-time data in the selected range.
                  </div>
                ) : (
                  heatmapRows.map((row) => (
                    <div
                      key={row.payer}
                      className="grid grid-cols-[1.15fr_repeat(4,minmax(0,1fr))] gap-2"
                    >
                      <div className="flex items-center rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                        {row.payer}
                      </div>
                      {HEATMAP_BUCKETS.map((bucket) => {
                        const value = row[bucket];
                        return (
                          <div
                            key={`${row.payer}-${bucket}`}
                            className="flex min-h-[56px] items-center justify-center rounded-xl text-xs font-bold"
                            style={{
                              backgroundColor: getHeatColor(value, maxHeatValue),
                              color:
                                value && value / Math.max(maxHeatValue, 1) >= 0.55
                                  ? "#ffffff"
                                  : "#1e293b",
                            }}
                            title={value ? `${value.toFixed(1)} seconds` : "No checks"}
                          >
                            {value ? `${value.toFixed(1)}s` : "--"}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-[#fff8e8] p-2.5">
              <BarChart3 className="h-4.5 w-4.5 text-[#f6b037]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Denial reasons breakdown</h3>
              <p className="mt-1 text-sm text-slate-500">
                Most common causes behind flagged or denial-risk verifications.
              </p>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={denialReasons} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                  {denialReasons.map((entry, index) => (
                    <Cell key={entry.label} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#fef2f2] p-2.5">
                <TriangleAlert className="h-4.5 w-4.5 text-[#dc2626]" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Live exception queue</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Verifications waiting for a human action or a retry path.
                </p>
              </div>
            </div>
            <Link
              to={createPageUrl("review-queue")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Open queue
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Patient
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Payer
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Error type
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Waiting
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exceptionQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-400">
                      No exceptions in the selected range.
                    </td>
                  </tr>
                ) : (
                  exceptionQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{item.patient}</div>
                        <div className="mt-1 text-xs text-slate-400">{item.client}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{item.payer}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {item.errorType}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{item.waiting}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={createPageUrl("review-queue")}
                            className="rounded-xl bg-[#293682] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                          >
                            Review
                          </Link>
                          <Link
                            to={createPageUrl("eligibility-history")}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            History
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
