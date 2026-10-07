import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { t } from '@/i18n';

/** Medidor semicircular do score (0–1000). */
export function ScoreGauge({ score, label, size = 240 }: { score: number; label: string; size?: number }) {
  const pct = Math.max(0, Math.min(1, score / 1000));
  const r = 90;
  const c = Math.PI * r;
  const color = score >= 800 ? 'var(--success)' : score >= 650 ? 'var(--primary)' : score >= 450 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="relative" style={{ width: size, height: size * 0.62 }} role="img" aria-label={t('Score {score} de 1000, {label}', { score, label })}>
      <svg viewBox="0 0 220 130" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="gauge-g" x1="0" x2="1">
            <stop offset="0%" stopColor="#7b6dff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d="M20,115 A90,90 0 0 1 200,115" fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round" />
        <motion.path
          d="M20,115 A90,90 0 0 1 200,115"
          fill="none"
          stroke="url(#gauge-g)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <AnimatedNumber value={score} format={(v) => String(Math.round(v))} className="tabular font-display text-5xl font-semibold tracking-tight" />
        <span className="mt-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ color, background: `color-mix(in oklab, ${color} 15%, transparent)` }}>
          {label}
        </span>
      </div>
    </div>
  );
}
