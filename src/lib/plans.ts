import type { User } from '@/types';
import { cloudEnabled } from '@/services/cloud';
import { readJSON, writeJSON } from '@/services/storage';
import { currentLocale, t } from '@/i18n';

/**
 * Planos da Nexora.
 *
 * - **Limites do Grátis**: ligados por padrão (desligue com `VITE_PLAN_LIMITS=off`).
 * - **Cobrança online** (Mercado Pago): só com `VITE_BILLING=on` + Supabase. Sem ela, quem
 *   chega ao limite pode fazer o **teste grátis do Pro por 14 dias** (uma vez por conta).
 * - Os preços cobrados de verdade ficam no servidor (Edge Function `billing`);
 *   estes valores são só para exibição e devem ser iguais aos de lá.
 * - Quem já tinha mais itens que o limite não perde nada: só não cria novos.
 */
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const env = import.meta.env;

export const PRICES = {
  monthly: num(env.VITE_PRICE_PRO_MONTHLY, 14.9),
  yearly: num(env.VITE_PRICE_PRO_YEARLY, 119),
  founder: num(env.VITE_PRICE_FOUNDER_MONTHLY, 9.9),
};

/** Limites do plano Grátis em vigor. */
export const limitsEnabled = env.VITE_PLAN_LIMITS !== 'off';
/** Pagamento online disponível (checkout do Mercado Pago). */
export const billingEnabled = cloudEnabled && env.VITE_BILLING === 'on';
/** Vagas do beta de fundadores abertas (mostra a oferta na página inicial). */
export const founderOffer = env.VITE_FOUNDER_OFFER !== 'off';

export const TRIAL_DAYS = 14;

/** Quantidade máxima no plano Grátis. */
export const FREE_LIMITS = {
  accounts: 2,
  cards: 1,
  goals: 2,
  budgets: 3,
  investments: 3,
  subscriptions: 5,
  debts: 2,
  categories: 3,
  /** Perguntas/lançamentos na Nexora AI por mês. */
  ai: 20,
} as const;
export type LimitedResource = keyof typeof FREE_LIMITS;

/** Recursos exclusivos do Pro (sem cota no Grátis). */
export type ProFeature = 'export' | 'attachments' | 'compare';

/** Nome do recurso no plural (chave de tradução). */
export const RESOURCE_LABEL: Record<LimitedResource, string> = {
  accounts: 'Contas',
  cards: 'Cartões',
  goals: 'Metas',
  budgets: 'Orçamentos',
  investments: 'Investimentos',
  subscriptions: 'Assinaturas',
  debts: 'Dívidas',
  categories: 'Categorias personalizadas',
  ai: 'Perguntas à Nexora AI (mês)',
};

/** Recursos do plano Grátis, no idioma atual. */
export function freeFeatures(): string[] {
  return [
    t('Transações ilimitadas'),
    t('Até {accounts} contas e {cards} cartão', { accounts: FREE_LIMITS.accounts, cards: FREE_LIMITS.cards }),
    t('Até {goals} metas e {budgets} orçamentos', { goals: FREE_LIMITS.goals, budgets: FREE_LIMITS.budgets }),
    t('Até {n} investimentos e {s} assinaturas', { n: FREE_LIMITS.investments, s: FREE_LIMITS.subscriptions }),
    t('Nexora AI: {n} perguntas por mês', { n: FREE_LIMITS.ai }),
    t('Dashboard, análises, DRE e calendário'),
    t('Alertas de contas e gastos fora do padrão'),
    t('Exportação CSV'),
  ];
}

/** Recursos do plano Pro, no idioma atual. */
export function proFeatures(): string[] {
  return [
    t('Tudo ilimitado: contas, cartões, metas, orçamentos e investimentos'),
    t('Nexora AI sem limite de perguntas'),
    t('Relatórios em PDF e Excel'),
    t('Comparação de períodos nas análises'),
    t('Comprovantes anexados às transações'),
    t('Suporte prioritário pelo WhatsApp'),
  ];
}

// ---------------------------------------------------------------------------
// Teste grátis do Pro (guardado no aparelho, uma vez por conta)
// ---------------------------------------------------------------------------

const TRIAL_KEY = (uid: string) => `plan:trial:${uid}`;

export function trialEndsAt(uid: string | undefined): number | null {
  return uid ? readJSON<number | null>(TRIAL_KEY(uid), null) : null;
}
export function trialActive(uid: string | undefined) {
  const end = trialEndsAt(uid);
  return !!end && end > Date.now();
}
export function trialAvailable(user: User | null | undefined) {
  return !!user && user.provider !== 'demo' && user.plan === 'free' && trialEndsAt(user.id) === null;
}
export function trialDaysLeft(uid: string | undefined) {
  const end = trialEndsAt(uid);
  return end ? Math.max(0, Math.ceil((end - Date.now()) / 86_400_000)) : 0;
}
export function startTrial(uid: string) {
  writeJSON(TRIAL_KEY(uid), Date.now() + TRIAL_DAYS * 86_400_000);
}

// ---------------------------------------------------------------------------
// Acesso
// ---------------------------------------------------------------------------

/** Assinatura paga ativa (não conta o teste grátis). */
export function isPaidPro(user: User | null | undefined) {
  if (!user || user.plan === 'free') return false;
  // Cancelado: mantém o Pro até o fim do período já pago.
  if (user.planStatus === 'cancelled' && user.planRenewsAt) return new Date(user.planRenewsAt).getTime() > Date.now();
  return true;
}

/** O usuário tem acesso a tudo? (Pro pago, teste ativo, demonstração ou limites desligados). */
export function hasPro(user: User | null | undefined) {
  if (!limitsEnabled) return true;
  if (!user) return false;
  if (user.provider === 'demo') return true;
  return isPaidPro(user) || trialActive(user.id);
}

export function limitReached(user: User | null | undefined, resource: LimitedResource, count: number) {
  return !hasPro(user) && count >= FREE_LIMITS[resource];
}

// ---------------------------------------------------------------------------
// Uso mensal da Nexora AI (por conta, no aparelho)
// ---------------------------------------------------------------------------

const monthTag = () => new Date().toISOString().slice(0, 7);
const AI_KEY = (uid: string) => `plan:ai:${uid}:${monthTag()}`;

export function aiUsage(uid: string | undefined) {
  return uid ? readJSON<number>(AI_KEY(uid), 0) : 0;
}
export function addAiUsage(uid: string) {
  writeJSON(AI_KEY(uid), aiUsage(uid) + 1);
}

export const brl = (v: number) => v.toLocaleString(currentLocale(), { style: 'currency', currency: 'BRL' });
