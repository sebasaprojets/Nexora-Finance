import type {
  Account,
  Budget,
  Category,
  CreditCard,
  Debt,
  FinanceData,
  Goal,
  ISODate,
  Investment,
  InvestmentType,
  Invoice,
  InvoiceStatus,
  Subscription,
  Transaction,
} from '@/types';
import {
  addDays,
  addMonths,
  dateInMonth,
  diffDays,
  eachDay,
  eachMonth,
  endOfMonth,
  formatDayMonth,
  formatMonthShort,
  monthKey,
  parseISODate,
  startOfMonth,
  startOfWeek,
  today,
} from './dates';
import { pctChange, round2 } from './format';

/**
 * Motor financeiro da Nexora.
 * Funções puras: recebem os dados e devolvem métricas. Nenhum número exibido na
 * interface é fixo — tudo é derivado daqui, a partir das transações do usuário.
 */

// ---------------------------------------------------------------------------
// Períodos
// ---------------------------------------------------------------------------

export type PeriodPreset = '7d' | '30d' | 'month' | '3m' | '6m' | '1y' | 'custom';

export interface Period {
  from: ISODate;
  to: ISODate;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  month: 'Este mês',
  '3m': '3 meses',
  '6m': '6 meses',
  '1y': '1 ano',
  custom: 'Personalizado',
};

export function periodFromPreset(preset: PeriodPreset, ref: ISODate = today(), custom?: Period): Period {
  switch (preset) {
    case '7d':
      return { from: addDays(ref, -6), to: ref };
    case '30d':
      return { from: addDays(ref, -29), to: ref };
    case 'month':
      return { from: startOfMonth(ref), to: ref };
    case '3m':
      return { from: startOfMonth(addMonths(ref, -2)), to: ref };
    case '6m':
      return { from: startOfMonth(addMonths(ref, -5)), to: ref };
    case '1y':
      return { from: startOfMonth(addMonths(ref, -11)), to: ref };
    case 'custom':
      return custom ?? { from: startOfMonth(ref), to: ref };
  }
}

/** Período imediatamente anterior, com a mesma duração. */
export function previousPeriod(p: Period, preset?: PeriodPreset): Period {
  if (preset === 'month') {
    const prevStart = addMonths(p.from, -1);
    const span = diffDays(p.from, p.to);
    const prevEnd = addDays(prevStart, span);
    return { from: prevStart, to: prevEnd > endOfMonth(prevStart) ? endOfMonth(prevStart) : prevEnd };
  }
  const len = diffDays(p.from, p.to) + 1;
  return { from: addDays(p.from, -len), to: addDays(p.from, -1) };
}

export type Granularity = 'day' | 'week' | 'month' | 'year';

export function autoGranularity(p: Period): Granularity {
  const days = diffDays(p.from, p.to) + 1;
  if (days <= 14) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

// ---------------------------------------------------------------------------
// Transações
// ---------------------------------------------------------------------------

/** Transação já efetivada (não agendada e não futura). */
export function isRealized(t: Transaction, ref: ISODate = today()): boolean {
  return t.status !== 'scheduled' && t.date <= ref;
}

export function inPeriod(t: Transaction, p: Period): boolean {
  return t.date >= p.from && t.date <= p.to;
}

/** Receitas e despesas contam no resultado; transferências e pagamentos de fatura não. */
export function isIncome(t: Transaction) {
  return t.type === 'income';
}
export function isExpense(t: Transaction) {
  return t.type === 'expense';
}

export interface PeriodSummary {
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  /** Taxa de economia (%) = resultado / receitas. */
  savingsRate: number;
}

export function summarize(txs: Transaction[], p: Period): PeriodSummary {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  const ref = today();
  for (const t of txs) {
    if (!inPeriod(t, p) || !isRealized(t, ref)) continue;
    if (t.type === 'income') {
      income += t.amount;
      incomeCount++;
    } else if (t.type === 'expense') {
      expense += t.amount;
      expenseCount++;
    }
  }
  const net = income - expense;
  return {
    income: round2(income),
    expense: round2(expense),
    net: round2(net),
    incomeCount,
    expenseCount,
    savingsRate: income > 0 ? (net / income) * 100 : 0,
  };
}

export interface SeriesPoint {
  key: string;
  label: string;
  from: ISODate;
  to: ISODate;
  income: number;
  expense: number;
  net: number;
}

function bucketKey(date: ISODate, g: Granularity): string {
  if (g === 'day') return date;
  if (g === 'week') return startOfWeek(date);
  if (g === 'month') return monthKey(date);
  return date.slice(0, 4);
}

export function buckets(p: Period, g: Granularity): { key: string; label: string; from: ISODate; to: ISODate }[] {
  if (g === 'day') return eachDay(p.from, p.to).map((d) => ({ key: d, label: formatDayMonth(d), from: d, to: d }));
  if (g === 'week') {
    const out: { key: string; label: string; from: ISODate; to: ISODate }[] = [];
    for (let w = startOfWeek(p.from); w <= p.to; w = addDays(w, 7)) {
      out.push({ key: w, label: formatDayMonth(w < p.from ? p.from : w), from: w, to: addDays(w, 6) });
    }
    return out;
  }
  if (g === 'month')
    return eachMonth(p.from, p.to).map((m) => ({
      key: m,
      label: formatMonthShort(m),
      from: `${m}-01`,
      to: endOfMonth(`${m}-01`),
    }));
  const years: { key: string; label: string; from: ISODate; to: ISODate }[] = [];
  for (let y = Number(p.from.slice(0, 4)); y <= Number(p.to.slice(0, 4)); y++)
    years.push({ key: String(y), label: String(y), from: `${y}-01-01`, to: `${y}-12-31` });
  return years;
}

export function timeSeries(txs: Transaction[], p: Period, g: Granularity = autoGranularity(p)): SeriesPoint[] {
  const bs = buckets(p, g);
  const map = new Map(bs.map((b) => [b.key, { ...b, income: 0, expense: 0, net: 0 }]));
  const ref = today();
  for (const t of txs) {
    if (t.type === 'transfer' || !inPeriod(t, p) || !isRealized(t, ref)) continue;
    const point = map.get(bucketKey(t.date, g));
    if (!point) continue;
    if (t.type === 'income') point.income += t.amount;
    else point.expense += t.amount;
  }
  return [...map.values()].map((pt) => ({
    ...pt,
    income: round2(pt.income),
    expense: round2(pt.expense),
    net: round2(pt.income - pt.expense),
  }));
}

export interface CategoryTotal {
  category: Category;
  total: number;
  pct: number;
  count: number;
}

export function totalsByCategory(
  txs: Transaction[],
  categories: Category[],
  p: Period,
  kind: 'income' | 'expense' = 'expense',
): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const acc = new Map<string, { total: number; count: number }>();
  let sum = 0;
  const ref = today();
  for (const t of txs) {
    if (t.type !== kind || !inPeriod(t, p) || !isRealized(t, ref)) continue;
    const id = t.categoryId ?? 'uncategorized';
    const cur = acc.get(id) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count++;
    acc.set(id, cur);
    sum += t.amount;
  }
  const fallback: Category = {
    id: 'uncategorized',
    name: 'Sem categoria',
    icon: 'circle-help',
    color: 'var(--series-8)',
    kind,
  };
  return [...acc.entries()]
    .map(([id, v]) => ({
      category: byId.get(id) ?? fallback,
      total: round2(v.total),
      count: v.count,
      pct: sum ? (v.total / sum) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Valores mensais por categoria — base de "Evolução dos gastos/receitas". */
export function monthlyByCategory(
  txs: Transaction[],
  months: string[],
  kind: 'income' | 'expense',
): Map<string, Map<string, number>> {
  const set = new Set(months);
  const out = new Map<string, Map<string, number>>(months.map((m) => [m, new Map()]));
  const ref = today();
  for (const t of txs) {
    if (t.type !== kind || !isRealized(t, ref)) continue;
    const m = monthKey(t.date);
    if (!set.has(m)) continue;
    const row = out.get(m)!;
    const id = t.categoryId ?? 'uncategorized';
    row.set(id, (row.get(id) ?? 0) + t.amount);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contas e saldos
// ---------------------------------------------------------------------------

/** Efeito de uma transação no saldo de uma conta. */
export function accountEffect(t: Transaction, accountId: string): number {
  if (t.type === 'income' && t.accountId === accountId) return t.amount;
  if (t.type === 'expense' && t.accountId === accountId && !t.cardId) return -t.amount;
  if (t.type === 'transfer') {
    let v = 0;
    if (t.accountId === accountId) v -= t.amount;
    if (t.toAccountId === accountId) v += t.amount;
    return v;
  }
  return 0;
}

export function accountBalance(account: Account, txs: Transaction[], asOf: ISODate = today()): number {
  let b = account.initialBalance;
  for (const t of txs) {
    if (t.date > asOf || t.status === 'scheduled') continue;
    b += accountEffect(t, account.id);
  }
  return round2(b);
}

export function accountBalances(accounts: Account[], txs: Transaction[], asOf: ISODate = today()) {
  const map = new Map<string, number>(accounts.map((a) => [a.id, a.initialBalance]));
  for (const t of txs) {
    if (t.date > asOf || t.status === 'scheduled') continue;
    const touched = new Set([t.accountId, t.toAccountId]);
    for (const id of touched) {
      if (id && map.has(id)) map.set(id, map.get(id)! + accountEffect(t, id));
    }
  }
  for (const [k, v] of map) map.set(k, round2(v));
  return map;
}

/** Saldo disponível = contas que não são de investimento. */
export function totalBalance(accounts: Account[], txs: Transaction[], asOf: ISODate = today()): number {
  const balances = accountBalances(accounts, txs, asOf);
  return round2(
    accounts.filter((a) => a.type !== 'investment' && !a.archived).reduce((s, a) => s + (balances.get(a.id) ?? 0), 0),
  );
}

export function accountFlows(accountId: string, txs: Transaction[], p: Period) {
  let inflow = 0;
  let outflow = 0;
  for (const t of txs) {
    if (!inPeriod(t, p) || !isRealized(t)) continue;
    const e = accountEffect(t, accountId);
    if (e > 0) inflow += e;
    else outflow -= e;
  }
  return { inflow: round2(inflow), outflow: round2(outflow) };
}

/** Saldo diário (fim do dia) de um conjunto de contas — base do sparkline e fluxo de caixa. */
export function balanceHistory(accounts: Account[], txs: Transaction[], p: Period): { date: ISODate; balance: number }[] {
  const ids = new Set(accounts.filter((a) => a.type !== 'investment').map((a) => a.id));
  const initial = accounts.filter((a) => ids.has(a.id)).reduce((s, a) => s + a.initialBalance, 0);
  const deltas = new Map<ISODate, number>();
  let before = initial;
  for (const t of txs) {
    if (t.status === 'scheduled' || t.date > p.to) continue;
    let e = 0;
    for (const id of ids) e += accountEffect(t, id);
    if (!e) continue;
    if (t.date < p.from) before += e;
    else deltas.set(t.date, (deltas.get(t.date) ?? 0) + e);
  }
  const out: { date: ISODate; balance: number }[] = [];
  let running = before;
  for (const d of eachDay(p.from, p.to)) {
    running += deltas.get(d) ?? 0;
    out.push({ date: d, balance: round2(running) });
  }
  return out;
}

export interface CashFlowRow {
  key: string;
  label: string;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
}

/**
 * Fluxo de caixa: saldo inicial + entradas − saídas = saldo final.
 * Considera apenas movimentações que afetam contas (compras no cartão entram
 * no caixa quando a fatura é paga).
 */
export function cashFlow(accounts: Account[], txs: Transaction[], p: Period, g: Granularity): CashFlowRow[] {
  const ids = new Set(accounts.filter((a) => a.type !== 'investment').map((a) => a.id));
  const bs = buckets(p, g);
  const rows = new Map(bs.map((b) => [b.key, { key: b.key, label: b.label, inflow: 0, outflow: 0 }]));
  let opening = accounts.filter((a) => ids.has(a.id)).reduce((s, a) => s + a.initialBalance, 0);
  for (const t of txs) {
    if (t.status === 'scheduled' || t.date > p.to) continue;
    let e = 0;
    for (const id of ids) e += accountEffect(t, id);
    if (!e) continue;
    if (t.date < p.from) {
      opening += e;
      continue;
    }
    const row = rows.get(bucketKey(t.date, g));
    if (!row) continue;
    if (e > 0) row.inflow += e;
    else row.outflow -= e;
  }
  const out: CashFlowRow[] = [];
  let running = opening;
  for (const b of bs) {
    const r = rows.get(b.key)!;
    const closing = running + r.inflow - r.outflow;
    out.push({
      key: r.key,
      label: r.label,
      opening: round2(running),
      inflow: round2(r.inflow),
      outflow: round2(r.outflow),
      closing: round2(closing),
    });
    running = closing;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cartões e faturas
// ---------------------------------------------------------------------------

function closingDateFor(card: CreditCard, year: number, month1: number): ISODate {
  return dateInMonth(year, month1, card.closingDay);
}

/** Data de fechamento da fatura em que uma compra cai (compras no dia do fechamento vão para a próxima). */
export function closingDateForPurchase(card: CreditCard, date: ISODate): ISODate {
  const d = parseISODate(date);
  const thisMonthClose = closingDateFor(card, d.getFullYear(), d.getMonth() + 1);
  if (date < thisMonthClose) return thisMonthClose;
  const next = addMonths(`${date.slice(0, 7)}-01`, 1);
  const nd = parseISODate(next);
  return closingDateFor(card, nd.getFullYear(), nd.getMonth() + 1);
}

/** Vencimento no mesmo mês do fechamento se o dia for posterior; senão, no mês seguinte. */
export function dueDateForClosing(card: CreditCard, closing: ISODate): ISODate {
  const dueMonth = parseISODate(addMonths(startOfMonth(closing), card.dueDay > card.closingDay ? 0 : 1));
  return dateInMonth(dueMonth.getFullYear(), dueMonth.getMonth() + 1, card.dueDay);
}

export function invoiceIdFor(card: CreditCard, closing: ISODate): string {
  return `${card.id}:${monthKey(dueDateForClosing(card, closing))}`;
}

export function cardInvoices(card: CreditCard, txs: Transaction[], ref: ISODate = today()): Invoice[] {
  const groups = new Map<string, { closing: ISODate; txs: Transaction[] }>();
  const payments = new Map<string, number>();
  for (const t of txs) {
    if (t.type === 'expense' && t.cardId === card.id) {
      const closing = closingDateForPurchase(card, t.date);
      const id = invoiceIdFor(card, closing);
      const g = groups.get(id) ?? { closing, txs: [] };
      g.txs.push(t);
      groups.set(id, g);
    } else if (t.type === 'transfer' && t.toCardId === card.id && t.invoiceId && t.status !== 'scheduled') {
      payments.set(t.invoiceId, (payments.get(t.invoiceId) ?? 0) + t.amount);
    }
  }
  // Garante a fatura atual mesmo sem compras.
  const currentClosing = closingDateForPurchase(card, ref);
  const currentId = invoiceIdFor(card, currentClosing);
  if (!groups.has(currentId)) groups.set(currentId, { closing: currentClosing, txs: [] });

  const invoices: Invoice[] = [];
  for (const [id, g] of groups) {
    const periodEnd = g.closing;
    const prevClose = (() => {
      const prev = addMonths(startOfMonth(g.closing), -1);
      const pd = parseISODate(prev);
      return closingDateFor(card, pd.getFullYear(), pd.getMonth() + 1);
    })();
    const dueDate = dueDateForClosing(card, g.closing);
    const total = round2(g.txs.reduce((s, t) => s + t.amount, 0));
    const paid = round2(payments.get(id) ?? 0);
    let status: InvoiceStatus;
    if (ref < prevClose) status = 'future';
    else if (ref < periodEnd) status = 'open';
    else if (paid >= total - 0.01) status = 'paid';
    else if (ref > dueDate) status = 'overdue';
    else status = 'closed';
    invoices.push({
      id,
      cardId: card.id,
      month: monthKey(dueDate),
      periodStart: prevClose,
      periodEnd,
      dueDate,
      total,
      paid,
      status,
      transactions: g.txs.sort((a, b) => b.date.localeCompare(a.date)),
    });
  }
  return invoices.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export interface CardSummary {
  card: CreditCard;
  invoices: Invoice[];
  current?: Invoice;
  previous?: Invoice;
  next?: Invoice;
  /** Fatura fechada aguardando pagamento ou em atraso. */
  pending?: Invoice;
  used: number;
  available: number;
  usagePct: number;
}

export function cardSummary(card: CreditCard, txs: Transaction[], ref: ISODate = today()): CardSummary {
  const invoices = cardInvoices(card, txs, ref);
  const idx = invoices.findIndex((i) => i.status === 'open');
  const current = idx >= 0 ? invoices[idx] : undefined;
  const previous = idx > 0 ? invoices[idx - 1] : undefined;
  const next = idx >= 0 ? invoices[idx + 1] : undefined;
  const pending = invoices.find((i) => i.status === 'overdue' || i.status === 'closed');
  const used = round2(invoices.reduce((s, i) => s + Math.max(0, i.total - i.paid), 0));
  return {
    card,
    invoices,
    current,
    previous,
    next,
    pending,
    used,
    available: round2(card.limit - used),
    usagePct: card.limit ? (used / card.limit) * 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export type BudgetLevel = 'ok' | 'attention' | 'alert' | 'exceeded';

export function budgetLevel(pct: number): BudgetLevel {
  if (pct >= 100) return 'exceeded';
  if (pct >= 90) return 'alert';
  if (pct >= 70) return 'attention';
  return 'ok';
}

export interface BudgetUsage {
  budget: Budget;
  category?: Category;
  spent: number;
  remaining: number;
  pct: number;
  level: BudgetLevel;
  /** Projeção de gasto até o fim do mês no ritmo atual. */
  projected: number;
}

export function budgetUsage(
  budgets: Budget[],
  categories: Category[],
  txs: Transaction[],
  month: string = monthKey(today()),
): BudgetUsage[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const from = `${month}-01`;
  const to = endOfMonth(from);
  const ref = today();
  const spentBy = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense' || t.date < from || t.date > to || !isRealized(t, ref) || !t.categoryId) continue;
    spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount);
  }
  const isCurrent = month === monthKey(ref);
  const elapsed = isCurrent ? parseISODate(ref).getDate() : 1;
  const total = parseISODate(to).getDate();
  return budgets
    .filter((b) => b.period === 'recurring' || b.period === month)
    .map((b) => {
      const spent = round2(spentBy.get(b.categoryId) ?? 0);
      const pct = b.amount ? (spent / b.amount) * 100 : 0;
      return {
        budget: b,
        category: byId.get(b.categoryId),
        spent,
        remaining: round2(b.amount - spent),
        pct,
        level: budgetLevel(pct),
        projected: isCurrent ? round2((spent / elapsed) * total) : spent,
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------

export interface GoalProgress {
  goal: Goal;
  current: number;
  pct: number;
  remaining: number;
  /** Aporte mensal necessário para cumprir o prazo. */
  monthlyNeeded: number | null;
  /** Média mensal dos aportes dos últimos 6 meses. */
  avgMonthly: number;
  /** Meses estimados até a meta no ritmo atual. */
  monthsToGoal: number | null;
  projectedDate: ISODate | null;
  monthsLeft: number | null;
  onTrack: boolean | null;
  reached: boolean;
}

export function goalProgress(goal: Goal, ref: ISODate = today()): GoalProgress {
  const current = round2(goal.initialAmount + goal.contributions.reduce((s, c) => s + c.amount, 0));
  const remaining = Math.max(0, round2(goal.target - current));
  const pct = goal.target ? Math.min(100, (current / goal.target) * 100) : 0;
  const sixAgo = addMonths(ref, -6);
  const recent = goal.contributions.filter((c) => c.date > sixAgo && c.date <= ref);
  const firstDate = recent.length ? recent.reduce((m, c) => (c.date < m ? c.date : m), recent[0].date) : null;
  const span = firstDate ? Math.max(1, Math.min(6, Math.ceil(diffDays(firstDate, ref) / 30.44))) : 6;
  const avgMonthly = round2(recent.reduce((s, c) => s + c.amount, 0) / span);
  let monthsLeft: number | null = null;
  let monthsNeeded: number | null = null;
  if (goal.deadline) {
    monthsLeft = Math.max(0, Math.ceil(diffDays(ref, goal.deadline) / 30.44));
    monthsNeeded = monthsLeft > 0 ? round2(remaining / monthsLeft) : remaining;
  }
  const monthsToGoal = remaining === 0 ? 0 : avgMonthly > 0 ? Math.ceil(remaining / avgMonthly) : null;
  return {
    goal,
    current,
    pct,
    remaining,
    monthlyNeeded: monthsNeeded,
    avgMonthly,
    monthsToGoal,
    projectedDate: monthsToGoal !== null ? addMonths(ref, monthsToGoal) : null,
    monthsLeft,
    onTrack:
      remaining === 0 ? true : goal.deadline && monthsToGoal !== null && monthsLeft !== null ? monthsToGoal <= monthsLeft : null,
    reached: remaining === 0,
  };
}

// ---------------------------------------------------------------------------
// Dívidas
// ---------------------------------------------------------------------------

export interface PayoffStep {
  month: string;
  payments: { debtId: string; amount: number }[];
  remainingTotal: number;
}

export interface PayoffPlan {
  strategy: 'avalanche' | 'snowball';
  months: number;
  totalInterest: number;
  schedule: PayoffStep[];
  order: string[];
  feasible: boolean;
}

/**
 * Plano de quitação: paga o mínimo (parcela) em todas e direciona o extra
 * para a dívida prioritária (maior juros = avalanche; menor saldo = bola de neve).
 */
export function payoffPlan(debts: Debt[], extraPerMonth: number, strategy: 'avalanche' | 'snowball', ref = today()): PayoffPlan {
  const active = debts.filter((d) => d.status !== 'paid' && d.remaining > 0).map((d) => ({ ...d }));
  const order = [...active]
    .sort((a, b) => (strategy === 'avalanche' ? b.interestRate - a.interestRate : a.remaining - b.remaining))
    .map((d) => d.id);
  const schedule: PayoffStep[] = [];
  let totalInterest = 0;
  let month = 0;
  const budget = active.reduce((s, d) => s + d.installmentAmount, 0) + extraPerMonth;
  while (active.some((d) => d.remaining > 0.01) && month < 360) {
    month++;
    let available = budget;
    const payments: { debtId: string; amount: number }[] = [];
    for (const d of active) {
      if (d.remaining <= 0) continue;
      const interest = d.remaining * (d.interestRate / 100);
      d.remaining += interest;
      totalInterest += interest;
    }
    for (const d of active) {
      if (d.remaining <= 0) continue;
      const pay = Math.min(d.remaining, d.installmentAmount, available);
      d.remaining -= pay;
      available -= pay;
      payments.push({ debtId: d.id, amount: pay });
    }
    for (const id of order) {
      const d = active.find((x) => x.id === id)!;
      if (available <= 0 || d.remaining <= 0) continue;
      const pay = Math.min(d.remaining, available);
      d.remaining -= pay;
      available -= pay;
      const existing = payments.find((p) => p.debtId === id);
      if (existing) existing.amount += pay;
      else payments.push({ debtId: id, amount: pay });
    }
    schedule.push({
      month: monthKey(addMonths(ref, month)),
      payments: payments.map((p) => ({ ...p, amount: round2(p.amount) })),
      remainingTotal: round2(active.reduce((s, d) => s + Math.max(0, d.remaining), 0)),
    });
  }
  return {
    strategy,
    months: month,
    totalInterest: round2(totalInterest),
    schedule,
    order,
    feasible: month < 360,
  };
}

export function debtTotals(debts: Debt[]) {
  const active = debts.filter((d) => d.status !== 'paid');
  return {
    total: round2(active.reduce((s, d) => s + d.total, 0)),
    remaining: round2(active.reduce((s, d) => s + d.remaining, 0)),
    monthly: round2(active.reduce((s, d) => s + d.installmentAmount, 0)),
    count: active.length,
  };
}

// ---------------------------------------------------------------------------
// Investimentos
// ---------------------------------------------------------------------------

export const INVESTMENT_LABELS: Record<InvestmentType, string> = {
  fixed_income: 'Renda fixa',
  stocks: 'Ações',
  reits: 'FIIs',
  etfs: 'ETFs',
  crypto: 'Criptomoedas',
  funds: 'Fundos',
  pension: 'Previdência',
};

export function portfolioSummary(investments: Investment[]) {
  const invested = investments.reduce((s, i) => s + i.invested, 0);
  const current = investments.reduce((s, i) => s + i.currentValue, 0);
  const dividends = investments.reduce((s, i) => s + i.dividends, 0);
  const byType = new Map<InvestmentType, number>();
  for (const i of investments) byType.set(i.type, (byType.get(i.type) ?? 0) + i.currentValue);
  const months = [...new Set(investments.flatMap((i) => i.history.map((h) => h.month)))].sort();
  const history = months.map((m) => ({
    month: m,
    value: round2(investments.reduce((s, i) => s + (i.history.find((h) => h.month === m)?.value ?? 0), 0)),
  }));
  return {
    invested: round2(invested),
    current: round2(current),
    dividends: round2(dividends),
    profit: round2(current - invested),
    returnPct: invested ? ((current - invested) / invested) * 100 : 0,
    allocation: [...byType.entries()]
      .map(([type, value]) => ({ type, label: INVESTMENT_LABELS[type], value: round2(value), pct: current ? (value / current) * 100 : 0 }))
      .sort((a, b) => b.value - a.value),
    history,
  };
}

// ---------------------------------------------------------------------------
// Assinaturas
// ---------------------------------------------------------------------------

export function nextCharge(sub: Subscription, ref: ISODate = today()): ISODate {
  const d = parseISODate(ref);
  if (sub.cycle === 'monthly') {
    const thisMonth = dateInMonth(d.getFullYear(), d.getMonth() + 1, sub.billingDay);
    if (thisMonth >= ref) return thisMonth;
    const n = parseISODate(addMonths(startOfMonth(ref), 1));
    return dateInMonth(n.getFullYear(), n.getMonth() + 1, sub.billingDay);
  }
  const m = sub.billingMonth ?? 1;
  const thisYear = dateInMonth(d.getFullYear(), m, sub.billingDay);
  return thisYear >= ref ? thisYear : dateInMonth(d.getFullYear() + 1, m, sub.billingDay);
}

export function subscriptionMonthly(sub: Subscription): number {
  return sub.cycle === 'monthly' ? sub.amount : sub.amount / 12;
}

export function subscriptionsSummary(subs: Subscription[], ref: ISODate = today()) {
  const active = subs.filter((s) => s.active);
  const monthly = round2(active.reduce((s, x) => s + subscriptionMonthly(x), 0));
  const upcoming = active
    .map((s) => ({ sub: s, date: nextCharge(s, ref) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { monthly, yearly: round2(monthly * 12), count: active.length, upcoming };
}

// ---------------------------------------------------------------------------
// Visão consolidada e indicadores
// ---------------------------------------------------------------------------

export function netWorth(data: FinanceData, ref: ISODate = today()) {
  const balances = accountBalances(data.accounts, data.transactions, ref);
  const cash = data.accounts.filter((a) => a.type !== 'investment' && !a.archived).reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
  const investmentAccounts = data.accounts.filter((a) => a.type === 'investment').reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
  const investments = data.investments.reduce((s, i) => s + i.currentValue, 0) + investmentAccounts;
  const debts = debtTotals(data.debts).remaining;
  const cardDebt = data.cards.reduce((s, c) => s + cardSummary(c, data.transactions, ref).used, 0);
  return {
    cash: round2(cash),
    investments: round2(investments),
    debts: round2(debts),
    cardDebt: round2(cardDebt),
    total: round2(cash + investments - debts - cardDebt),
  };
}

/** Média mensal dos últimos `n` meses completos. */
export function monthlyAverages(txs: Transaction[], n = 3, ref: ISODate = today()) {
  const to = addDays(startOfMonth(ref), -1);
  const from = startOfMonth(addMonths(ref, -n));
  const s = summarize(txs, { from, to });
  return { income: round2(s.income / n), expense: round2(s.expense / n), net: round2(s.net / n) };
}

export interface FinancialIndicators {
  savingsRate: number;
  profitMargin: number;
  revenueGrowth: number | null;
  expenseGrowth: number | null;
  debtToIncome: number;
  reserveMonths: number;
}

/**
 * Indicadores do período (crescimentos comparam o período com o anterior de mesma duração).
 * Reserva = (contas poupança/carteira digital + renda fixa) / despesa média mensal.
 */
export function indicators(data: FinanceData, p: Period, prev: Period): FinancialIndicators {
  const cur = summarize(data.transactions, p);
  const before = summarize(data.transactions, prev);
  const avg = monthlyAverages(data.transactions, 3);
  const balances = accountBalances(data.accounts, data.transactions);
  const liquid =
    data.accounts.filter((a) => a.type === 'savings').reduce((s, a) => s + (balances.get(a.id) ?? 0), 0) +
    data.investments.filter((i) => i.type === 'fixed_income').reduce((s, i) => s + i.currentValue, 0);
  const debt = debtTotals(data.debts);
  return {
    savingsRate: cur.savingsRate,
    profitMargin: cur.income ? (cur.net / cur.income) * 100 : 0,
    revenueGrowth: pctChange(cur.income, before.income),
    expenseGrowth: pctChange(cur.expense, before.expense),
    debtToIncome: avg.income ? (debt.monthly / avg.income) * 100 : 0,
    reserveMonths: avg.expense ? liquid / avg.expense : 0,
  };
}

// ---------------------------------------------------------------------------
// DRE simplificada
// ---------------------------------------------------------------------------

export interface DRE {
  revenue: number;
  costs: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  netMargin: number;
}

/** Custos = categorias de natureza fixa; Despesas = variáveis. */
export function dre(txs: Transaction[], categories: Category[], p: Period): DRE {
  const nature = new Map(categories.map((c) => [c.id, c.nature ?? 'variable']));
  let revenue = 0;
  let costs = 0;
  let expenses = 0;
  const ref = today();
  for (const t of txs) {
    if (!inPeriod(t, p) || !isRealized(t, ref)) continue;
    if (t.type === 'income') revenue += t.amount;
    else if (t.type === 'expense') {
      if (nature.get(t.categoryId ?? '') === 'fixed') costs += t.amount;
      else expenses += t.amount;
    }
  }
  const grossProfit = revenue - costs;
  const netProfit = grossProfit - expenses;
  return {
    revenue: round2(revenue),
    costs: round2(costs),
    expenses: round2(expenses),
    grossProfit: round2(grossProfit),
    netProfit: round2(netProfit),
    netMargin: revenue ? (netProfit / revenue) * 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// Heatmap diário
// ---------------------------------------------------------------------------

export interface DayActivity {
  date: ISODate;
  income: number;
  expense: number;
  net: number;
  count: number;
}

export function dailyActivity(txs: Transaction[], p: Period): Map<ISODate, DayActivity> {
  const map = new Map<ISODate, DayActivity>();
  const ref = today();
  for (const t of txs) {
    if (t.type === 'transfer' || !inPeriod(t, p) || !isRealized(t, ref)) continue;
    const a = map.get(t.date) ?? { date: t.date, income: 0, expense: 0, net: 0, count: 0 };
    if (t.type === 'income') a.income += t.amount;
    else a.expense += t.amount;
    a.net = a.income - a.expense;
    a.count++;
    map.set(t.date, a);
  }
  return map;
}

/** Quartis de gasto diário, usados para os níveis Baixa/Média/Alta/Muito alta. */
export function quantileThresholds(values: number[]): [number, number, number] {
  const v = values.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return [0, 0, 0];
  const q = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return [q(0.25), q(0.5), q(0.75)];
}
