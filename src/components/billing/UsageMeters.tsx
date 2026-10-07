import { t } from '@/i18n';
import { Progress } from '@/components/ui/Progress';
import { usePlan } from '@/hooks/usePlan';
import { FREE_LIMITS, RESOURCE_LABEL, type LimitedResource } from '@/lib/plans';

const ORDER = Object.keys(FREE_LIMITS) as LimitedResource[];

/** Quanto do plano Grátis já foi usado, recurso por recurso. */
export function UsageMeters() {
  const { usage } = usePlan();
  return (
    <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {ORDER.map((r) => {
        const { used, limit } = usage(r);
        const pct = Math.min(100, (used / limit) * 100);
        const full = used >= limit;
        return (
          <li key={r}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-fg-muted">{t(RESOURCE_LABEL[r])}</span>
              <span className={full ? 'tabular font-semibold text-warning' : 'tabular font-medium'}>{t('{used} de {limit}', { used, limit })}</span>
            </div>
            <Progress value={pct} size="sm" color={full ? 'var(--warning)' : pct >= 70 ? 'var(--series-2)' : 'var(--primary)'} label={t(RESOURCE_LABEL[r])} />
          </li>
        );
      })}
    </ul>
  );
}
