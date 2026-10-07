// Utilitários compartilhados das Edge Functions de cobrança (Deno).
import { createClient } from 'npm:@supabase/supabase-js@2';

export const env = (k: string, fallback?: string) => {
  const v = Deno.env.get(k) ?? fallback;
  if (v === undefined) throw new Error(`Variável ${k} não configurada (supabase secrets set ${k}=...)`);
  return v;
};

/** Cliente com service role: só existe no servidor e ignora RLS (necessário para ativar o plano). */
export const admin = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

export async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T;
}

export interface Preapproval {
  id: string;
  status: 'pending' | 'authorized' | 'paused' | 'cancelled';
  external_reference?: string;
  payer_email?: string;
  next_payment_date?: string;
  init_point?: string;
}

/** Grava no perfil o estado da assinatura (fonte da verdade: a API do Mercado Pago). */
export async function applyPreapproval(p: Preapproval) {
  const userId = p.external_reference;
  if (!userId) return;
  const now = Date.now();
  const renews = p.next_payment_date ? new Date(p.next_payment_date) : null;
  // Cancelada: mantém o Pro até o fim do período pago (o app confere a data).
  const pro = p.status === 'authorized' || ((p.status === 'cancelled' || p.status === 'paused') && !!renews && renews.getTime() > now);
  const { error } = await admin()
    .from('profiles')
    .update({ plan: pro ? 'pro' : 'free', plan_status: p.status, plan_renews_at: renews?.toISOString() ?? null, billing_customer: p.id })
    .eq('id', userId);
  if (error) throw error;
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
