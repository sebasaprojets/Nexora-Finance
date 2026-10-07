import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Delta } from '@/components/ui/Delta';
import { Sparkline } from '@/components/ui/Sparkline';
import { Tooltip } from '@/components/ui/Tooltip';
import { t } from '@/i18n';

export interface StatCardProps {
  label: string;
  value: number;
  format: (v: number) => string;
  delta?: number | null;
  deltaUnit?: '%' | 'p.p.';
  inverse?: boolean;
  comparison?: ReactNode;
  spark?: number[];
  sparkColor?: string;
  info?: ReactNode;
  icon?: ReactNode;
  className?: string;
  emphasis?: boolean;
}

/** KPI: valor + variação + comparação + mini gráfico + tooltip explicativo. */
export function StatCard({ label, value, format, delta, deltaUnit, inverse, comparison, spark, sparkColor, info, icon, className, emphasis }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn('card group relative flex flex-col overflow-hidden p-4 sm:p-5', emphasis && 'holo', className)}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="grid size-7 place-items-center rounded-lg bg-surface-2 text-fg-muted [&>svg]:size-3.5">{icon}</span>}
        <span className="text-[13px] font-medium text-fg-muted">{label}</span>
        {info && (
          <Tooltip content={info} className="ml-auto">
            <button type="button" className="-m-1.5 rounded-full p-1.5 text-fg-subtle hover:text-fg" aria-label={t('Sobre {label}', { label })}>
              <Info className="size-3.5" />
            </button>
          </Tooltip>
        )}
      </div>
      <AnimatedNumber value={value} format={format} className={cn('tabular mt-2.5 font-display font-semibold tracking-tight', emphasis ? 'text-3xl' : 'text-xl sm:text-2xl')} />
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {delta !== undefined && <Delta value={delta} inverse={inverse} unit={deltaUnit} suffix="" />}
        {comparison && <span className="text-xs text-fg-subtle">{comparison}</span>}
      </div>
      {spark && spark.length > 1 && <Sparkline data={spark} color={sparkColor} className="mt-3 -mb-1" />}
    </motion.div>
  );
}
