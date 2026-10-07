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
import { t } from '@/i18n';

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

/** `title` e `description` são traduzidos no idioma atual a cada leitura. */
export const REPORTS: { kind: ReportKind; title: string; description: string }[] = [
  { kind: 'expenses', get title() { return t('Gastos'); }, get description() { return t('Todas as despesas do período com categoria, conta e método.'); } },
  { kind: 'income', get title() { return t('Receitas'); }, get description() { return t('Entradas do período por origem.'); } },
  { kind: 'profit', get title() { return t('Lucros'); }, get description() { return t('Resultado mensal (receitas − despesas) e margem.'); } },
  { kind: 'losses', get title() { return t('Perdas'); }, get description() { return t('Meses com prejuízo e as maiores despesas que contribuíram.'); } },
  { kind: 'cashflow', get title() { return t('Fluxo de caixa'); }, get description() { return t('Saldo inicial, entradas, saídas e saldo final por mês.'); } },
  { kind: 'networth', get title() { return t('Patrimônio'); }, get description() { return t('Contas, investimentos, dívidas e patrimônio líquido.'); } },
  { kind: 'cards', get title() { return t('Cartões'); }, get description() { return t('Limites, uso e faturas de cada cartão.'); } },
  { kind: 'categories', get title() { return t('Categorias'); }, get description() { return t('Gastos e receitas por categoria, com participação.'); } },
  { kind: 'investments', get title() { return t('Investimentos'); }, get description() { return t('Carteira, rentabilidade e proventos.'); } },
  { kind: 'debts', get title() { return t('Dívidas'); }, get description() { return t('Saldos devedores, juros e parcelas.'); } },
];

const periodLabel = (p: Period) => t('{from} a {to}', { from: formatDate(p.from), to: formatDate(p.to) });

export function buildReport(kind: ReportKind, data: FinanceData, p: Period): ExportTable {
  const cat = new Map(data.categories.map((c) => [c.id, t(c.name)]));
  const acc = new Map(data.accounts.map((a) => [a.id, a.name]));
  const card = new Map(data.cards.map((c) => [c.id, c.name]));
  const txs = data.transactions.filter((tx) => inPeriod(tx, p) && isRealized(tx)).sort((a, b) => a.date.localeCompare(b.date));

  switch (kind) {
    case 'expenses': {
      const rows = txs.filter((tx) => tx.type === 'expense');
      const total = rows.reduce((s, tx) => s + tx.amount, 0);
      return {
        title: t('Relatório de gastos'),
        subtitle: periodLabel(p),
        columns: [
          { header: t('Data'), key: 'date', type: 'date', width: 12 },
          { header: t('Descrição'), key: 'desc', width: 30 },
          { header: t('Categoria'), key: 'cat' },
          { header: t('Conta/Cartão'), key: 'src', width: 22 },
          { header: t('Método'), key: 'method' },
          { header: t('Valor'), key: 'amount', type: 'money' },
        ],
        rows: rows.map((tx) => ({ date: tx.date, desc: tx.description, cat: cat.get(tx.categoryId ?? '') ?? '', src: tx.cardId ? card.get(tx.cardId) : acc.get(tx.accountId ?? ''), method: t(METHOD_LABELS[tx.method]), amount: tx.amount })),
        summary: [
          { label: t('Total de despesas'), value: formatMoney(total) },
          { label: t('Quantidade'), value: String(rows.length) },
          { label: t('Ticket médio'), value: formatMoney(rows.length ? total / rows.length : 0) },
        ],
      };
    }
    case 'income': {
      const rows = txs.filter((tx) => tx.type === 'income');
      const total = rows.reduce((s, tx) => s + tx.amount, 0);
      return {
        title: t('Relatório de receitas'),
        subtitle: periodLabel(p),
        columns: [
          { header: t('Data'), key: 'date', type: 'date', width: 12 },
          { header: t('Descrição'), key: 'desc', width: 30 },
          { header: t('Origem'), key: 'cat' },
          { header: t('Conta'), key: 'acc' },
          { header: t('Valor'), key: 'amount', type: 'money' },
        ],
        rows: rows.map((tx) => ({ date: tx.date, desc: tx.description, cat: cat.get(tx.categoryId ?? '') ?? '', acc: acc.get(tx.accountId ?? '') ?? '', amount: tx.amount })),
        summary: [
          { label: t('Total de receitas'), value: formatMoney(total) },
          { label: t('Quantidade'), value: String(rows.length) },
        ],
      };
    }
    case 'profit':
    case 'losses': {
      const months = timeSeries(data.transactions, p, 'month');
      const filtered = kind === 'losses' ? months.filter((m) => m.net < 0) : months;
      const total = filtered.reduce((s, m) => s + m.net, 0);
      return {
        title: kind === 'profit' ? t('Relatório de lucros') : t('Relatório de perdas'),
        subtitle: periodLabel(p),
        columns: [
          { header: t('Mês'), key: 'month', width: 20 },
          { header: t('Receitas'), key: 'income', type: 'money' },
          { header: t('Despesas'), key: 'expense', type: 'money' },
          { header: t('Resultado'), key: 'net', type: 'money' },
          { header: t('Margem'), key: 'margin', type: 'percent' },
        ],
        rows: filtered.map((m) => ({ month: formatMonthLong(m.key), income: m.income, expense: m.expense, net: m.net, margin: m.income ? (m.net / m.income) * 100 : 0 })),
        summary:
          kind === 'profit'
            ? [
                { label: t('Resultado acumulado'), value: formatMoney(total) },
                { label: t('Meses com lucro'), value: String(months.filter((m) => m.net >= 0).length) },
              ]
            : [
                { label: t('Prejuízo acumulado'), value: formatMoney(total) },
                { label: t('Meses com prejuízo'), value: t('{n} de {total}', { n: filtered.length, total: months.length }) },
              ],
      };
    }
    case 'cashflow': {
      const rows = cashFlow(data.accounts, data.transactions, p, 'month');
      return {
        title: t('Fluxo de caixa'),
        subtitle: periodLabel(p),
        columns: [
          { header: t('Mês'), key: 'label' },
          { header: t('Saldo inicial'), key: 'opening', type: 'money' },
          { header: t('Entradas'), key: 'inflow', type: 'money' },
          { header: t('Saídas'), key: 'outflow', type: 'money' },
          { header: t('Saldo final'), key: 'closing', type: 'money' },
        ],
        rows: rows.map((r) => ({ ...r })),
      };
    }
    case 'networth': {
      const nw = netWorth(data, p.to);
      const bal = accountBalances(data.accounts, data.transactions, p.to);
      return {
        title: t('Patrimônio'),
        subtitle: t('Posição em {date}', { date: formatDate(p.to) }),
        columns: [
          { header: t('Item'), key: 'item', width: 30 },
          { header: t('Tipo'), key: 'type' },
          { header: t('Valor'), key: 'value', type: 'money' },
        ],
        rows: [
          ...data.accounts.filter((a) => !a.archived).map((a) => ({ item: a.name, type: t('Conta'), value: bal.get(a.id) ?? 0 })),
          ...data.investments.map((i) => ({ item: i.name, type: t('Investimento'), value: i.currentValue })),
          ...data.debts.filter((d) => d.status !== 'paid').map((d) => ({ item: d.name, type: t('Dívida'), value: -d.remaining })),
          ...(nw.cardDebt ? [{ item: t('Faturas de cartão em aberto'), type: t('Cartão'), value: -nw.cardDebt }] : []),
        ],
        summary: [
          { label: t('Saldo em contas'), value: formatMoney(nw.cash) },
          { label: t('Investimentos'), value: formatMoney(nw.investments) },
          { label: t('Dívidas + cartões'), value: formatMoney(-(nw.debts + nw.cardDebt)) },
          { label: t('Patrimônio líquido'), value: formatMoney(nw.total) },
        ],
      };
    }
    case 'cards': {
      const rows = data.cards.flatMap((c) => {
        const s = cardSummary(c, data.transactions);
        return s.invoices
          .filter((i) => i.dueDate >= p.from && i.periodStart <= p.to)
          .map((i) => ({ card: c.name, month: formatMonthLong(i.month), due: i.dueDate, total: i.total, paid: i.paid, status: { paid: t('Paga'), open: t('Aberta'), closed: t('Fechada'), overdue: t('Atrasada'), future: t('Futura') }[i.status] }));
      });
      return {
        title: t('Cartões e faturas'),
        subtitle: periodLabel(p),
        columns: [
          { header: t('Cartão'), key: 'card', width: 22 },
          { header: t('Fatura'), key: 'month', width: 18 },
          { header: t('Vencimento'), key: 'due', type: 'date' },
          { header: t('Total'), key: 'total', type: 'money' },
          { header: t('Pago'), key: 'paid', type: 'money' },
          { header: t('Status'), key: 'status' },
        ],
        rows,
        summary: data.cards.map((c) => {
          const s = cardSummary(c, data.transactions);
          return { label: t('{name} — limite usado', { name: c.name }), value: t('{used} de {limit} ({pct})', { used: formatMoney(s.used), limit: formatMoney(c.limit), pct: formatPercent(s.usagePct) }) };
        }),
      };
    }
    case 'categories': {
      const exp = totalsByCategory(data.transactions, data.categories, p, 'expense');
      const inc = totalsByCategory(data.transactions, data.categories, p, 'income');
      return {
        title: t('Categorias'),
        subtitle: periodLabel(p),
        columns: [
          { header: t('Categoria'), key: 'name', width: 22 },
          { header: t('Tipo'), key: 'kind' },
          { header: t('Lançamentos'), key: 'count', type: 'number' },
          { header: t('Total'), key: 'total', type: 'money' },
          { header: t('Participação'), key: 'pct', type: 'percent' },
        ],
        rows: [...exp.map((c) => ({ name: t(c.category.name), kind: t('Despesa'), count: c.count, total: c.total, pct: c.pct })), ...inc.map((c) => ({ name: t(c.category.name), kind: t('Receita'), count: c.count, total: c.total, pct: c.pct }))],
      };
    }
    case 'investments': {
      const s = portfolioSummary(data.investments);
      return {
        title: t('Investimentos'),
        subtitle: t('Posição atual da carteira (informativo — não é recomendação)'),
        columns: [
          { header: t('Ativo'), key: 'name', width: 28 },
          { header: t('Classe'), key: 'type' },
          { header: t('Aplicado'), key: 'invested', type: 'money' },
          { header: t('Atual'), key: 'current', type: 'money' },
          { header: t('Rentabilidade'), key: 'ret', type: 'percent' },
          { header: t('Proventos'), key: 'div', type: 'money' },
        ],
        rows: data.investments.map((i) => ({ name: i.ticker ? `${i.name} (${i.ticker})` : i.name, type: t(INVESTMENT_LABELS[i.type]), invested: i.invested, current: i.currentValue, ret: i.invested ? ((i.currentValue - i.invested) / i.invested) * 100 : 0, div: i.dividends })),
        summary: [
          { label: t('Patrimônio investido'), value: formatMoney(s.current) },
          { label: t('Rentabilidade total'), value: `${formatMoney(s.profit)} (${formatPercent(s.returnPct)})` },
          { label: t('Proventos'), value: formatMoney(s.dividends) },
        ],
      };
    }
    case 'debts': {
      const totals = debtTotals(data.debts);
      return {
        title: t('Dívidas'),
        subtitle: t('Posição atual'),
        columns: [
          { header: t('Dívida'), key: 'name', width: 26 },
          { header: t('Credor'), key: 'creditor' },
          { header: t('Total'), key: 'total', type: 'money' },
          { header: t('Restante'), key: 'remaining', type: 'money' },
          { header: t('Juros a.m.'), key: 'rate', type: 'percent' },
          { header: t('Parcelas'), key: 'inst' },
          { header: t('Parcela'), key: 'amount', type: 'money' },
        ],
        rows: data.debts.map((d) => ({ name: d.name, creditor: d.creditor, total: d.total, remaining: d.remaining, rate: d.interestRate, inst: `${d.installmentsPaid}/${d.installments}`, amount: d.installmentAmount })),
        summary: [
          { label: t('Saldo devedor'), value: formatMoney(totals.remaining) },
          { label: t('Compromisso mensal'), value: formatMoney(totals.monthly) },
        ],
      };
    }
  }
}
