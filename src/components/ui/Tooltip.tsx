import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Tooltip leve (hover + foco), anunciado via aria-describedby. */
export function Tooltip({ content, children, side = 'top', className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom'; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs leading-snug text-fg-muted shadow-md transition-all duration-150',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          open ? 'visible opacity-100' : 'invisible translate-y-0.5 opacity-0',
        )}
      >
        {content}
      </span>
    </span>
  );
}
