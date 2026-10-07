import type { AppNotification, FinanceData, NotificationKind, NotificationPreferences } from '@/types';
import { useFinance } from '@/store/finance';
import { useSettings } from '@/store/settings';
import { budgetUsage, cardSummary, goalProgress, nextCharge, unusualExpenses } from '@/lib/finance';
import { addDays, dateInMonth, diffDays, formatDate, monthKey, parseISODate, today } from '@/lib/dates';
import { formatMoney, formatNumber } from '@/lib/format';
import { t } from '@/i18n';

/**
 * Notificações da Nexora.
 * - Central in-app (store) — sempre.
 * - Notificação do sistema (desktop e celular via Service Worker/PWA) — quando
 *   o usuário ativou "push" e concedeu permissão.
 * - Web Push real (servidor → dispositivo, com o app fechado) requer backend
 *   com chave VAPID privada; aqui geramos a inscrição (`PushSubscription`) que
 *   deve ser enviada ao servidor (ver `supabase/functions/README.md`).
 */

const PREF_BY_KIND: Record<NotificationKind, keyof NotificationPreferences | null> = {
  bill_due: 'billDue',
  invoice_due: 'invoices',
  invoice_overdue: 'invoices',
  goal_reached: 'goals',
  budget_warning: 'budgets',
  budget_exceeded: 'budgets',
  new_transaction: 'transactions',
  unusual_spending: 'budgets',
  new_login: 'security',
  security: 'security',
  system: null,
};

export function pushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  return pushSupported() ? Notification.permission : 'unsupported';
}

async function showSystemNotification(n: Pick<AppNotification, 'title' | 'body' | 'href' | 'id'>) {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    body: n.body,
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icons/badge-72.png`,
    tag: n.id,
    // Rotas internas começam com '/'; o SW precisa do caminho completo (inclui a subpasta, se houver).
    data: { url: `${import.meta.env.BASE_URL}${(n.href ?? '/app/notificacoes').replace(/^\//, '')}` },
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(n.title, options);
    else new Notification(n.title, options);
  } catch {
    /* alguns navegadores móveis exigem SW — ignorar silenciosamente */
  }
}

/** Registra uma notificação respeitando as preferências do usuário. */
export function notifyUser(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  const prefs = useSettings.getState().notifications;
  const pref = PREF_BY_KIND[n.kind];
  if (pref && !prefs[pref]) return null;
  const created = useFinance.getState().notify(n);
  if (created && prefs.push) void showSystemNotification(created);
  return created;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Pede permissão e, se houver chave VAPID, inscreve o dispositivo no Web Push. */
export async function enablePush(): Promise<{ ok: boolean; reason?: string; subscription?: PushSubscriptionJSON }> {
  if (!pushSupported()) return { ok: false, reason: t('Seu navegador não suporta notificações. No iPhone, instale a Nexora na tela de início.') };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: t('Permissão negada. Você pode liberar nas configurações do navegador.') };
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (vapid && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) }));
      // TODO(backend): POST sub.toJSON() para /api/push/subscribe (tabela push_subscriptions).
      return { ok: true, subscription: sub.toJSON() };
    } catch {
      return { ok: true, reason: t('Notificações locais ativas. Web Push remoto indisponível neste dispositivo.') };
    }
  }
  return { ok: true };
}

export async function sendTestNotification() {
  await showSystemNotification({ id: `test-${Date.now()}`, title: 'Nexora Finance', body: t('Notificações ativadas com sucesso. 🎉'), href: '/app/notificacoes' });
}

// ---------------------------------------------------------------------------
// Regras de alerta — avaliadas ao abrir o app e quando os dados mudam.
// Cada alerta tem uma chave de deduplicação para não repetir.
// ---------------------------------------------------------------------------

type Alert = Omit<AppNotification, 'id' | 'createdAt' | 'read'>;

export function evaluateAlerts(data: FinanceData, ref = today()): Alert[] {
  const alerts: Alert[] = [];
  const brl = (v: number) => formatMoney(v, { currency: useSettings.getState().currency });

  for (const card of data.cards) {
    const s = cardSummary(card, data.transactions, ref);
    for (const inv of s.invoices) {
      const left = inv.total - inv.paid;
      if (left <= 0.01) continue;
      if (inv.status === 'overdue')
        alerts.push({ kind: 'invoice_overdue', title: t('Fatura {cartao} atrasada', { cartao: card.name }), body: t('{valor} venceu em {data}. Evite juros pagando o quanto antes.', { valor: brl(left), data: formatDate(inv.dueDate) }), href: '/app/cartoes', dedupeKey: `inv-overdue:${inv.id}` });
      else if (inv.status === 'closed') {
        const days = diffDays(ref, inv.dueDate);
        if (days <= 5)
          alerts.push({ kind: 'invoice_due', title: days === 0 ? t('Fatura {cartao} vence hoje', { cartao: card.name }) : days === 1 ? t('Fatura {cartao} vence amanhã', { cartao: card.name }) : t('Fatura {cartao} vence em {n} dias', { cartao: card.name, n: days }), body: t('Valor de {valor} · vencimento {data}.', { valor: brl(left), data: formatDate(inv.dueDate) }), href: '/app/cartoes', dedupeKey: `inv-due:${inv.id}` });
      }
    }
  }

  for (const b of budgetUsage(data.budgets, data.categories, data.transactions, monthKey(ref))) {
    const name = t(b.category?.name ?? 'Categoria');
    const m = monthKey(ref);
    if (b.level === 'exceeded')
      alerts.push({ kind: 'budget_exceeded', title: t('Orçamento de {categoria} ultrapassado', { categoria: name }), body: t('Você gastou {gasto} de {total} ({pct}%).', { gasto: brl(b.spent), total: brl(b.budget.amount), pct: Math.round(b.pct) }), href: '/app/orcamentos', dedupeKey: `bud-100:${b.budget.id}:${m}` });
    else if (b.level === 'alert')
      alerts.push({ kind: 'budget_warning', title: t('{categoria}: 90% do orçamento usado', { categoria: name }), body: t('Restam {valor} para este mês.', { valor: brl(b.remaining) }), href: '/app/orcamentos', dedupeKey: `bud-90:${b.budget.id}:${m}` });
    else if (b.level === 'attention')
      alerts.push({ kind: 'budget_warning', title: t('{categoria}: 70% do orçamento usado', { categoria: name }), body: t('Você já gastou {gasto} de {total}.', { gasto: brl(b.spent), total: brl(b.budget.amount) }), href: '/app/orcamentos', dedupeKey: `bud-70:${b.budget.id}:${m}` });
  }

  // Gasto fora do padrão (como o monitoramento diário de assistentes tipo Pierre):
  // despesa recente bem acima do ticket médio da categoria nos 90 dias anteriores.
  for (const u of unusualExpenses(data, ref)) {
    alerts.push({
      kind: 'unusual_spending',
      title: t('Gasto fora do padrão: {descricao}', { descricao: u.tx.description }),
      body: t('{valor} em {categoria} — cerca de {vezes}x o seu gasto médio nessa categoria ({media}). Foi você?', { valor: brl(u.tx.amount), categoria: t(u.category), vezes: formatNumber(u.ratio, 1), media: brl(u.avg) }),
      href: '/app/transacoes',
      dedupeKey: `unusual:${u.tx.id}`,
    });
  }

  for (const g of data.goals) {
    const p = goalProgress(g, ref);
    if (p.reached) alerts.push({ kind: 'goal_reached', title: t('Meta atingida: {meta} 🎉', { meta: g.name }), body: t('Você chegou a {valor}. Parabéns!', { valor: brl(p.current) }), href: '/app/metas', dedupeKey: `goal:${g.id}` });
  }

  for (const d of data.debts.filter((x) => x.status === 'active' || x.status === 'late')) {
    const r = parseISODate(ref);
    let due = dateInMonth(r.getFullYear(), r.getMonth() + 1, d.dueDay);
    if (due < ref) due = dateInMonth(r.getMonth() === 11 ? r.getFullYear() + 1 : r.getFullYear(), ((r.getMonth() + 1) % 12) + 1, d.dueDay);
    const days = diffDays(ref, due);
    if (days <= 3)
      alerts.push({ kind: 'bill_due', title: days === 0 ? t('Parcela de {divida} vence hoje', { divida: d.name }) : days === 1 ? t('Parcela de {divida} vence em 1 dia', { divida: d.name }) : t('Parcela de {divida} vence em {n} dias', { divida: d.name, n: days }), body: `${brl(d.installmentAmount)} · ${d.creditor}`, href: '/app/dividas', dedupeKey: `debt:${d.id}:${due}` });
  }

  for (const s of data.subscriptions.filter((x) => x.active)) {
    const next = nextCharge(s, ref);
    if (next <= addDays(ref, 1))
      alerts.push({ kind: 'bill_due', title: next === ref ? t('{assinatura} será cobrado hoje', { assinatura: s.name }) : t('{assinatura} será cobrado amanhã', { assinatura: s.name }), body: t('{valor} na sua assinatura.', { valor: brl(s.amount) }), href: '/app/assinaturas', dedupeKey: `sub:${s.id}:${next}` });
  }

  for (const r of data.reminders.filter((x) => !x.done)) {
    const days = diffDays(ref, r.date);
    if (days >= 0 && days <= 2)
      alerts.push({ kind: 'bill_due', title: t('Lembrete: {titulo}', { titulo: r.title }), body: `${days === 0 ? t('Hoje') : days === 1 ? t('Em 1 dia') : t('Em {n} dias', { n: days })}${r.amount ? ` · ${brl(r.amount)}` : ''}`, href: '/app/calendario', dedupeKey: `rem:${r.id}` });
  }
  return alerts;
}

export function runAlertRules(data: FinanceData) {
  for (const a of evaluateAlerts(data)) notifyUser(a);
}
