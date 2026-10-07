import { cn } from '@/lib/cn';
import { NexoraMark } from '@/components/brand/NexoraMark';

/** Símbolo "N" da Nexora (fita em degradê ciano → azul). */
export function LogoMark({ className }: { className?: string }) {
  return <NexoraMark className={cn('h-8 w-auto', className)} />;
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="h-7" />
      {!compact && (
        <span className="font-display text-[17px] font-semibold tracking-tight">
          Nexora<span className="ml-1 font-normal text-fg-subtle">Finance</span>
        </span>
      )}
    </span>
  );
}
