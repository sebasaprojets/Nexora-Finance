import { supabase } from './cloud';

/**
 * Cobrança via Mercado Pago. Toda a parte sensível (token do Mercado Pago,
 * preços cobrados, ativação do plano) roda na Edge Function `billing` e no
 * webhook `mp-webhook` — nunca no navegador. Ver supabase/functions/.
 */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const sb = await supabase();
  const { data, error } = await sb.functions.invoke('billing', { body });
  if (error) throw new Error('Não foi possível falar com o servidor de pagamentos. Tente novamente em instantes.');
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

/** Abre o checkout do Mercado Pago (Pix ou cartão) para assinar o Pro. */
export async function startCheckout(cycle: 'monthly' | 'yearly') {
  const { url } = await call<{ url: string }>({ action: 'checkout', cycle });
  window.location.href = url;
}

/** Cancela a assinatura (o acesso Pro segue até o fim do período pago). */
export async function cancelSubscription() {
  await call<{ ok: true }>({ action: 'cancel' });
}
