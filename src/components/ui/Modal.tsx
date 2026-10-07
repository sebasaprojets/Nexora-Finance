import { useEffect, useId, useRef, type ReactNode } from 'react';
import { t } from '@/i18n';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIsDesktop } from '@/hooks/useMediaQuery';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** No celular vira bottom sheet (padrão). */
  sheet?: boolean;
  className?: string;
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/** Diálogo acessível: foco preso, ESC fecha, foco devolvido ao gatilho. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', sheet = true, className }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const asSheet = sheet && !desktop;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      el?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && panel.current) {
        const nodes = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-[60] flex justify-center', asSheet ? 'items-end' : 'items-center p-4')}>
          <motion.div
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col border border-border bg-bg-elevated shadow-lg',
              asSheet ? 'rounded-t-2xl pb-[env(safe-area-inset-bottom)]' : cn('rounded-2xl', widths[size]),
              className,
            )}
            initial={asSheet ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={asSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={asSheet ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 4 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
          >
            {asSheet && <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border-strong" aria-hidden />}
            <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
              <div>
                <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-0.5 text-sm text-fg-subtle">
                    {description}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label={t('Fechar')}>
                <X className="size-5" />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="h-10 rounded-xl px-4 text-sm font-medium text-fg-muted hover:bg-surface-2" onClick={onClose}>
            {t('Cancelar')}
          </button>
          <button
            data-autofocus
            className={cn('h-10 rounded-xl px-4 text-sm font-medium text-white', tone === 'danger' ? 'bg-danger' : 'bg-primary')}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? t('Confirmar')}
          </button>
        </>
      }
    >
      <div className="text-sm text-fg-muted">{description}</div>
    </Modal>
  );
}
