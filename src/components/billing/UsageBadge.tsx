import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePlan } from '@/hooks/usePlan';
import { RESOURCE_LABEL, type LimitedResource } from '@/lib/plans';
import { cn } from '@/lib/cn';

/** Contador "2/3" do plano Grátis ao lado do botão de criar (some no Pro). */
export function UsageBadge({ resource, className }: { resource: LimitedResource; className?: string }) {
  const { pro, usage } = usePlan();
  if (pro) return null;
  const { used, limit } = usage(resource);
  const full = used >= limit;
  return (
    <Tooltip content={t('Plano Grátis: {used} de {limit} em {resource}. Toque para ver os planos.', { used, limit, resource: t(RESOURCE_LABEL[resource]).toLowerCase() })}>
      <Link
        to="/app/plano"
        aria-label={t('Uso do plano: {used} de {limit}', { used, limit })}
        className={cn(
          'tabular inline-flex h-8 items-center rounded-full border px-2.5 text-xs font-semibold transition-colors',
          full ? 'border-warning/40 bg-warning-soft text-warning' : 'border-border bg-surface-2/60 text-fg-muted hover:text-fg',
          className,
        )}
      >
        {used}/{limit}
      </Link>
    </Tooltip>
  );
}
