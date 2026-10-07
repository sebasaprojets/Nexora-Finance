// Edge Function `mp-webhook` — recebe as notificações do Mercado Pago e ativa/desativa o Pro.
// Configure no painel do Mercado Pago (Suas integrações → Webhooks):
//   URL: https://<projeto>.supabase.co/functions/v1/mp-webhook
//   Eventos: "Planos e assinaturas" (subscription_preapproval e subscription_authorized_payment)
// Faça o deploy com --no-verify-jwt (o Mercado Pago não envia login do Supabase);
// a autenticidade é conferida pela assinatura x-signature + MP_WEBHOOK_SECRET.
import { applyPreapproval, env, mp, type Preapproval } from '../_shared/mercadopago.ts';

async function validSignature(req: Request, dataId: string) {
  const header = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=') as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('MP_WEBHOOK_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === parts.v1;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const type: string = body.type ?? url.searchParams.get('type') ?? '';
    const dataId: string = String(body.data?.id ?? url.searchParams.get('data.id') ?? '');
    if (!dataId) return new Response('sem id', { status: 200 });
    if (!(await validSignature(req, dataId))) return new Response('assinatura inválida', { status: 401 });

    let preapprovalId: string | null = null;
    if (type === 'subscription_preapproval') preapprovalId = dataId;
    else if (type === 'subscription_authorized_payment') {
      const pay = await mp<{ preapproval_id?: string }>(`/authorized_payments/${dataId}`);
      preapprovalId = pay.preapproval_id ?? null;
    }
    if (preapprovalId) await applyPreapproval(await mp<Preapproval>(`/preapproval/${preapprovalId}`));
    return new Response('ok');
  } catch (e) {
    console.error(e);
    return new Response('erro', { status: 500 }); // o Mercado Pago tenta de novo
  }
});
