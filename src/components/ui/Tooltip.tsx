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
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute right-0 z-50 w-max max-w-[min(16rem,80vw)] rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs leading-snug text-fg-muted shadow-md sm:right-auto sm:left-1/2 sm:-translate-x-1/2',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
