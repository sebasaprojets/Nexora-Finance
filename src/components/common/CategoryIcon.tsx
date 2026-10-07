import { getIcon } from '@/lib/icons';
import { cn } from '@/lib/cn';

export function CategoryIcon({ icon, color, size = 'md', className }: { icon?: string; color?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = getIcon(icon);
  const c = color ?? 'var(--fg-subtle)';
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-xl', size === 'sm' ? 'size-7 rounded-lg' : size === 'lg' ? 'size-12' : 'size-9', className)}
      style={{ background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c }}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4'} />
    </span>
  );
}
