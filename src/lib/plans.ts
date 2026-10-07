import type { User } from '@/types';
import { cloudEnabled } from '@/services/cloud';

/**
 * Planos da Nexora. A cobrança só é ativada com `VITE_BILLING=on` (e Supabase
 * configurado). Enquanto estiver desligada, todos usam tudo — ideal para o beta.
 * Os preços cobrados de verdade são definidos no servidor (Edge Function `billing`);
 * estes valores são só para exibição e devem ser iguais aos de lá.
 */
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const env = import.meta.env;

export const PRICES = {
  monthly: num(env.VITE_PRICE_PRO_MONTHLY, 14.9),
  yearly: num(env.VITE_PRICE_PRO_YEARLY, 119),
  founder: num(env.VITE_PRICE_FOUNDER_MONTHLY, 9.9),
};

export const billingEnabled = cloudEnabled && env.VITE_BILLING === 'on';
/** Vagas do beta de fundadores abertas (mostra a oferta na página inicial). */
export const founderOffer = env.VITE_FOUNDER_OFFER !== 'off';

export const FREE_LIMITS = { accounts: 3, cards: 2, goals: 3, budgets: 5 } as const;
export type LimitedResource = keyof typeof FREE_LIMITS;

export const FREE_FEATURES = [
  `Até ${FREE_LIMITS.accounts} contas e ${FREE_LIMITS.cards} cartões`,
  'Transações ilimitadas',
  `Até ${FREE_LIMITS.goals} metas e ${FREE_LIMITS.budgets} orçamentos`,
  'Dashboard, análises, DRE e calendário',
  'Alertas de contas e gastos fora do padrão',
  'Sincronização entre seus aparelhos',
  'Nexora AI (perguntas e lançamentos por conversa)',
  'Exportação CSV',
];

export const PRO_FEATURES = [
  'Tudo do plano Grátis',
  'Contas, cartões, metas e orçamentos ilimitados',
  'Relatórios em PDF e Excel',
  'Suporte prioritário pelo WhatsApp',
  'Acesso antecipado às novidades',
];

/** O usuário tem acesso total? (sempre sim com a cobrança desligada ou na demonstração). */
export function hasPro(user: User | null | undefined) {
  if (!billingEnabled) return true;
  if (!user) return false;
  if (user.provider === 'demo') return true;
  if (user.plan === 'free') return false;
  // Cancelado: mantém o Pro até o fim do período já pago.
  if (user.planStatus === 'cancelled' && user.planRenewsAt) return new Date(user.planRenewsAt).getTime() > Date.now();
  return true;
}

export function limitReached(user: User | null | undefined, resource: LimitedResource, count: number) {
  return !hasPro(user) && count >= FREE_LIMITS[resource];
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
