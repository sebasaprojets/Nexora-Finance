import type { FinanceData, ISODate } from '@/types';
import { cardSummary } from './finance';
import { dateInMonth, daysInMonth, today } from './dates';

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

export const EVENT_META: Record<EventKind, { label: string; color: string }> = {
  bill: { label: 'Conta', color: 'var(--series-2)' },
  invoice: { label: 'Fatura', color: 'var(--series-7)' },
  income: { label: 'Receita', color: 'var(--series-3)' },
  goal: { label: 'Meta', color: 'var(--series-1)' },
  reminder: { label: 'Lembrete', color: 'var(--series-4)' },
  subscription: { label: 'Assinatura', color: 'var(--series-5)' },
  debt: { label: 'Dívida', color: 'var(--series-8)' },
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
  for (const t of data.transactions) {
    if (t.recurrence !== 'monthly' || t.type === 'transfer' || t.cardId) continue;
    if (subNames.has(t.description.toLowerCase())) continue;
    const key = `${t.type}:${t.description.toLowerCase()}`;
    const prev = recurring.get(key);
    if (!prev || t.date > prev.date) recurring.set(key, t);
  }
  for (const t of data.transactions) {
    if (!inMonth(t.date) || t.type === 'transfer') continue;
    const isRecurringBill = t.recurrence !== 'none' && t.type === 'expense' && !t.cardId && !subNames.has(t.description.toLowerCase());
    if (t.type === 'income' || isRecurringBill)
      events.push({ id: `tx-${t.id}`, kind: t.type === 'income' ? 'income' : 'bill', date: t.date, title: t.description, amount: t.amount, done: t.date <= ref && t.status !== 'scheduled', href: '/app/transacoes', refId: t.id });
  }
  for (const [key, t] of recurring) {
    const day = Number(t.date.slice(8, 10));
    const date = dateInMonth(y, m, day);
    if (date <= t.date) continue;
    const already = events.some((e) => e.title.toLowerCase() === t.description.toLowerCase() && e.date.slice(0, 7) === month);
    if (already) continue;
    events.push({ id: `proj-${key}-${month}`, kind: t.type === 'income' ? 'income' : 'bill', date, title: t.description, amount: t.amount, done: false, projected: true, href: '/app/transacoes' });
  }

  for (const c of data.cards) {
    for (const inv of cardSummary(c, data.transactions, ref).invoices) {
      if (!inMonth(inv.dueDate) || inv.total <= 0) continue;
      events.push({ id: `inv-${inv.id}`, kind: 'invoice', date: inv.dueDate, title: `Fatura ${c.name}`, amount: inv.total - inv.paid > 0 ? inv.total - inv.paid : inv.total, done: inv.status === 'paid', href: '/app/cartoes', refId: inv.id });
    }
  }

  for (const s of data.subscriptions.filter((x) => x.active)) {
    if (s.cycle === 'yearly' && s.billingMonth !== m) continue;
    const date = dateInMonth(y, m, s.billingDay);
    events.push({ id: `sub-${s.id}-${month}`, kind: 'subscription', date, title: s.name, amount: s.amount, done: date <= ref, href: '/app/assinaturas', refId: s.id });
  }

  for (const d of data.debts.filter((x) => x.status !== 'paid')) {
    const date = dateInMonth(y, m, d.dueDay);
    events.push({ id: `debt-${d.id}-${month}`, kind: 'debt', date, title: `Parcela ${d.name}`, amount: d.installmentAmount, done: false, href: '/app/dividas', refId: d.id });
  }

  for (const g of data.goals) if (g.deadline && inMonth(g.deadline)) events.push({ id: `goal-${g.id}`, kind: 'goal', date: g.deadline, title: `Prazo da meta: ${g.name}`, amount: g.target, done: false, href: '/app/metas', refId: g.id });

  for (const r of data.reminders) if (inMonth(r.date)) events.push({ id: `rem-${r.id}`, kind: 'reminder', date: r.date, title: r.title, amount: r.amount, done: r.done, refId: r.id });

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}
