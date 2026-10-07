import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Efeito magnético sutil para CTAs (desativado com movimento reduzido). */
export function Magnetic({ children, strength = 0.25 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  return (
    <motion.span
      ref={ref}
      className="inline-flex"
      style={{ x, y }}
      onMouseMove={(e) => {
        if (reduced || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}
