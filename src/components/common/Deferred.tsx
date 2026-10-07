import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Renderiza o conteúdo só quando ele se aproxima da área visível.
 * Deixa a abertura de telas pesadas (muitos gráficos) instantânea e a rolagem fluida.
 */
export function Deferred({ children, minHeight = 320, rootMargin = '400px' }: { children: ReactNode; minHeight?: number; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    if (!('IntersectionObserver' in window)) return setShow(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);
  if (show) return <>{children}</>;
  return (
    <div ref={ref} style={{ minHeight }} aria-hidden>
      <Skeleton className="h-full w-full" />
    </div>
  );
}
