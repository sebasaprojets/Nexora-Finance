import { describe, expect, it } from 'vitest';
import type { Account, Category, CreditCard, Transaction } from '@/types';
import { accountBalances, budgetUsage, cardInvoices, closingDateForPurchase, dre, dueDateForClosing, goalProgress, payoffPlan, summarize, timeSeries } from './finance';
import { parseMoneyInput, formatMoney } from './format';
import { addMonths, dateInMonth } from './dates';
import { createDemoData } from '@/data/mock';
import { financialScore } from './score';
import { answer } from './assistant';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  type: 'expense',
  amount: 10,
  description: 't',
  date: '2026-01-10',
  method: 'pix',
  status: 'paid',
  tags: [],
  recurrence: 'none',
  createdAt: '2026-01-10T00:00:00Z',
  ...p,
});

describe('format', () => {
  it('formata BRL no padrão brasileiro', () => {
    expect(formatMoney(1250.5)).toBe('R$ 1.250,50');
    expect(formatMoney(-3200)).toBe('-R$ 3.200,00');
  });
  it('interpreta valores digitados', () => {
    expect(parseMoneyInput('35,90')).toBe(35.9);
    expect(parseMoneyInput('1.250,50')).toBe(1250.5);
    expect(parseMoneyInput('1.250')).toBe(1250);
    expect(parseMoneyInput('35.90')).toBe(35.9);
    expect(parseMoneyInput('R$ 10')).toBe(10);
  });
});

describe('datas', () => {
  it('soma meses respeitando o fim do mês', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(dateInMonth(2026, 2, 31)).toBe('2026-02-28');
  });
});

describe('saldos e resumo', () => {
  const accounts: Account[] = [
    { id: 'a', name: 'A', institution: '', type: 'checking', initialBalance: 100, color: '', createdAt: '' },
    { id: 'b', name: 'B', institution: '', type: 'wallet', initialBalance: 0, color: '', createdAt: '' },
  ];
  const txs = [
    tx({ type: 'income', amount: 1000, accountId: 'a' }),
    tx({ type: 'expense', amount: 200, accountId: 'a' }),
    tx({ type: 'transfer', amount: 300, accountId: 'a', toAccountId: 'b' }),
    tx({ type: 'expense', amount: 50, cardId: 'c' }), // cartão não mexe no saldo
  ];
  it('calcula saldos por conta', () => {
    const b = accountBalances(accounts, txs, '2026-12-31');
    expect(b.get('a')).toBe(600);
    expect(b.get('b')).toBe(300);
  });
  it('transferências não contam como receita/despesa', () => {
    const s = summarize(txs, { from: '2026-01-01', to: '2026-01-31' });
    expect(s).toMatchObject({ income: 1000, expense: 250, net: 750 });
  });
  it('série temporal mensal soma valores', () => {
    const series = timeSeries(txs, { from: '2026-01-01', to: '2026-02-28' }, 'month');
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ income: 1000, expense: 250 });
  });
});

describe('cartões e faturas', () => {
  const card: CreditCard = { id: 'c', name: 'C', institution: '', brand: 'visa', last4: '1234', limit: 5000, closingDay: 3, dueDay: 10, theme: 'violet', createdAt: '' };
  it('compra no dia do fechamento vai para a próxima fatura', () => {
    expect(closingDateForPurchase(card, '2026-01-02')).toBe('2026-01-03');
    expect(closingDateForPurchase(card, '2026-01-03')).toBe('2026-02-03');
    expect(dueDateForClosing(card, '2026-01-03')).toBe('2026-01-10');
    expect(dueDateForClosing({ ...card, closingDay: 25, dueDay: 5 }, '2026-01-25')).toBe('2026-02-05');
  });
  it('status da fatura considera pagamentos', () => {
    const txs = [tx({ cardId: 'c', amount: 100, date: '2026-01-01' }), tx({ type: 'transfer', amount: 100, accountId: 'a', toCardId: 'c', invoiceId: 'c:2026-01', date: '2026-01-09' })];
    const inv = cardInvoices(card, txs, '2026-01-20').find((i) => i.id === 'c:2026-01')!;
    expect(inv.status).toBe('paid');
    const unpaid = cardInvoices(card, txs.slice(0, 1), '2026-01-20').find((i) => i.id === 'c:2026-01')!;
    expect(unpaid.status).toBe('overdue');
  });
});

describe('planejamento', () => {
  it('orçamento atinge níveis 70/90/100', () => {
    const cats: Category[] = [{ id: 'f', name: 'Food', icon: '', color: '', kind: 'expense' }];
    const u = budgetUsage([{ id: 'b', categoryId: 'f', amount: 100, period: 'recurring' }], cats, [tx({ categoryId: 'f', amount: 95, date: '2026-01-05' })], '2026-01');
    expect(u[0].level).toBe('alert');
  });
  it('meta calcula aporte necessário', () => {
    const g = goalProgress({ id: 'g', name: 'Carro', target: 50000, initialAmount: 18500, contributions: [], deadline: '2027-10-07', icon: '', color: '', createdAt: '' }, '2026-10-07');
    expect(Math.round(g.pct)).toBe(37);
    expect(g.remaining).toBe(31500);
    expect(g.monthlyNeeded).toBeGreaterThan(2500);
  });
  it('avalanche paga menos juros que bola de neve', () => {
    const debts = [
      { id: 'a', name: 'A', creditor: '', total: 5000, remaining: 5000, interestRate: 5, installments: 20, installmentsPaid: 0, installmentAmount: 300, dueDay: 10, status: 'active' as const, createdAt: '' },
      { id: 'b', name: 'B', creditor: '', total: 1000, remaining: 1000, interestRate: 1, installments: 10, installmentsPaid: 0, installmentAmount: 100, dueDay: 10, status: 'active' as const, createdAt: '' },
    ];
    const av = payoffPlan(debts, 200, 'avalanche');
    const sb = payoffPlan(debts, 200, 'snowball');
    expect(av.feasible).toBe(true);
    expect(av.totalInterest).toBeLessThanOrEqual(sb.totalInterest);
  });
  it('DRE separa custos fixos e despesas variáveis', () => {
    const cats: Category[] = [
      { id: 'h', name: 'Casa', icon: '', color: '', kind: 'expense', nature: 'fixed' },
      { id: 'l', name: 'Lazer', icon: '', color: '', kind: 'expense', nature: 'variable' },
    ];
    const d = dre([tx({ type: 'income', amount: 30000 }), tx({ categoryId: 'h', amount: 8500 }), tx({ categoryId: 'l', amount: 13000 })], cats, { from: '2026-01-01', to: '2026-01-31' });
    expect(d).toMatchObject({ revenue: 30000, costs: 8500, grossProfit: 21500, netProfit: 8500 });
    expect(d.netMargin).toBeCloseTo(28.33, 1);
  });
});

describe('dados de demonstração e IA', () => {
  const data = createDemoData();
  it('saldo total calibrado em R$ 12.580,40', () => {
    const b = accountBalances(data.accounts, data.transactions);
    const total = data.accounts.reduce((s, a) => s + (b.get(a.id) ?? 0), 0);
    expect(Math.round(total * 100) / 100).toBe(12580.4);
  });
  it('score fica entre 0 e 1000', () => {
    const s = financialScore(data);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(1000);
  });
  it('assistente responde com dados reais e não inventa quando vazio', () => {
    expect(answer('Quanto gastei este mês?', data).text).toMatch(/Você gastou/);
    const empty = { ...data, transactions: [] };
    expect(answer('Quanto gastei este mês?', empty).text).toMatch(/não há transações/i);
  });
});

describe('lançamento por conversa e categoria automática', async () => {
  const { parseQuickEntry } = await import('./assistant');
  const { suggestCategory } = await import('./categorize');
  const data = createDemoData();
  it('interpreta despesas e receitas em linguagem natural', () => {
    const a = parseQuickEntry('gastei 35,90 no mercado', data, '2026-10-07')!;
    expect(a).toMatchObject({ type: 'expense', amount: 35.9, description: 'Mercado', categoryId: 'cat_food', date: '2026-10-07' });
    const b = parseQuickEntry('recebi 5.000 de salário', data, '2026-10-07')!;
    expect(b).toMatchObject({ type: 'income', amount: 5000, categoryId: 'cat_salary' });
    const c = parseQuickEntry('paguei 120 de luz ontem', data, '2026-10-07')!;
    expect(c).toMatchObject({ amount: 120, categoryId: 'cat_home', date: '2026-10-06' });
    const d = parseQuickEntry('uber 23,50', data, '2026-10-07')!;
    expect(d).toMatchObject({ type: 'expense', amount: 23.5, categoryId: 'cat_transport' });
    const e = parseQuickEntry('gastei 80 no ifood no cartão nubank', data, '2026-10-07')!;
    expect(e).toMatchObject({ cardId: 'card_nubank', categoryId: 'cat_food' });
  });
  it('não confunde perguntas com lançamentos', () => {
    expect(parseQuickEntry('Quanto gastei este mês?', data)).toBeNull();
    expect(parseQuickEntry('quanto gastei com 3 cafés', data)).toBeNull();
  });
  it('sugere categoria por palavra-chave e pelo histórico', () => {
    expect(suggestCategory('Netflix', 'expense', data.categories)?.id).toBe('cat_subs');
    expect(suggestCategory('Farmácia São João', 'expense', data.categories)?.id).toBe('cat_health');
    expect(suggestCategory('Atacadão', 'expense', data.categories, data.transactions)?.id).toBe('cat_food');
  });
});

describe('gasto fora do padrão', async () => {
  const { unusualExpenses } = await import('./finance');
  it('detecta despesa muito acima do ticket médio da categoria', () => {
    const base = createDemoData('2026-10-07');
    const spike = tx({ id: 'spike', categoryId: 'cat_food', amount: 900, date: '2026-10-07', description: 'Restaurante caro', accountId: 'acc_itau' });
    const found = unusualExpenses({ ...base, transactions: [spike, ...base.transactions] }, '2026-10-07');
    expect(found[0]?.tx.id).toBe('spike');
    expect(unusualExpenses(base, '2026-10-07').some((u) => u.tx.amount < 80)).toBe(false);
  });
});
