import type { FinanceData, ISODate } from '@/types';
import { cardSummary } from './finance';
import { dateInMonth, daysInMonth, today } from './dates';
import { t } from '@/i18n';

export type EventKind = 'bill' | 'invoice' | 'income' | 'goal' | 'reminder' | 'subscription' | 'debt';

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  date: ISODate;
  title: string;
  amount?: number;
  /** Já realizado (transação lançada / fatura paga / lembrete concluído). */
  done: boolean;
  /** Projeção de recorrência (ainda não lançada). */
  projected?: boolean;
  href?: string;
  refId?: string;
}

/** `label` é traduzido no idioma atual a cada leitura. */
export const EVENT_META: Record<EventKind, { label: string; color: string }> = {
  bill: { get label() { return t('Conta||a pagar'); }, color: 'var(--series-2)' },
  invoice: { get label() { return t('Fatura'); }, color: 'var(--series-7)' },
  income: { get label() { return t('Receita'); }, color: 'var(--series-3)' },
  goal: { get label() { return t('Meta'); }, color: 'var(--series-1)' },
  reminder: { get label() { return t('Lembrete'); }, color: 'var(--series-4)' },
  subscription: { get label() { return t('Assinatura'); }, color: 'var(--series-5)' },
  debt: { get label() { return t('Dívida'); }, color: 'var(--series-8)' },
};

/**
 * Eventos financeiros de um mês: lançamentos recorrentes (realizados ou
 * projetados), faturas, assinaturas, parcelas de dívidas, metas e lembretes.
 */
export function monthEvents(data: FinanceData, month: string, ref: ISODate = today()): CalendarEvent[] {
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
  const inMonth = (d: string) => d >= from && d <= to;
  const events: CalendarEvent[] = [];
  const subNames = new Set(data.subscriptions.map((s) => s.name.toLowerCase()));

  // Lançamentos recorrentes (receitas e contas). Realizados no mês aparecem como concluídos;
  // os que ainda não ocorreram são projetados a partir do último lançamento.
  const recurring = new Map<string, (typeof data.transactions)[number]>();
  for (const tx of data.transactions) {
    if (tx.recurrence !== 'monthly' || tx.type === 'transfer' || tx.cardId) continue;
    if (subNames.has(tx.description.toLowerCase())) continue;
    const key = `${tx.type}:${tx.description.toLowerCase()}`;
    const prev = recurring.get(key);
    if (!prev || tx.date > prev.date) recurring.set(key, tx);
  }
  for (const tx of data.transactions) {
    if (!inMonth(tx.date) || tx.type === 'transfer') continue;
    const isRecurringBill = tx.recurrence !== 'none' && tx.type === 'expense' && !tx.cardId && !subNames.has(tx.description.toLowerCase());
    if (tx.type === 'income' || isRecurringBill)
      events.push({ id: `tx-${tx.id}`, kind: tx.type === 'income' ? 'income' : 'bill', date: tx.date, title: tx.description, amount: tx.amount, done: tx.date <= ref && tx.status !== 'scheduled', href: '/app/transacoes', refId: tx.id });
  }
  for (const [key, tx] of recurring) {
    const day = Number(tx.date.slice(8, 10));
    const date = dateInMonth(y, m, day);
    if (date <= tx.date) continue;
    const already = events.some((e) => e.title.toLowerCase() === tx.description.toLowerCase() && e.date.slice(0, 7) === month);
    if (already) continue;
    events.push({ id: `proj-${key}-${month}`, kind: tx.type === 'income' ? 'income' : 'bill', date, title: tx.description, amount: tx.amount, done: false, projected: true, href: '/app/transacoes' });
  }

  for (const c of data.cards) {
    for (const inv of cardSummary(c, data.transactions, ref).invoices) {
      if (!inMonth(inv.dueDate) || inv.total <= 0) continue;
      events.push({ id: `inv-${inv.id}`, kind: 'invoice', date: inv.dueDate, title: t('Fatura {name}', { name: c.name }), amount: inv.total - inv.paid > 0 ? inv.total - inv.paid : inv.total, done: inv.status === 'paid', href: '/app/cartoes', refId: inv.id });
    }
  }

  for (const s of data.subscriptions.filter((x) => x.active)) {
    if (s.cycle === 'yearly' && s.billingMonth !== m) continue;
    const date = dateInMonth(y, m, s.billingDay);
    events.push({ id: `sub-${s.id}-${month}`, kind: 'subscription', date, title: s.name, amount: s.amount, done: date <= ref, href: '/app/assinaturas', refId: s.id });
  }

  for (const d of data.debts.filter((x) => x.status !== 'paid')) {
    const date = dateInMonth(y, m, d.dueDay);
    events.push({ id: `debt-${d.id}-${month}`, kind: 'debt', date, title: t('Parcela {name}', { name: d.name }), amount: d.installmentAmount, done: false, href: '/app/dividas', refId: d.id });
  }

  for (const g of data.goals) if (g.deadline && inMonth(g.deadline)) events.push({ id: `goal-${g.id}`, kind: 'goal', date: g.deadline, title: t('Prazo da meta: {name}', { name: g.name }), amount: g.target, done: false, href: '/app/metas', refId: g.id });

  for (const r of data.reminders) if (inMonth(r.date)) events.push({ id: `rem-${r.id}`, kind: 'reminder', date: r.date, title: r.title, amount: r.amount, done: r.done, refId: r.id });

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}
