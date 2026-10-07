import { useId } from 'react';
import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  // id único: gradientes definidos em elementos ocultos (display:none) não renderizam em outras cópias.
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8f83ff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#0d0f16" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke={`url(#${id})`} strokeOpacity="0.45" />
      <path d="M9 22.5V9.5l14 13V9.5" fill="none" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-[17px] font-semibold tracking-tight">
          Nexora<span className="ml-1 font-normal text-fg-subtle">Finance</span>
        </span>
      )}
    </span>
  );
}
