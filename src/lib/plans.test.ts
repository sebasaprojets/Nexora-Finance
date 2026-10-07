import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types';

const base: User = { id: 'u1', name: 'Ana', email: 'a@a.com', plan: 'free', createdAt: '', onboarded: true, provider: 'password' };

async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('./plans');
}

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('planos', () => {
  it('o plano Grátis tem limites por padrão (mesmo sem pagamento online)', async () => {
    const p = await load();
    expect(p.limitsEnabled).toBe(true);
    expect(p.hasPro(base)).toBe(false);
    expect(p.limitReached(base, 'cards', p.FREE_LIMITS.cards - 1)).toBe(false);
    expect(p.limitReached(base, 'cards', p.FREE_LIMITS.cards)).toBe(true);
    expect(p.hasPro({ ...base, provider: 'demo' })).toBe(true);
    expect(p.hasPro({ ...base, plan: 'pro', planStatus: 'authorized' })).toBe(true);
  });

  it('VITE_PLAN_LIMITS=off libera tudo', async () => {
    const p = await load({ VITE_PLAN_LIMITS: 'off' });
    expect(p.hasPro(base)).toBe(true);
    expect(p.limitReached(base, 'accounts', 99)).toBe(false);
  });

  it('teste grátis de 14 dias: uma vez por conta', async () => {
    const p = await load();
    expect(p.trialAvailable(base)).toBe(true);
    p.startTrial(base.id);
    expect(p.hasPro(base)).toBe(true);
    expect(p.trialDaysLeft(base.id)).toBe(p.TRIAL_DAYS);
    expect(p.trialAvailable(base)).toBe(false);
  });

  it('assinatura cancelada mantém o Pro até o fim do período pago', async () => {
    const p = await load();
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(p.hasPro({ ...base, plan: 'pro', planStatus: 'cancelled', planRenewsAt: future })).toBe(true);
    expect(p.hasPro({ ...base, plan: 'pro', planStatus: 'cancelled', planRenewsAt: past })).toBe(false);
  });

  it('conta as perguntas da Nexora AI por mês', async () => {
    const p = await load();
    expect(p.aiUsage(base.id)).toBe(0);
    p.addAiUsage(base.id);
    p.addAiUsage(base.id);
    expect(p.aiUsage(base.id)).toBe(2);
  });
});
