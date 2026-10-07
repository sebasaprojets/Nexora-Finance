import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/store/settings';
import { useToasts } from '@/store/toast';
import { TOURS } from '@/lib/tours';
import { cn } from '@/lib/cn';

interface TourState {
  active: string | null;
  start: (id: string) => void;
  stop: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  active: null,
  start: (id) => set({ active: id }),
  stop: () => set({ active: null }),
}));

/**
 * Inicia o tutorial da página na primeira visita (se os tutoriais estiverem ativos).
 * Retorna uma função para revê-lo manualmente.
 */
export function usePageTour(id: string, ready = true) {
  const enabled = useSettings((s) => s.tutorials.enabled);
  const seen = useSettings((s) => s.tutorials.seen.includes(id));
  const start = useTourStore((s) => s.start);
  useEffect(() => {
    if (!ready || !enabled || seen || !TOURS[id]) return;
    // Espera a página assentar e qualquer diálogo/abertura animada sair da tela
    // (tenta de novo a cada 700 ms) antes de destacar os elementos.
    let timer: ReturnType<typeof setTimeout>;
    const tryStart = (wait: number) => {
      timer = setTimeout(() => {
        if (useTourStore.getState().active) return;
        if (document.querySelector('[role="dialog"][aria-modal="true"]') || document.body.dataset.biometricPending) return tryStart(700);
        start(id);
      }, wait);
    };
    tryStart(900);
    return () => clearTimeout(timer);
  }, [id, ready, enabled, seen, start]);
  return useCallback(() => start(id), [id, start]);
}

/** Primeiro elemento visível marcado com data-tour="name". */
function findTarget(name?: string): HTMLElement | null {
  if (!name) return null;
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
  }
  return null;
}

const PAD = 8;

/** Sobreposição do tutorial: destaca o elemento e mostra o cartão explicativo. */
export function TourOverlay() {
  const active = useTourStore((s) => s.active);
  const stop = useTourStore((s) => s.stop);
  const markSeen = useSettings((s) => s.markTutorialSeen);
  const setEnabled = useSettings((s) => s.setTutorialsEnabled);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState(() => window.innerWidth);
  const [vh, setVh] = useState(() => window.innerHeight);
  const [dontShow, setDontShow] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const tour = active ? TOURS[active] : null;
  const steps = tour?.steps ?? [];
  const step = steps[index];

  useEffect(() => {
    setIndex(0);
    setDontShow(false);
    // Fecha mensagens na tela para não cobrirem o que o tutorial destaca.
    if (active) useToasts.setState({ toasts: [] });
  }, [active]);

  const finish = useCallback(() => {
    if (active) markSeen(active);
    if (dontShow) setEnabled(false);
    stop();
  }, [active, dontShow, markSeen, setEnabled, stop]);

  // Posiciona o destaque e mantém sincronizado com rolagem/redimensionamento.
  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 160) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const target = findTarget(step.target);
        setRect(target ? target.getBoundingClientRect() : null);
        setVw(window.innerWidth);
        setVh(window.innerHeight);
      });
    };
    update();
    const timer = setInterval(update, 250); // acompanha animações e rolagem suave
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);

  useEffect(() => {
    if (!tour) return;
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        finish();
      } else if (e.key === 'ArrowRight') setIndex((i) => Math.min(steps.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [tour, steps.length, finish]);

  useEffect(() => {
    card.current?.focus();
  }, [index]);

  if (!tour || !step) return createPortal(<AnimatePresence />, document.body);

  const mobile = vw < 640;
  const CARD_W = Math.min(360, vw - 32);
  const spot = rect && { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };

  // Posição do cartão: abaixo do alvo, ou acima se não couber; no celular, fixo na base.
  let style: React.CSSProperties;
  // Centralizado sem `transform` (a animação do framer-motion usa transform e o sobrescreveria).
  if (!spot) style = { inset: 0, margin: 'auto', height: 'fit-content', width: CARD_W };
  else if (mobile) style = spot.top + spot.height / 2 > vh * 0.55 ? { top: 'calc(env(safe-area-inset-top) + 12px)', left: 16, right: 16 } : { bottom: 'calc(env(safe-area-inset-bottom) + 12px)', left: 16, right: 16 };
  else {
    const below = spot.top + spot.height + 12;
    const fitsBelow = below + 230 < vh;
    const left = Math.max(16, Math.min(vw - CARD_W - 16, spot.left + spot.width / 2 - CARD_W / 2));
    style = fitsBelow ? { top: below, left, width: CARD_W } : { top: Math.max(16, spot.top - 12 - 230), left, width: CARD_W };
  }
  const last = index === steps.length - 1;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[90]" key="tour">
        {/* Camada que bloqueia cliques; o recorte cria o destaque. */}
        {spot ? (
          <motion.div
            aria-hidden
            className="pointer-events-auto absolute rounded-2xl ring-2 ring-primary"
            initial={false}
            animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{ boxShadow: '0 0 0 9999px rgb(5 6 12 / 0.62)' }}
          />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-[rgb(5_6_12/0.62)] backdrop-blur-[2px]" />
        )}
        <motion.div
          ref={card}
          key={`${active}-${index}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          tabIndex={-1}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn('absolute rounded-2xl border border-border bg-bg-elevated p-5 shadow-lg outline-none', mobile && spot && 'mx-auto max-w-md')}
          style={style}
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <GraduationCap className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium tracking-wider text-fg-subtle uppercase">
                {t('Tutorial')} · {t(tour.title)} · {t('{n} de {total}', { n: index + 1, total: steps.length })}
              </p>
              <h2 id="tour-title" className="mt-0.5 font-display text-base font-semibold">{t(step.title)}</h2>
            </div>
            <button onClick={finish} className="-mt-1 -mr-1 rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label={t('Pular tutorial')}>
              <X className="size-4" />
            </button>
          </div>
          <p id="tour-body" className="mt-3 text-sm leading-relaxed text-fg-muted">{t(step.body)}</p>
          <div className="mt-4 flex gap-1" aria-hidden>
            {steps.map((_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= index ? 'bg-primary' : 'bg-surface-3')} />
            ))}
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-fg-subtle">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} className="size-3.5 accent-[var(--primary)]" />
            {t('Não mostrar mais tutoriais')}
          </label>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={finish}>{t('Pular')}</Button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="size-3.5" />} onClick={() => setIndex(index - 1)}>
                  {t('Voltar')}
                </Button>
              )}
              <Button size="sm" rightIcon={!last ? <ArrowRight className="size-3.5" /> : undefined} onClick={() => (last ? finish() : setIndex(index + 1))}>
                {last ? t('Concluir') : t('Próximo')}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}

/** Botão "Como usar" para rever o tutorial da página. */
export function TourButton({ id, className }: { id: string; className?: string }) {
  const start = useTourStore((s) => s.start);
  if (!TOURS[id]) return null;
  return (
    <Button data-tour="help" variant="ghost" size="sm" className={className} leftIcon={<GraduationCap className="size-3.5" />} onClick={() => start(id)} aria-label={t('Ver tutorial: {nome}', { nome: t(TOURS[id].title) })}>
      <span className="hidden sm:inline">{t('Como usar')}</span>
    </Button>
  );
}
