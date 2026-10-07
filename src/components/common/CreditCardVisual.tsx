import { motion } from 'framer-motion';
import { Wifi } from 'lucide-react';
import type { CreditCard } from '@/types';
import { cn } from '@/lib/cn';
import { BankLogo } from './BankLogo';

export const CARD_THEMES: Record<CreditCard['theme'], { bg: string; label: string }> = {
  violet: { bg: 'linear-gradient(135deg,#3b2f9e 0%,#6d5efc 45%,#1c1640 100%)', label: 'Violeta' },
  graphite: { bg: 'linear-gradient(135deg,#1d2130 0%,#3a3f52 50%,#0d0f16 100%)', label: 'Grafite' },
  ocean: { bg: 'linear-gradient(135deg,#0b3b5c 0%,#0891b2 50%,#062033 100%)', label: 'Oceano' },
  emerald: { bg: 'linear-gradient(135deg,#064e3b 0%,#10b981 55%,#022c22 100%)', label: 'Esmeralda' },
  sunset: { bg: 'linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#3b0a0a 100%)', label: 'Pôr do sol' },
  gold: { bg: 'linear-gradient(135deg,#6b4e16 0%,#d4a843 50%,#3a2a08 100%)', label: 'Dourado' },
};

function BrandMark({ brand }: { brand: CreditCard['brand'] }) {
  if (brand === 'mastercard')
    return (
      <svg viewBox="0 0 48 30" className="h-7" aria-label="Mastercard">
        <circle cx="17" cy="15" r="12" fill="#eb001b" opacity="0.9" />
        <circle cx="31" cy="15" r="12" fill="#f79e1b" opacity="0.9" />
      </svg>
    );
  const label = { visa: 'VISA', elo: 'elo', amex: 'AMEX', hipercard: 'Hipercard' }[brand];
  return <span className={cn('font-display font-bold tracking-wider text-white/95', brand === 'visa' ? 'text-xl italic' : 'text-base')}>{label}</span>;
}

/** Cartão visual premium com reflexo holográfico discreto. */
export function CreditCardVisual({ card, className, compact }: { card: CreditCard; className?: string; compact?: boolean }) {
  return (
    <motion.div
      whileHover={{ rotateX: 4, rotateY: -6, y: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{ background: CARD_THEMES[card.theme].bg, transformPerspective: 900 }}
      className={cn('relative aspect-[1.586] w-full overflow-hidden rounded-2xl p-5 text-white shadow-lg select-none', compact && 'p-4', className)}
      aria-label={`Cartão ${card.name} final ${card.last4}`}
      role="img"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,255,255,0.22),transparent_50%)]" />
      <div className="pointer-events-none absolute -bottom-1/2 -left-1/4 h-full w-[150%] rotate-12 bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <BankLogo slug={card.bank} texts={[card.institution, card.name]} size="sm" className="ring-white/25" />
            <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wider text-white/70 uppercase">{card.institution}</p>
            <p className="truncate font-display text-sm font-semibold">{card.name}</p>
            </div>
          </div>
          <Wifi className="size-5 rotate-90 text-white/70" aria-hidden />
        </div>
        <div className="flex items-center gap-2" aria-hidden>
          <span className="h-7 w-10 rounded-md bg-gradient-to-br from-[#f3d27a] to-[#b8902f] opacity-90" />
        </div>
        <div className="flex items-end justify-between">
          <p className="tabular font-mono text-[15px] tracking-[0.2em] text-white/90">•••• {card.last4}</p>
          <BrandMark brand={card.brand} />
        </div>
      </div>
    </motion.div>
  );
}
