import { cn } from '@/lib/cn';
import { t } from '@/i18n';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-surface-2', className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-1" role="status" aria-label={t('Carregando')}>
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <span className="sr-only">{t('Carregando…')}</span>
    </div>
  );
}
