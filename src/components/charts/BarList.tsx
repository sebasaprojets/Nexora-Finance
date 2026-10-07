import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';
import { useMoney } from '@/hooks/useMoney';

export interface BarListItem {
  id: string;
  label: string;
  value: number;
  pct?: number;
  color?: string;
  icon?: ReactNode;
  meta?: ReactNode;
}

/** Ranking em barras horizontais — acessível como lista, valores sempre visíveis. */
export function BarList({ items, onSelect, selected, ranked, max }: { items: BarListItem[]; onSelect?: (id: string) => void; selected?: string | null; ranked?: boolean; max?: number }) {
  const money = useMoney();
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="space-y-1">
      {items.map((it, idx) => {
        const Comp = onSelect ? 'button' : 'div';
        return (
          <li key={it.id}>
            <Comp
              {...(onSelect ? { onClick: () => onSelect(it.id), 'aria-pressed': selected === it.id, type: 'button' as const } : {})}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors',
                onSelect && 'hover:bg-surface-2',
                selected === it.id && 'bg-surface-2',
              )}
            >
              {ranked && <span className="tabular w-5 shrink-0 text-center text-xs font-semibold text-fg-subtle">{idx + 1}</span>}
              {it.icon}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{it.label}</span>
                  <span className="tabular shrink-0 text-sm font-semibold">{money(it.value)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: it.color ?? 'var(--series-net)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(it.value / top) * 100}%` }}
                      transition={{ duration: 0.7, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  {it.pct !== undefined && <span className="tabular w-11 shrink-0 text-right text-xs text-fg-subtle">{formatPercent(it.pct)}</span>}
                </div>
                {it.meta && <div className="mt-1 text-xs text-fg-subtle">{it.meta}</div>}
              </div>
            </Comp>
          </li>
        );
      })}
    </ol>
  );
}
