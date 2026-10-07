import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from 'framer-motion';
import { MARK, MARK_VIEWBOX, WORDMARK, WORDMARK_STROKE, WORDMARK_VIEWBOX } from './geometry';
import { MarkDefs, markFill } from './NexoraMark';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Abertura cinematográfica da Nexora.
 *
 * Linha do tempo (≈ 6,5 s, exibição obrigatória — sem opção de pular):
 *  0,0 s  fundo e partículas surgem
 *  0,2 s  "câmera" faz um dolly lento: sai inclinada, distante e desfocada até o enquadramento
 *  0,4 s  peças do "N" se montam (haste, fita, barras) + reflexo de luz atravessa o símbolo
 *  1,5 s  wordmark é desenhado traço a traço; o X em destaque acende por último
 *  2,7 s  FINANCE aparece com o espaçamento fechando; depois o slogan
 *  5,0 s  saída: a câmera avança devagar enquanto tudo desfoca e se dissolve
 *
 * Só usa transform/opacity/filter (GPU) e SVG vetorial — nítido e leve em qualquer tela.
 */

const EASE_CINE = [0.22, 1, 0.36, 1] as const; // desaceleração longa, "câmera"
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const HOLD_MS = 5000;

type Phase = 'enter' | 'exit';

/** Partículas determinísticas (mesma composição em todos os dispositivos). */
function useParticles(count: number) {
  return useMemo(() => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      top: rnd() * 100,
      size: 1 + rnd() * 2.2,
      delay: rnd() * 3,
      duration: 6 + rnd() * 6,
      opacity: 0.25 + rnd() * 0.5,
    }));
  }, [count]);
}

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  // Aparelhos de toque/modestos: menos partículas e desfoque mais leve (mantém 60 fps).
  const lite = useMemo(
    () => typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4),
    [],
  );
  const blurIn = lite ? 'blur(6px)' : 'blur(14px)';
  const blurOut = lite ? 'blur(8px)' : 'blur(18px)';
  const [phase, setPhase] = useState<Phase>('enter');
  const [visible, setVisible] = useState(true);
  const uid = `nxi${useId().replace(/:/g, '')}`;
  const fill = markFill(uid);
  const particles = useParticles(lite ? 10 : 24);
  const exited = useRef(false);

  const exit = useCallback(() => {
    if (exited.current) return;
    exited.current = true;
    setPhase('exit');
  }, []);

  // Mantém a página travada enquanto a abertura está na tela.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    // Com "reduzir movimento" no sistema, a versão é mais curta (só fade), por acessibilidade.
    const t = setTimeout(exit, reduced ? 1600 : HOLD_MS);
    return () => clearTimeout(t);
  }, [exit, reduced]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const t = setTimeout(() => setVisible(false), reduced ? 500 : 1500);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  const t = (delay: number, duration: number, ease: Transition['ease'] = EASE_OUT): Transition =>
    reduced ? { duration: 0.01 } : { delay, duration, ease };

  // Câmera: entrada lenta (dolly + tilt) e saída avançando/desfocando.
  const camera: { initial: TargetAndTransition; enter: TargetAndTransition; exit: TargetAndTransition } = reduced
    ? { initial: { opacity: 0 }, enter: { opacity: 1, transition: { duration: 0.5 } }, exit: { opacity: 0, transition: { duration: 0.45 } } }
    : {
        initial: { opacity: 0, scale: 0.72, rotateX: 24, rotateY: -26, y: 40, filter: blurIn },
        enter: {
          opacity: 1,
          scale: [0.72, 1, 1.04],
          rotateX: [24, 0, -1.5],
          rotateY: [-26, 0, 2],
          y: [40, 0, -4],
          filter: [blurIn, 'blur(0px)', 'blur(0px)'],
          transition: { duration: 6.5, times: [0, 0.45, 1], ease: [[...EASE_CINE], 'linear'] as Transition['ease'] },
        },
        exit: {
          opacity: 0,
          scale: 1.16,
          rotateX: -8,
          y: -26,
          filter: blurOut,
          transition: { duration: 1.4, ease: [0.4, 0, 0.2, 1] as const },
        },
      };

  return createPortal(
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#03050c] select-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduced ? 0.3 : 0.6, ease: 'easeOut' } }}
          role="dialog"
          aria-modal="true"
          aria-label="Nexora Finance — Inteligência financeira em um só lugar"
        >
          {/* Fundo: brilho central que respira, vinheta e partículas em deriva. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'exit' ? 0 : 1 }}
            transition={{ duration: phase === 'exit' ? 1.3 : 1.6, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute top-1/2 left-1/2 size-[min(120vw,120vh)] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(44,92,245,0.32) 0%, rgba(34,230,214,0.10) 35%, transparent 65%)' }}
              animate={reduced ? undefined : { scale: [0.85, 1.08, 1] }}
              transition={{ duration: 6.5, ease: 'easeInOut' }}
            />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
            {!reduced &&
              particles.map((p) => (
                <span
                  key={p.id}
                  className="nx-particle absolute rounded-full bg-[#7fe9ff]"
                  style={{
                    left: `${p.left}%`,
                    top: `${p.top}%`,
                    width: p.size,
                    height: p.size,
                    opacity: p.opacity,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                  }}
                />
              ))}
          </motion.div>

          {/* Cena com perspectiva: tudo dentro dela se move como uma câmera. */}
          <div className="relative flex w-full items-center justify-center px-6" style={{ perspective: 1200 }}>
            <motion.div
              className="flex flex-col items-center"
              style={{ transformStyle: 'preserve-3d', willChange: 'transform, opacity, filter' }}
              initial={camera.initial}
              animate={phase === 'exit' ? camera.exit : camera.enter}
            >
              {/* Símbolo */}
              <div className="relative" style={{ width: 'min(42vw, 32vh, 340px)' }}>
                <motion.div
                  aria-hidden
                  className="absolute inset-[-30%] rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(34,230,214,0.35), rgba(59,63,240,0.18) 45%, transparent 70%)' }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 0.9, 0.55], scale: [0.6, 1.1, 1] }}
                  transition={t(0.6, 2.6)}
                />
                <svg viewBox={MARK_VIEWBOX} className="relative block h-auto w-full overflow-visible" aria-hidden>
                  <MarkDefs id={uid} />
                  <defs>
                    <clipPath id={`${uid}-clip`}>
                      <path d={MARK.ribbon} />
                      <path d={MARK.leftStem} />
                      <path d={MARK.midBar} />
                    </clipPath>
                    <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                      <stop offset="50%" stopColor="#fff" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path d={MARK.midBar} fill={fill.midBar} style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }} initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={t(1.0, 1.2)} />
                  <motion.g initial={{ opacity: 0, x: -40, y: -28 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={t(0.65, 1.5)}>
                    <path d={MARK.ribbon} fill={fill.ribbon} />
                    <path d={MARK.rightFace} fill={fill.rightFace} />
                  </motion.g>
                  <motion.path d={MARK.leftStem} fill={fill.leftStem} initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} transition={t(0.4, 1.5)} />
                  <motion.path d={MARK.fold} fill={fill.fold} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={t(1.4, 1)} />
                  {/* Reflexo de luz cruzando o símbolo */}
                  {!reduced && (
                    <g clipPath={`url(#${uid}-clip)`}>
                      <g transform="skewX(-20)">
                        <motion.rect
                          y="-60"
                          width="160"
                          height="480"
                          fill={`url(#${uid}-shine)`}
                          initial={{ x: -260 }}
                          animate={{ x: 720 }}
                          transition={{ delay: 2.1, duration: 1.8, ease: [0.45, 0, 0.2, 1] }}
                        />
                      </g>
                    </g>
                  )}
                </svg>
              </div>

              {/* Wordmark desenhado traço a traço */}
              <svg viewBox={WORDMARK_VIEWBOX} className="mt-[min(5vh,40px)] block h-auto overflow-visible" style={{ width: 'min(80vw, 66vh, 640px)' }} aria-hidden>
                <defs>
                  <linearGradient id={`${uid}-x`} x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22F2D6" />
                    <stop offset="100%" stopColor="#3B3FF0" />
                  </linearGradient>
                  <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {WORDMARK.map((l, i) => {
                  const accent = 'accent' in l && l.accent;
                  const delay = accent ? 2.45 : 1.45 + i * 0.13;
                  return (
                    <motion.path
                      key={l.id}
                      d={l.d}
                      fill="none"
                      stroke={accent ? `url(#${uid}-x)` : '#F4F6FB'}
                      strokeWidth={WORDMARK_STROKE}
                      strokeLinejoin="miter"
                      filter={accent ? `url(#${uid}-glow)` : undefined}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={reduced ? { duration: 0.01 } : { pathLength: { delay, duration: accent ? 0.7 : 1, ease: [0.65, 0, 0.35, 1] }, opacity: { delay, duration: 0.15 } }}
                    />
                  );
                })}
              </svg>

              {/* Linha de luz (lens flare) */}
              {!reduced && (
                <motion.div
                  aria-hidden
                  className="mt-3 h-px"
                  style={{ width: 'min(70vw, 480px)', background: 'linear-gradient(90deg, transparent, #22F2D6 30%, #fff 50%, #3B82F6 70%, transparent)' }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0.25] }}
                  transition={{ delay: 2.3, duration: 2, ease: EASE_OUT }}
                />
              )}

              <motion.p
                className="mt-[min(2.4vh,18px)] font-display font-medium text-[#22E8D4] uppercase"
                style={{ fontSize: 'min(5.2vw, 3.4vh, 32px)', paddingLeft: '0.62em' }}
                initial={{ opacity: 0, letterSpacing: '1.4em', filter: 'blur(6px)' }}
                animate={{ opacity: 1, letterSpacing: '0.62em', filter: 'blur(0px)' }}
                transition={t(2.7, 1.6)}
              >
                Finance
              </motion.p>
              <motion.p
                className="mt-[min(3.2vh,26px)] text-center font-sans font-light tracking-[0.06em] text-white/80"
                style={{ fontSize: 'min(3.8vw, 2.3vh, 19px)' }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={t(3.3, 1.3)}
              >
                Inteligência financeira em um só lugar.
              </motion.p>
            </motion.div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export const REPLAY_INTRO_EVENT = 'nexora:replay-intro';
