import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Progress({
  value,
  className,
  barClassName,
  color,
  label,
  size = 'md',
}: {
  value: number;
  className?: string;
  barClassName?: string;
  color?: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2', className)}
    >
      <motion.div
        className={cn('h-full rounded-full bg-primary', barClassName)}
        style={color ? { background: color } : undefined}
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
