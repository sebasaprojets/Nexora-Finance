import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { dailyActivity, quantileThresholds, type DayActivity } from '@/lib/finance';
import { WEEKDAYS_SHORT, daysInMonth, today } from '@/lib/dates';
import type { Transaction } from '@/types';
import { useMoney } from '@/hooks/useMoney';
import { t } from '@/i18n';

export const HEAT_LEVELS = [
  { label: 'Sem gastos', color: 'var(--heat-0)' },
  { label: 'Gasto baixo', color: 'var(--heat-1)' },
  { label: 'Gasto médio', color: 'var(--heat-2)' },
  { label: 'Gasto alto', color: 'var(--heat-3)' },
  { label: 'Gasto muito alto', color: 'var(--heat-4)' },
];

/** Calendário-heatmap de gastos diários (escala sequencial azul, níveis por quartil). */
export function HeatmapCalendar({
  month,
  transactions,
  selected,
  onSelect,
}: {
  month: string;
  transactions: Transaction[];
  selected: string | null;
  onSelect: (date: string, activity?: DayActivity) => void;
}) {
  const money = useMoney();
  const [y, m] = month.split('-').map(Number);
  const total = daysInMonth(y, m);
  const from = `${month}-01`;
  const to = `${month}-${String(total).padStart(2, '0')}`;
  const activity = useMemo(() => dailyActivity(transactions, { from, to }), [transactions, from, to]);
  const thresholds = useMemo(() => quantileThresholds([...activity.values()].map((a) => a.expense)), [activity]);
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const ref = today();

  const level = (v: number) => (v <= 0 ? 0 : v <= thresholds[0] ? 1 : v <= thresholds[1] ? 2 : v <= thresholds[2] ? 3 : 4);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-fg-subtle" aria-hidden>
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d}>{t(d)}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5" role="grid" aria-label={t('Calendário de gastos')}>
        {Array.from({ length: offset }, (_, i) => (
          <span key={`e${i}`} aria-hidden />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          const a = activity.get(date);
          const lv = level(a?.expense ?? 0);
          const future = date > ref;
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              disabled={future}
              aria-selected={selected === date}
              aria-label={a ? t('{dia}: despesas {despesas}, receitas {receitas} — {nivel}', { dia: i + 1, despesas: money(a.expense), receitas: money(a.income), nivel: t(HEAT_LEVELS[lv].label) }) : t('{dia}: sem movimentação — {nivel}', { dia: i + 1, nivel: t(HEAT_LEVELS[lv].label) })}
              onClick={() => onSelect(date, a)}
              className={cn(
                'relative aspect-square rounded-lg text-[11px] font-medium transition-transform hover:scale-105 disabled:opacity-30 disabled:hover:scale-100',
                selected === date && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
                lv >= 3 ? 'text-white' : 'text-fg-muted',
              )}
              style={{ background: HEAT_LEVELS[lv].color }}
            >
              {i + 1}
              {a && a.income > 0 && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--series-income)] ring-1 ring-surface" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-subtle">
        {HEAT_LEVELS.slice(1).map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="size-2.5 rounded" style={{ background: l.color }} aria-hidden /> {t(l.label)}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[var(--series-income)]" aria-hidden /> {t('Dia com receita')}
        </span>
      </div>
    </div>
  );
}
