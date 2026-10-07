import { CalendarRange } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { PERIOD_LABELS, type Period, type PeriodPreset } from '@/lib/finance';

const PRESETS: PeriodPreset[] = ['7d', '30d', '3m', '6m', '1y', 'custom'];

export function PeriodFilter({
  preset,
  onPreset,
  custom,
  onCustom,
  presets = PRESETS,
}: {
  preset: PeriodPreset;
  onPreset: (p: PeriodPreset) => void;
  custom: Period;
  onCustom: (p: Period) => void;
  presets?: PeriodPreset[];
}) {
  return (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
      <Segmented
        label="Período"
        size="sm"
        value={preset}
        onChange={onPreset}
        options={presets.map((p) => ({ value: p, label: PERIOD_LABELS[p], icon: p === 'custom' ? <CalendarRange /> : undefined }))}
      />
      {preset === 'custom' && (
        <div className="flex items-center gap-1.5 text-xs">
          <input type="date" aria-label="Data inicial" value={custom.from} max={custom.to} onChange={(e) => e.target.value && onCustom({ ...custom, from: e.target.value })} className="h-8 rounded-lg border border-border bg-surface-2/60 px-2 text-fg outline-none focus:border-primary" />
          <span className="text-fg-subtle">até</span>
          <input type="date" aria-label="Data final" value={custom.to} min={custom.from} onChange={(e) => e.target.value && onCustom({ ...custom, to: e.target.value })} className="h-8 rounded-lg border border-border bg-surface-2/60 px-2 text-fg outline-none focus:border-primary" />
        </div>
      )}
    </div>
  );
}
