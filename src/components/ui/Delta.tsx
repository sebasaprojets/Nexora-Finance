import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';

/**
 * Variação percentual com ícone + texto (nunca só cor).
 * `inverse`: para despesas, subir é ruim.
 */
export function Delta({ value, inverse, className, suffix = 'vs. anterior', unit = '%' }: { value: number | null; inverse?: boolean; className?: string; suffix?: string; unit?: '%' | 'p.p.' }) {
  if (value === null || !Number.isFinite(value))
    return <span className={cn('text-xs text-fg-subtle', className)}>Sem base de comparação</span>;
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const good = flat ? null : inverse ? !up : up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const text = unit === '%' ? formatPercent(value, 1, true) : `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')} p.p.`;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular',
          good === null ? 'bg-surface-2 text-fg-muted' : good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
        )}
      >
        <Icon className="size-3" aria-hidden />
        {text}
      </span>
      {suffix && <span className="text-fg-subtle">{suffix}</span>}
    </span>
  );
}
