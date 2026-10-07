import type { FinanceData } from '@/types';
import type { ExportTable } from './export';
import {
  INVESTMENT_LABELS,
  accountBalances,
  cardSummary,
  cashFlow,
  debtTotals,
  inPeriod,
  isRealized,
  netWorth,
  portfolioSummary,
  timeSeries,
  totalsByCategory,
  type Period,
} from './finance';
import { formatDate, formatMonthLong } from './dates';
import { formatMoney, formatPercent } from './format';
import { METHOD_LABELS } from './labels';

export type ReportKind =
  | 'expenses'
  | 'income'
  | 'profit'
  | 'losses'
  | 'cashflow'
  | 'networth'
  | 'cards'
  | 'categories'
  | 'investments'
  | 'debts';

export const REPORTS: { kind: ReportKind; title: string; description: string }[] = [
  { kind: 'expenses', title: 'Gastos', description: 'Todas as despesas do período com categoria, conta e método.' },
  { kind: 'income', title: 'Receitas', description: 'Entradas do período por origem.' },
  { kind: 'profit', title: 'Lucros', description: 'Resultado mensal (receitas − despesas) e margem.' },
  { kind: 'losses', title: 'Perdas', description: 'Meses com prejuízo e as maiores despesas que contribuíram.' },
  { kind: 'cashflow', title: 'Fluxo de caixa', description: 'Saldo inicial, entradas, saídas e saldo final por mês.' },
  { kind: 'networth', title: 'Patrimônio', description: 'Contas, investimentos, dívidas e patrimônio líquido.' },
  { kind: 'cards', title: 'Cartões', description: 'Limites, uso e faturas de cada cartão.' },
  { kind: 'categories', title: 'Categorias', description: 'Gastos e receitas por categoria, com participação.' },
  { kind: 'investments', title: 'Investimentos', description: 'Carteira, rentabilidade e proventos.' },
  { kind: 'debts', title: 'Dívidas', description: 'Saldos devedores, juros e parcelas.' },
];

const periodLabel = (p: Period) => `${formatDate(p.from)} a ${formatDate(p.to)}`;

export function buildReport(kind: ReportKind, data: FinanceData, p: Period): ExportTable {
  const cat = new Map(data.categories.map((c) => [c.id, c.name]));
  const acc = new Map(data.accounts.map((a) => [a.id, a.name]));
  const card = new Map(data.cards.map((c) => [c.id, c.name]));
  const txs = data.transactions.filter((t) => inPeriod(t, p) && isRealized(t)).sort((a, b) => a.date.localeCompare(b.date));

  switch (kind) {
    case 'expenses': {
      const rows = txs.filter((t) => t.type === 'expense');
      const total = rows.reduce((s, t) => s + t.amount, 0);
      return {
        title: 'Relatório de gastos',
        subtitle: periodLabel(p),
        columns: [
          { header: 'Data', key: 'date', type: 'date', width: 12 },
          { header: 'Descrição', key: 'desc', width: 30 },
          { header: 'Categoria', key: 'cat' },
          { header: 'Conta/Cartão', key: 'src', width: 22 },
          { header: 'Método', key: 'method' },
          { header: 'Valor', key: 'amount', type: 'money' },
        ],
        rows: rows.map((t) => ({ date: t.date, desc: t.description, cat: cat.get(t.categoryId ?? '') ?? '', src: t.cardId ? card.get(t.cardId) : acc.get(t.accountId ?? ''), method: METHOD_LABELS[t.method], amount: t.amount })),
        summary: [
          { label: 'Total de despesas', value: formatMoney(total) },
          { label: 'Quantidade', value: String(rows.length) },
          { label: 'Ticket médio', value: formatMoney(rows.length ? total / rows.length : 0) },
        ],
      };
    }
    case 'income': {
      const rows = txs.filter((t) => t.type === 'income');
      const total = rows.reduce((s, t) => s + t.amount, 0);
      return {
        title: 'Relatório de receitas',
        subtitle: periodLabel(p),
        columns: [
          { header: 'Data', key: 'date', type: 'date', width: 12 },
          { header: 'Descrição', key: 'desc', width: 30 },
          { header: 'Origem', key: 'cat' },
          { header: 'Conta', key: 'acc' },
          { header: 'Valor', key: 'amount', type: 'money' },
        ],
        rows: rows.map((t) => ({ date: t.date, desc: t.description, cat: cat.get(t.categoryId ?? '') ?? '', acc: acc.get(t.accountId ?? '') ?? '', amount: t.amount })),
        summary: [
          { label: 'Total de receitas', value: formatMoney(total) },
          { label: 'Quantidade', value: String(rows.length) },
        ],
      };
    }
    case 'profit':
    case 'losses': {
      const months = timeSeries(data.transactions, p, 'month');
      const filtered = kind === 'losses' ? months.filter((m) => m.net < 0) : months;
      const total = filtered.reduce((s, m) => s + m.net, 0);
      return {
        title: kind === 'profit' ? 'Relatório de lucros' : 'Relatório de perdas',
        subtitle: periodLabel(p),
        columns: [
          { header: 'Mês', key: 'month', width: 20 },
          { header: 'Receitas', key: 'income', type: 'money' },
          { header: 'Despesas', key: 'expense', type: 'money' },
          { header: 'Resultado', key: 'net', type: 'money' },
          { header: 'Margem', key: 'margin', type: 'percent' },
        ],
        rows: filtered.map((m) => ({ month: formatMonthLong(m.key), income: m.income, expense: m.expense, net: m.net, margin: m.income ? (m.net / m.income) * 100 : 0 })),
        summary:
          kind === 'profit'
            ? [
                { label: 'Resultado acumulado', value: formatMoney(total) },
                { label: 'Meses com lucro', value: String(months.filter((m) => m.net >= 0).length) },
              ]
            : [
                { label: 'Prejuízo acumulado', value: formatMoney(total) },
                { label: 'Meses com prejuízo', value: `${filtered.length} de ${months.length}` },
              ],
      };
    }
    case 'cashflow': {
      const rows = cashFlow(data.accounts, data.transactions, p, 'month');
      return {
        title: 'Fluxo de caixa',
        subtitle: periodLabel(p),
        columns: [
          { header: 'Mês', key: 'label' },
          { header: 'Saldo inicial', key: 'opening', type: 'money' },
          { header: 'Entradas', key: 'inflow', type: 'money' },
          { header: 'Saídas', key: 'outflow', type: 'money' },
          { header: 'Saldo final', key: 'closing', type: 'money' },
        ],
        rows: rows.map((r) => ({ ...r })),
      };
    }
    case 'networth': {
      const nw = netWorth(data, p.to);
      const bal = accountBalances(data.accounts, data.transactions, p.to);
      return {
        title: 'Patrimônio',
        subtitle: `Posição em ${formatDate(p.to)}`,
        columns: [
          { header: 'Item', key: 'item', width: 30 },
          { header: 'Tipo', key: 'type' },
          { header: 'Valor', key: 'value', type: 'money' },
        ],
        rows: [
          ...data.accounts.filter((a) => !a.archived).map((a) => ({ item: a.name, type: 'Conta', value: bal.get(a.id) ?? 0 })),
          ...data.investments.map((i) => ({ item: i.name, type: 'Investimento', value: i.currentValue })),
          ...data.debts.filter((d) => d.status !== 'paid').map((d) => ({ item: d.name, type: 'Dívida', value: -d.remaining })),
          ...(nw.cardDebt ? [{ item: 'Faturas de cartão em aberto', type: 'Cartão', value: -nw.cardDebt }] : []),
        ],
        summary: [
          { label: 'Saldo em contas', value: formatMoney(nw.cash) },
          { label: 'Investimentos', value: formatMoney(nw.investments) },
          { label: 'Dívidas + cartões', value: formatMoney(-(nw.debts + nw.cardDebt)) },
          { label: 'Patrimônio líquido', value: formatMoney(nw.total) },
        ],
      };
    }
    case 'cards': {
      const rows = data.cards.flatMap((c) => {
        const s = cardSummary(c, data.transactions);
        return s.invoices
          .filter((i) => i.dueDate >= p.from && i.periodStart <= p.to)
          .map((i) => ({ card: c.name, month: formatMonthLong(i.month), due: i.dueDate, total: i.total, paid: i.paid, status: { paid: 'Paga', open: 'Aberta', closed: 'Fechada', overdue: 'Atrasada', future: 'Futura' }[i.status] }));
      });
      return {
        title: 'Cartões e faturas',
        subtitle: periodLabel(p),
        columns: [
          { header: 'Cartão', key: 'card', width: 22 },
          { header: 'Fatura', key: 'month', width: 18 },
          { header: 'Vencimento', key: 'due', type: 'date' },
          { header: 'Total', key: 'total', type: 'money' },
          { header: 'Pago', key: 'paid', type: 'money' },
          { header: 'Status', key: 'status' },
        ],
        rows,
        summary: data.cards.map((c) => {
          const s = cardSummary(c, data.transactions);
          return { label: `${c.name} — limite usado`, value: `${formatMoney(s.used)} de ${formatMoney(c.limit)} (${formatPercent(s.usagePct)})` };
        }),
      };
    }
    case 'categories': {
      const exp = totalsByCategory(data.transactions, data.categories, p, 'expense');
      const inc = totalsByCategory(data.transactions, data.categories, p, 'income');
      return {
        title: 'Categorias',
        subtitle: periodLabel(p),
        columns: [
          { header: 'Categoria', key: 'name', width: 22 },
          { header: 'Tipo', key: 'kind' },
          { header: 'Lançamentos', key: 'count', type: 'number' },
          { header: 'Total', key: 'total', type: 'money' },
          { header: 'Participação', key: 'pct', type: 'percent' },
        ],
        rows: [...exp.map((c) => ({ name: c.category.name, kind: 'Despesa', count: c.count, total: c.total, pct: c.pct })), ...inc.map((c) => ({ name: c.category.name, kind: 'Receita', count: c.count, total: c.total, pct: c.pct }))],
      };
    }
    case 'investments': {
      const s = portfolioSummary(data.investments);
      return {
        title: 'Investimentos',
        subtitle: 'Posição atual da carteira (informativo — não é recomendação)',
        columns: [
          { header: 'Ativo', key: 'name', width: 28 },
          { header: 'Classe', key: 'type' },
          { header: 'Aplicado', key: 'invested', type: 'money' },
          { header: 'Atual', key: 'current', type: 'money' },
          { header: 'Rentabilidade', key: 'ret', type: 'percent' },
          { header: 'Proventos', key: 'div', type: 'money' },
        ],
        rows: data.investments.map((i) => ({ name: i.ticker ? `${i.name} (${i.ticker})` : i.name, type: INVESTMENT_LABELS[i.type], invested: i.invested, current: i.currentValue, ret: i.invested ? ((i.currentValue - i.invested) / i.invested) * 100 : 0, div: i.dividends })),
        summary: [
          { label: 'Patrimônio investido', value: formatMoney(s.current) },
          { label: 'Rentabilidade total', value: `${formatMoney(s.profit)} (${formatPercent(s.returnPct)})` },
          { label: 'Proventos', value: formatMoney(s.dividends) },
        ],
      };
    }
    case 'debts': {
      const t = debtTotals(data.debts);
      return {
        title: 'Dívidas',
        subtitle: 'Posição atual',
        columns: [
          { header: 'Dívida', key: 'name', width: 26 },
          { header: 'Credor', key: 'creditor' },
          { header: 'Total', key: 'total', type: 'money' },
          { header: 'Restante', key: 'remaining', type: 'money' },
          { header: 'Juros a.m.', key: 'rate', type: 'percent' },
          { header: 'Parcelas', key: 'inst' },
          { header: 'Parcela', key: 'amount', type: 'money' },
        ],
        rows: data.debts.map((d) => ({ name: d.name, creditor: d.creditor, total: d.total, remaining: d.remaining, rate: d.interestRate, inst: `${d.installmentsPaid}/${d.installments}`, amount: d.installmentAmount })),
        summary: [
          { label: 'Saldo devedor', value: formatMoney(t.remaining) },
          { label: 'Compromisso mensal', value: formatMoney(t.monthly) },
        ],
      };
    }
  }
}
