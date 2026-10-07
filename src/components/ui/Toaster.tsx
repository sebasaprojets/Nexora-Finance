import { AnimatePresence, motion } from 'framer-motion';
import { t } from '@/i18n';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToasts, type ToastTone } from '@/store/toast';
import { useIsDesktop } from '@/hooks/useMediaQuery';

const icons: Record<ToastTone, typeof Info> = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const colors: Record<ToastTone, string> = { success: 'text-success', error: 'text-danger', info: 'text-primary', warning: 'text-warning' };

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  // Celular: no topo (abaixo da barra superior) para não cobrir botões. Desktop: canto inferior direito.
  const desktop = useIsDesktop();
  const from = desktop ? 16 : -16;
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+72px)] z-[80] flex flex-col items-center gap-2 px-4 lg:top-auto lg:right-6 lg:bottom-6 lg:left-auto lg:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              role={toast.tone === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: from, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: from / 2, scale: 0.96 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border-strong bg-bg-elevated p-3.5 shadow-lg"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', colors[toast.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-xs text-fg-subtle">{toast.description}</p>}
                {toast.action && (
                  <button
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                    onClick={() => {
                      toast.action!.onClick();
                      dismiss(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(toast.id)} className="rounded-md p-0.5 text-fg-subtle hover:text-fg" aria-label={t('Fechar notificação')}>
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
