import { CalendarRange, Building2, ShieldCheck } from "lucide-react";
import AppSelect from "@/components/ui/app-select";

export default function DashboardFilterBar({
  range,
  onRangeChange,
  clientFilter,
  onClientFilterChange,
  payerFilter,
  onPayerFilterChange,
  dateRangeOptions,
  clientOptions,
  payerOptions,
  hideClientFilter = false,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Command Center Filters
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Operational dashboard scope</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <CalendarRange className="h-3.5 w-3.5" />
              Date range
            </label>
            <AppSelect
              value={range}
              onValueChange={onRangeChange}
              options={dateRangeOptions}
              triggerClassName="h-10 min-w-[180px] rounded-xl text-sm"
            />
          </div>

          {!hideClientFilter ? (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                Organization
              </label>
              <AppSelect
                value={clientFilter}
                onValueChange={onClientFilterChange}
                options={clientOptions}
                triggerClassName="h-10 min-w-[210px] rounded-xl text-sm"
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Payer
            </label>
            <AppSelect
              value={payerFilter}
              onValueChange={onPayerFilterChange}
              options={payerOptions}
              triggerClassName="h-10 min-w-[200px] rounded-xl text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
