import { CalendarRange } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import { t } from '@/i18n';
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
    <div data-tour="period" className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
      {/* Celular: uma linha só, rolável para o lado. */}
      <div role="radiogroup" aria-label={t('Período')} className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
        {presets.map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={preset === p}
            onClick={() => onPreset(p)}
            className={cn(
              'flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors [&>svg]:size-3.5',
              preset === p ? 'border-primary bg-primary-soft text-fg' : 'border-border bg-surface-2/60 text-fg-muted',
            )}
          >
            {p === 'custom' && <CalendarRange aria-hidden />}
            {p === 'custom' ? t('Datas') : t(PERIOD_LABELS[p])}
          </button>
        ))}
      </div>
      <Segmented
        label={t('Período')}
        size="sm"
        value={preset}
        onChange={onPreset}
        className="hidden sm:inline-flex"
        options={presets.map((p) => ({ value: p, label: t(PERIOD_LABELS[p]), icon: p === 'custom' ? <CalendarRange /> : undefined }))}
      />
      {preset === 'custom' && (
        <div className="flex w-full items-center gap-1.5 text-xs sm:w-auto">
          <input type="date" aria-label={t('Data inicial')} value={custom.from} max={custom.to} onChange={(e) => e.target.value && onCustom({ ...custom, from: e.target.value })} className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-2/60 px-2 text-fg outline-none focus:border-primary sm:h-8 sm:flex-none" />
          <span className="text-fg-subtle">{t('até')}</span>
          <input type="date" aria-label={t('Data final')} value={custom.to} min={custom.from} onChange={(e) => e.target.value && onCustom({ ...custom, to: e.target.value })} className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-2/60 px-2 text-fg outline-none focus:border-primary sm:h-8 sm:flex-none" />
        </div>
      )}
    </div>
  );
}
