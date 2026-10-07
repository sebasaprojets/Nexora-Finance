// Edge Function `billing` — chamada pelo app (usuário logado).
//   { action: 'checkout', cycle: 'monthly' | 'yearly' } → { url } do checkout do Mercado Pago
//   { action: 'cancel' }                                → cancela a assinatura
// Os preços cobrados ficam AQUI (secrets), nunca no navegador.
import { admin, applyPreapproval, cors, env, json, mp, type Preapproval } from '../_shared/mercadopago.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Faça login novamente.' }, 401);
    const db = admin();
    const { data: auth, error: authErr } = await db.auth.getUser(jwt);
    if (authErr || !auth.user) return json({ error: 'Sessão expirada. Faça login novamente.' }, 401);
    const user = auth.user;
    const { action, cycle } = await req.json().catch(() => ({}));
    const { data: profile } = await db.from('profiles').select('founder, billing_customer, plan_status').eq('id', user.id).single();

    if (action === 'checkout') {
      if (profile?.plan_status === 'authorized') return json({ error: 'Você já é Pro.' }, 400);
      const yearly = cycle === 'yearly';
      const amount = yearly
        ? Number(env('PRICE_PRO_YEARLY', '119'))
        : Number(profile?.founder ? env('PRICE_FOUNDER_MONTHLY', '9.9') : env('PRICE_PRO_MONTHLY', '14.9'));
      const appUrl = env('APP_URL').replace(/\/$/, '');
      const sub = await mp<Preapproval>('/preapproval', {
        method: 'POST',
        body: JSON.stringify({
          reason: yearly ? 'Nexora Pro — anual' : 'Nexora Pro — mensal',
          external_reference: user.id,
          payer_email: user.email,
          auto_recurring: { frequency: yearly ? 12 : 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'BRL' },
          back_url: `${appUrl}/app/plano?pagamento=retorno`,
          status: 'pending',
        }),
      });
      if (!sub.init_point) throw new Error('Mercado Pago não devolveu o link de pagamento');
      return json({ url: sub.init_point });
    }

    if (action === 'cancel') {
      if (!profile?.billing_customer) return json({ error: 'Nenhuma assinatura encontrada.' }, 404);
      const sub = await mp<Preapproval>(`/preapproval/${profile.billing_customer}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
      await applyPreapproval({ ...sub, external_reference: user.id });
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'Erro no servidor de pagamentos. Tente novamente.' }, 500);
  }
});
