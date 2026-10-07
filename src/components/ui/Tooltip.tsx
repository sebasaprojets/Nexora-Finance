import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

const GAP = 8;
const MARGIN = 12;

/**
 * Tooltip leve (hover, foco e toque), anunciado via aria-describedby.
 * Renderizado em portal com posição fixa: não é cortado por cards com
 * `overflow: hidden` nem fica atrás de outros elementos, e se mantém dentro da tela.
 */
export function Tooltip({ content, children, side = 'top', className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom'; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const id = useId();
  const trigger = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const t = trigger.current?.getBoundingClientRect();
      const el = tip.current;
      if (!t || !el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const roomTop = t.top - GAP - h >= MARGIN;
      const roomBottom = t.bottom + GAP + h <= vh - MARGIN;
      const top = (side === 'top' ? roomTop || !roomBottom : !roomBottom && roomTop) ? t.top - GAP - h : t.bottom + GAP;
      const left = Math.min(Math.max(t.left + t.width / 2 - w / 2, MARGIN), vw - w - MARGIN);
      setPos({ top, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, side]);

  // Toque fora ou Esc fecha (no celular não existe "mouse sair").
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={trigger}
      className={cn('relative inline-flex', className)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        const mouse = (e.nativeEvent as PointerEvent).pointerType === 'mouse';
        setOpen((o) => (mouse ? true : !o));
      }}
      // Só abre no foco via teclado; no toque o clique já alterna (evita abrir e fechar no mesmo toque).
      onFocus={(e) => (e.target as HTMLElement).matches(':focus-visible') && setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open &&
        createPortal(
          <span
            ref={tip}
            id={id}
            role="tooltip"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
            className="pointer-events-none fixed z-[200] w-max max-w-[min(18rem,calc(100vw-24px))] rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs leading-snug text-fg-muted shadow-lg"
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
