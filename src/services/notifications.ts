import type { AppNotification, FinanceData, NotificationKind, NotificationPreferences } from '@/types';
import { useFinance } from '@/store/finance';
import { useSettings } from '@/store/settings';
import { budgetUsage, cardSummary, goalProgress, nextCharge, unusualExpenses } from '@/lib/finance';
import { addDays, dateInMonth, diffDays, formatDate, monthKey, parseISODate, today } from '@/lib/dates';
import { formatMoney } from '@/lib/format';

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
  if (!pushSupported()) return { ok: false, reason: 'Seu navegador não suporta notificações. No iPhone, instale a Nexora na tela de início.' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'Permissão negada. Você pode liberar nas configurações do navegador.' };
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
      return { ok: true, reason: 'Notificações locais ativas. Web Push remoto indisponível neste dispositivo.' };
    }
  }
  return { ok: true };
}

export async function sendTestNotification() {
  await showSystemNotification({ id: `test-${Date.now()}`, title: 'Nexora Finance', body: 'Notificações ativadas com sucesso. 🎉', href: '/app/notificacoes' });
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
        alerts.push({ kind: 'invoice_overdue', title: `Fatura ${card.name} atrasada`, body: `${brl(left)} venceu em ${formatDate(inv.dueDate)}. Evite juros pagando o quanto antes.`, href: '/app/cartoes', dedupeKey: `inv-overdue:${inv.id}` });
      else if (inv.status === 'closed') {
        const days = diffDays(ref, inv.dueDate);
        if (days <= 5)
          alerts.push({ kind: 'invoice_due', title: `Fatura ${card.name} vence ${days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`}`, body: `Valor de ${brl(left)} · vencimento ${formatDate(inv.dueDate)}.`, href: '/app/cartoes', dedupeKey: `inv-due:${inv.id}` });
      }
    }
  }

  for (const b of budgetUsage(data.budgets, data.categories, data.transactions, monthKey(ref))) {
    const name = b.category?.name ?? 'Categoria';
    const m = monthKey(ref);
    if (b.level === 'exceeded')
      alerts.push({ kind: 'budget_exceeded', title: `Orçamento de ${name} ultrapassado`, body: `Você gastou ${brl(b.spent)} de ${brl(b.budget.amount)} (${Math.round(b.pct)}%).`, href: '/app/orcamentos', dedupeKey: `bud-100:${b.budget.id}:${m}` });
    else if (b.level === 'alert')
      alerts.push({ kind: 'budget_warning', title: `${name}: 90% do orçamento usado`, body: `Restam ${brl(b.remaining)} para este mês.`, href: '/app/orcamentos', dedupeKey: `bud-90:${b.budget.id}:${m}` });
    else if (b.level === 'attention')
      alerts.push({ kind: 'budget_warning', title: `${name}: 70% do orçamento usado`, body: `Você já gastou ${brl(b.spent)} de ${brl(b.budget.amount)}.`, href: '/app/orcamentos', dedupeKey: `bud-70:${b.budget.id}:${m}` });
  }

  // Gasto fora do padrão (como o monitoramento diário de assistentes tipo Pierre):
  // despesa recente bem acima do ticket médio da categoria nos 90 dias anteriores.
  for (const u of unusualExpenses(data, ref)) {
    alerts.push({
      kind: 'unusual_spending',
      title: `Gasto fora do padrão: ${u.tx.description}`,
      body: `${brl(u.tx.amount)} em ${u.category} — cerca de ${u.ratio.toFixed(1).replace('.', ',')}x o seu gasto médio nessa categoria (${brl(u.avg)}). Foi você?`,
      href: '/app/transacoes',
      dedupeKey: `unusual:${u.tx.id}`,
    });
  }

  for (const g of data.goals) {
    const p = goalProgress(g, ref);
    if (p.reached) alerts.push({ kind: 'goal_reached', title: `Meta atingida: ${g.name} 🎉`, body: `Você chegou a ${brl(p.current)}. Parabéns!`, href: '/app/metas', dedupeKey: `goal:${g.id}` });
  }

  for (const d of data.debts.filter((x) => x.status === 'active' || x.status === 'late')) {
    const r = parseISODate(ref);
    let due = dateInMonth(r.getFullYear(), r.getMonth() + 1, d.dueDay);
    if (due < ref) due = dateInMonth(r.getMonth() === 11 ? r.getFullYear() + 1 : r.getFullYear(), ((r.getMonth() + 1) % 12) + 1, d.dueDay);
    const days = diffDays(ref, due);
    if (days <= 3)
      alerts.push({ kind: 'bill_due', title: `Parcela de ${d.name} vence ${days === 0 ? 'hoje' : `em ${days} dia${days > 1 ? 's' : ''}`}`, body: `${brl(d.installmentAmount)} · ${d.creditor}`, href: '/app/dividas', dedupeKey: `debt:${d.id}:${due}` });
  }

  for (const s of data.subscriptions.filter((x) => x.active)) {
    const next = nextCharge(s, ref);
    if (next <= addDays(ref, 1))
      alerts.push({ kind: 'bill_due', title: `${s.name} será cobrado ${next === ref ? 'hoje' : 'amanhã'}`, body: `${brl(s.amount)} na sua assinatura.`, href: '/app/assinaturas', dedupeKey: `sub:${s.id}:${next}` });
  }

  for (const r of data.reminders.filter((x) => !x.done)) {
    const days = diffDays(ref, r.date);
    if (days >= 0 && days <= 2)
      alerts.push({ kind: 'bill_due', title: `Lembrete: ${r.title}`, body: `${days === 0 ? 'Hoje' : `Em ${days} dia${days > 1 ? 's' : ''}`}${r.amount ? ` · ${brl(r.amount)}` : ''}`, href: '/app/calendario', dedupeKey: `rem:${r.id}` });
  }
  return alerts;
}

export function runAlertRules(data: FinanceData) {
  for (const a of evaluateAlerts(data)) notifyUser(a);
}
