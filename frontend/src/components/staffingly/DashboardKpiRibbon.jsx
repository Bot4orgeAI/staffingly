import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

function DeltaBadge({ delta, direction = "flat", suffix = "" }) {
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const tone =
    direction === "up"
      ? "text-emerald-600 bg-emerald-50"
      : direction === "down"
        ? "text-red-600 bg-red-50"
        : "text-slate-500 bg-slate-100";

  const absoluteValue = Math.abs(delta || 0);
  const displayValue =
    suffix === "%"
      ? `${absoluteValue.toFixed(1)}${suffix}`
      : suffix === "s"
        ? `${absoluteValue.toFixed(1)}${suffix}`
        : `${Math.round(absoluteValue)}${suffix}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {direction === "up" ? "+" : direction === "down" ? "-" : ""}
      {displayValue}
    </span>
  );
}

export default function DashboardKpiRibbon({ metrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: metric.bg }}
            >
              <metric.icon className="h-5 w-5" style={{ color: metric.color }} />
            </div>
            <DeltaBadge
              delta={metric.delta}
              direction={metric.direction}
              suffix={metric.deltaSuffix}
            />
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {metric.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{metric.value}</p>
            <p className="mt-2 text-xs text-slate-500">{metric.helper}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
