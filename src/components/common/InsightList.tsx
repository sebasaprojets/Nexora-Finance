import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import type { Insight } from '@/lib/insights';
import { cn } from '@/lib/cn';

const toneStyle = {
  positive: { icon: TrendingUp, cls: 'bg-success-soft text-success', label: 'Positivo' },
  negative: { icon: TrendingDown, cls: 'bg-danger-soft text-danger', label: 'Atenção' },
  warning: { icon: AlertTriangle, cls: 'bg-warning-soft text-warning', label: 'Alerta' },
  neutral: { icon: Lightbulb, cls: 'bg-primary-soft text-primary', label: 'Insight' },
};

export function InsightList({ insights, limit }: { insights: Insight[]; limit?: number }) {
  const list = limit ? insights.slice(0, limit) : insights;
  if (!list.length) return <p className="py-6 text-center text-sm text-fg-subtle">Adicione transações para receber insights personalizados.</p>;
  return (
    <ul className="space-y-2">
      {list.map((i, idx) => {
        const t = toneStyle[i.tone];
        const content = (
          <>
            <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg', t.cls)}>
              <t.icon className="size-4" aria-label={t.label} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-fg-subtle">{i.title}</p>
              <p className="mt-0.5 text-sm leading-snug">{i.text}</p>
            </div>
            {i.href && <ArrowRight className="mt-1 size-4 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
          </>
        );
        return (
          <motion.li key={i.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
            {i.href ? (
              <Link to={i.href} className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2">
                {content}
              </Link>
            ) : (
              <div className="flex items-start gap-3 rounded-xl p-2.5">{content}</div>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
