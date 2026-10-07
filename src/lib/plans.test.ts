import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types';

const base: User = { id: 'u1', name: 'Ana', email: 'a@a.com', plan: 'free', createdAt: '', onboarded: true, provider: 'password' };

async function load(billing: boolean) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', billing ? 'https://x.supabase.co' : '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', billing ? 'anon' : '');
  vi.stubEnv('VITE_BILLING', billing ? 'on' : '');
  return import('./plans');
}

afterEach(() => vi.unstubAllEnvs());

describe('planos', () => {
  it('com a cobrança desligada (beta), todos têm acesso total', async () => {
    const p = await load(false);
    expect(p.billingEnabled).toBe(false);
    expect(p.hasPro(base)).toBe(true);
    expect(p.limitReached(base, 'cards', 50)).toBe(false);
  });

  it('com a cobrança ligada, o Grátis respeita os limites', async () => {
    const p = await load(true);
    expect(p.hasPro(base)).toBe(false);
    expect(p.limitReached(base, 'cards', p.FREE_LIMITS.cards - 1)).toBe(false);
    expect(p.limitReached(base, 'cards', p.FREE_LIMITS.cards)).toBe(true);
    expect(p.hasPro({ ...base, plan: 'pro', planStatus: 'authorized' })).toBe(true);
    expect(p.hasPro({ ...base, provider: 'demo' })).toBe(true);
  });

  it('assinatura cancelada mantém o Pro até o fim do período pago', async () => {
    const p = await load(true);
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(p.hasPro({ ...base, plan: 'pro', planStatus: 'cancelled', planRenewsAt: future })).toBe(true);
    expect(p.hasPro({ ...base, plan: 'pro', planStatus: 'cancelled', planRenewsAt: past })).toBe(false);
  });
});
