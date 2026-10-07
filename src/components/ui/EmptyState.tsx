import type { ReactNode } from 'react';
import { t } from '@/i18n';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" aria-hidden />
          <div className="relative grid size-14 place-items-center rounded-2xl border border-border bg-surface-2 text-primary [&>svg]:size-6">{icon}</div>
        </div>
      )}
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-subtle">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle />}
      title={title ?? t('Algo deu errado')}
      description={description ?? t('Não foi possível carregar estas informações. Tente novamente.')}
      action={onRetry && <Button variant="secondary" onClick={onRetry}>{t('Tentar novamente')}</Button>}
    />
  );
}

export function OfflineState() {
  return <EmptyState icon={<WifiOff />} title={t('Você está offline')} description={t('Mostrando os dados salvos neste dispositivo. As alterações serão mantidas localmente.')} />;
}
