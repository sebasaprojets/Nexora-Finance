import type { ReactNode } from 'react';
import { t } from '@/i18n';

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Caixa de tooltip padrão dos gráficos (texto em tinta neutra; cor só no marcador). */
export function ChartTooltipBox({ title, rows, footer }: { title: ReactNode; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className="min-w-44 rounded-xl border border-border bg-bg-elevated/95 px-3 py-2.5 text-xs shadow-lg backdrop-blur">
      <p className="mb-1.5 font-medium text-fg">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} aria-hidden />}
            <span className="text-fg-subtle">{r.label}</span>
            <span className="tabular ml-auto pl-4 font-medium text-fg">{r.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-fg-subtle">{footer}</div>}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label={t('Legenda')}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-3.5 rounded-full"
            style={i.dashed ? { backgroundImage: `linear-gradient(90deg, ${i.color} 50%, transparent 50%)`, backgroundSize: '5px 2px' } : { background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-axis)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;
