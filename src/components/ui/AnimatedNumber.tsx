import { useLayoutEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Contador animado. Atualiza o texto direto no DOM a cada quadro (sem re-render do React),
 * o que mantém a animação fluida mesmo em celulares modestos.
 */
export function AnimatedNumber({ value, format, className }: { value: number; format: (v: number) => string; className?: string }) {
  const reduced = useReducedMotion();
  const el = useRef<HTMLSpanElement>(null);
  const from = useRef(reduced ? value : 0);
  const fmt = useRef(format);
  fmt.current = format;
  const animating = useRef(false);
  const finalText = format(value);

  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    if (reduced) {
      node.textContent = fmt.current(value);
      from.current = value;
      return;
    }
    animating.current = true;
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = fmt.current(v);
      },
      onComplete: () => {
        animating.current = false;
        node.textContent = fmt.current(value);
      },
    });
    from.current = value;
    return () => {
      animating.current = false;
      controls.stop();
    };
  }, [value, reduced]);

  // Quando só o formato muda (ex.: ocultar valores, moeda), reflete na hora.
  useLayoutEffect(() => {
    if (el.current && !animating.current) el.current.textContent = finalText;
  }, [finalText]);

  return (
    <span className={className} aria-label={finalText}>
      <span ref={el} aria-hidden />
    </span>
  );
}
