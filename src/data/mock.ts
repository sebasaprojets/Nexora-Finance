import type {
  Account,
  Budget,
  CreditCard,
  Debt,
  FinanceData,
  Goal,
  Investment,
  PaymentMethod,
  Reminder,
  Subscription,
  Transaction,
} from '@/types';
import { addDays, addMonths, dateInMonth, monthKey, parseISODate, startOfMonth, today } from '@/lib/dates';
import { accountBalances, cardInvoices } from '@/lib/finance';
import { round2 } from '@/lib/format';
import { DEFAULT_CATEGORIES } from './categories';
import { t } from '@/i18n';

/**
 * Dados fictícios para desenvolvimento e para a conta de demonstração.
 * Geração determinística (seed fixa) relativa à data atual, então o histórico
 * sempre termina "hoje". Para trocar pelo backend, basta substituir
 * `createDemoData()` pela resposta da API — o formato é `FinanceData`.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CREATED = '2025-01-01T12:00:00.000Z';
/** Saldo de cada conta na data atual — calibra o saldo inicial (soma = R$ 12.580,40). */
const TARGET_BALANCES: Record<string, number> = {
  acc_itau: 4380.4,
  acc_nubank: 3150,
  acc_savings: 4600,
  acc_wallet: 450,
};

/** Contas de demonstração (nomes no idioma atual). */
export function demoAccounts(): Account[] {
  return [
    { id: 'acc_itau', name: t('Itaú Corrente'), institution: 'Itaú', type: 'checking', initialBalance: 0, color: '#eb6834', createdAt: CREATED },
    { id: 'acc_nubank', name: 'Nubank', institution: 'Nubank', type: 'digital', initialBalance: 1500, color: '#7b6dff', createdAt: CREATED },
    { id: 'acc_savings', name: t('Poupança Inter'), institution: 'Banco Inter', type: 'savings', initialBalance: 2000, color: '#eda100', createdAt: CREATED },
    { id: 'acc_wallet', name: t('Carteira'), institution: t('Dinheiro físico'), type: 'cash', initialBalance: 120, color: '#1baf7a', createdAt: CREATED },
  ];
}

export const DEMO_CARDS: CreditCard[] = [
  { id: 'card_nubank', name: 'Nubank Ultravioleta', institution: 'Nubank', brand: 'mastercard', last4: '4821', limit: 12000, closingDay: 3, dueDay: 10, paymentAccountId: 'acc_nubank', theme: 'violet', createdAt: CREATED },
  { id: 'card_itau', name: 'Itaú Personnalité', institution: 'Itaú', brand: 'visa', last4: '9034', limit: 8000, closingDay: 25, dueDay: 5, paymentAccountId: 'acc_itau', theme: 'graphite', createdAt: CREATED },
];

/** Assinaturas de demonstração (nomes no idioma atual). */
export function demoSubscriptions(): Subscription[] {
  return [
    { id: 'sub_netflix', name: 'Netflix', amount: 44.9, cycle: 'monthly', billingDay: 12, categoryId: 'cat_subs', cardId: 'card_nubank', color: '#e34948', active: true, createdAt: CREATED },
    { id: 'sub_spotify', name: 'Spotify', amount: 21.9, cycle: 'monthly', billingDay: 20, categoryId: 'cat_subs', cardId: 'card_nubank', color: '#1baf7a', active: true, createdAt: CREATED },
    { id: 'sub_amazon', name: 'Amazon Prime', amount: 19.9, cycle: 'monthly', billingDay: 25, categoryId: 'cat_subs', cardId: 'card_itau', color: '#2a78d6', active: true, createdAt: CREATED },
    { id: 'sub_adobe', name: 'Adobe Creative Cloud', amount: 79.3, cycle: 'monthly', billingDay: 6, categoryId: 'cat_subs', cardId: 'card_itau', color: '#eb6834', active: true, createdAt: CREATED },
    { id: 'sub_gym', name: t('Academia SmartFit'), amount: 120, cycle: 'monthly', billingDay: 3, categoryId: 'cat_health', accountId: 'acc_itau', color: '#eda100', active: true, createdAt: CREATED },
  ];
}

interface Draft {
  type: Transaction['type'];
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  toAccountId?: string;
  method: PaymentMethod;
  tags?: string[];
  recurrence?: Transaction['recurrence'];
  installment?: Transaction['installment'];
}

function buildTransactions(ref: string): Transaction[] {
  const drafts: Draft[] = [];
  const first = startOfMonth(addMonths(ref, -12));
  const add = (d: Draft) => {
    if (d.date <= ref && d.date >= first) drafts.push(d);
  };

  for (let i = 12; i >= 0; i--) {
    const monthStart = startOfMonth(addMonths(ref, -i));
    const md = parseISODate(monthStart);
    const y = md.getFullYear();
    const m = md.getMonth() + 1;
    const r = rng(y * 100 + m);
    const day = (d: number) => dateInMonth(y, m, d);
    const between = (min: number, max: number) => round2(min + r() * (max - min));
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const growth = 1 + (12 - i) * 0.004; // leve crescimento de renda ao longo do ano

    // Receitas
    add({ type: 'income', amount: round2(7200 * (i <= 6 ? 1 : 0.94)), description: t('Salário'), date: day(5), categoryId: 'cat_salary', accountId: 'acc_itau', method: 'transfer', recurrence: 'monthly', tags: [t('fixo')] });
    add({ type: 'income', amount: round2(between(900, 1700) * growth), description: pick([t('Projeto landing page'), t('Consultoria UX'), t('Freelance design'), t('Projeto app mobile')]), date: day(Math.floor(between(2, 6))), categoryId: 'cat_freelance', accountId: 'acc_nubank', method: 'pix', tags: [t('freelance')] });
    add({ type: 'income', amount: between(60, 140), description: t('Dividendos e rendimentos'), date: day(15), categoryId: 'cat_invest_income', accountId: 'acc_nubank', method: 'transfer' });
    if (r() > 0.55) add({ type: 'income', amount: between(150, 650), description: pick([t('Venda Mercado Livre'), t('Venda de equipamento'), t('Venda OLX')]), date: day(Math.floor(between(8, 27))), categoryId: 'cat_sales', accountId: 'acc_nubank', method: 'pix' });

    // Moradia
    add({ type: 'expense', amount: 1600, description: t('Aluguel'), date: day(8), categoryId: 'cat_home', accountId: 'acc_itau', method: 'boleto', recurrence: 'monthly', tags: [t('fixo')] });
    add({ type: 'expense', amount: 380, description: t('Condomínio'), date: day(10), categoryId: 'cat_home', accountId: 'acc_itau', method: 'boleto', recurrence: 'monthly', tags: [t('fixo')] });
    add({ type: 'expense', amount: between(150, 235), description: t('Conta de energia'), date: day(12), categoryId: 'cat_home', accountId: 'acc_itau', method: 'auto_debit', recurrence: 'monthly' });
    add({ type: 'expense', amount: 119.9, description: t('Internet fibra'), date: day(15), categoryId: 'cat_home', cardId: 'card_nubank', method: 'credit', recurrence: 'monthly' });

    // Alimentação
    for (const d of [3, 11, 18, 26]) {
      const onCard = r() > 0.4;
      add({ type: 'expense', amount: between(160, 330), description: pick([t('Mercado'), 'Supermercado Pão de Açúcar', 'Atacadão', t('Hortifruti')]), date: day(d), categoryId: 'cat_food', ...(onCard ? { cardId: 'card_nubank', method: 'credit' as const } : { accountId: 'acc_nubank', method: 'pix' as const }) });
    }
    for (let k = 0; k < 5; k++) add({ type: 'expense', amount: between(32, 92), description: pick(['iFood', t('Restaurante'), t('Padaria'), t('Almoço'), t('Pizzaria')]), date: day(Math.floor(between(1, 28))), categoryId: 'cat_food', cardId: 'card_nubank', method: 'credit' });
    add({ type: 'expense', amount: between(18, 45), description: t('Feira'), date: day(Math.floor(between(1, 28))), categoryId: 'cat_food', accountId: 'acc_wallet', method: 'cash' });

    // Transporte
    for (let k = 0; k < 6; k++) add({ type: 'expense', amount: between(16, 58), description: pick(['Uber', '99', 'Uber']), date: day(Math.floor(between(1, 28))), categoryId: 'cat_transport', cardId: 'card_itau', method: 'credit' });
    add({ type: 'expense', amount: between(190, 260), description: t('Combustível'), date: day(Math.floor(between(1, 28))), categoryId: 'cat_transport', accountId: 'acc_itau', method: 'debit' });

    // Saúde e educação
    add({ type: 'expense', amount: 120, description: t('Academia SmartFit'), date: day(3), categoryId: 'cat_health', accountId: 'acc_itau', method: 'debit', recurrence: 'monthly' });
    if (r() > 0.3) add({ type: 'expense', amount: between(35, 150), description: pick([t('Farmácia'), 'Drogasil', t('Consulta')]), date: day(Math.floor(between(1, 28))), categoryId: 'cat_health', cardId: 'card_itau', method: 'credit' });
    add({ type: 'expense', amount: 89.9, description: t('Curso online'), date: day(14), categoryId: 'cat_education', cardId: 'card_nubank', method: 'credit', recurrence: 'monthly' });

    // Lazer e compras
    for (let k = 0; k < 2; k++) add({ type: 'expense', amount: between(55, 210), description: pick([t('Cinema'), t('Bar com amigos'), t('Show'), t('Passeio'), t('Jogo PS5')]), date: day(Math.floor(between(1, 28))), categoryId: 'cat_leisure', cardId: 'card_nubank', method: 'credit' });
    if (r() > 0.35) add({ type: 'expense', amount: between(80, 420), description: pick([t('Roupas'), 'Amazon', 'Shopee', t('Decoração'), t('Livros')]), date: day(Math.floor(between(1, 28))), categoryId: 'cat_shopping', cardId: pick(['card_nubank', 'card_itau']), method: 'credit' });
    add({ type: 'expense', amount: between(12, 30), description: t('Café'), date: day(Math.floor(between(1, 28))), categoryId: 'cat_food', accountId: 'acc_wallet', method: 'cash' });

    // Assinaturas
    for (const s of demoSubscriptions().filter((x) => x.cardId)) {
      add({ type: 'expense', amount: s.amount, description: s.name, date: day(s.billingDay), categoryId: s.categoryId, cardId: s.cardId, method: 'credit', recurrence: 'monthly', tags: [t('assinatura')] });
    }

    // Movimentações entre contas e aportes
    add({ type: 'transfer', amount: 300, description: t('Reserva mensal'), date: day(6), accountId: 'acc_itau', toAccountId: 'acc_savings', method: 'transfer', recurrence: 'monthly' });
    add({ type: 'transfer', amount: 50, description: t('Saque para carteira'), date: day(2), accountId: 'acc_itau', toAccountId: 'acc_wallet', method: 'transfer' });
    add({ type: 'transfer', amount: 3350, description: t('Transferência entre contas'), date: day(6), accountId: 'acc_itau', toAccountId: 'acc_nubank', method: 'pix', recurrence: 'monthly' });
    add({ type: 'transfer', amount: 3300, description: t('Aporte em investimentos'), date: day(7), accountId: 'acc_nubank', method: 'transfer', tags: [t('investimento')], recurrence: 'monthly' });
  }

  // Eventos pontuais
  add({ type: 'expense', amount: 3200, description: t('Viagem — passagens e hotel'), date: addDays(startOfMonth(addMonths(ref, -8)), 13), categoryId: 'cat_leisure', accountId: 'acc_itau', method: 'pix', tags: [t('viagem')] });
  add({ type: 'expense', amount: 2400, description: t('Seguro do carro (anual)'), date: addDays(startOfMonth(addMonths(ref, -5)), 19), categoryId: 'cat_transport', accountId: 'acc_itau', method: 'boleto' });
  add({ type: 'income', amount: 4100, description: t('13º salário (1ª parcela)'), date: addDays(startOfMonth(addMonths(ref, -10)), 27), categoryId: 'cat_salary', accountId: 'acc_itau', method: 'transfer' });
  // Compra parcelada em 10x no cartão
  const phoneStart = addDays(startOfMonth(addMonths(ref, -4)), 9);
  for (let k = 0; k < 10; k++) {
    add({ type: 'expense', amount: 349, description: t('iPhone (parcelado)'), date: addMonths(phoneStart, k), categoryId: 'cat_shopping', cardId: 'card_itau', method: 'credit', installment: { current: k + 1, total: 10, groupId: 'inst_phone' } });
  }

  let seq = 0;
  const txs: Transaction[] = drafts.map((d) => ({
    id: `tx_${String(++seq).padStart(5, '0')}`,
    type: d.type,
    amount: d.amount,
    description: d.description,
    date: d.date,
    categoryId: d.categoryId,
    accountId: d.accountId,
    cardId: d.cardId,
    toAccountId: d.toAccountId,
    method: d.method,
    status: 'paid',
    tags: d.tags ?? [],
    recurrence: d.recurrence ?? 'none',
    installment: d.installment,
    createdAt: `${d.date}T12:00:00.000Z`,
  }));

  // Pagamento das faturas já vencidas (a atual e a fechada mais recente ficam em aberto).
  for (const card of DEMO_CARDS) {
    for (const inv of cardInvoices(card, txs, ref)) {
      if (inv.dueDate < ref && inv.total > 0) {
        txs.push({
          id: `tx_${String(++seq).padStart(5, '0')}`,
          type: 'transfer',
          amount: inv.total,
          description: t('Pagamento fatura {card}', { card: card.name }),
          date: inv.dueDate,
          accountId: card.paymentAccountId,
          toCardId: card.id,
          invoiceId: inv.id,
          method: 'transfer',
          status: 'paid',
          tags: [t('fatura')],
          recurrence: 'none',
          createdAt: `${inv.dueDate}T12:00:00.000Z`,
        });
      }
    }
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function buildInvestments(ref: string): Investment[] {
  const base: Omit<Investment, 'history'>[] = [
    { id: 'inv_selic', name: t('Tesouro Selic 2029'), type: 'fixed_income', institution: t('Tesouro Direto'), invested: 6000, currentValue: 6500, dividends: 0, createdAt: CREATED },
    { id: 'inv_cdb', name: 'CDB Inter 110% CDI', type: 'fixed_income', institution: 'Banco Inter', invested: 3000, currentValue: 3200, dividends: 0, createdAt: CREATED },
    { id: 'inv_itsa', name: 'Itaúsa', ticker: 'ITSA4', type: 'stocks', institution: 'XP', invested: 1700, currentValue: 1850, dividends: 96.4, createdAt: CREATED },
    { id: 'inv_bova', name: 'iShares Ibovespa', ticker: 'BOVA11', type: 'etfs', institution: 'XP', invested: 2000, currentValue: 2100, dividends: 0, createdAt: CREATED },
    { id: 'inv_hglg', name: 'CSHG Logística', ticker: 'HGLG11', type: 'reits', institution: 'XP', invested: 1600, currentValue: 1650, dividends: 138.2, createdAt: CREATED },
    { id: 'inv_btc', name: 'Bitcoin', ticker: 'BTC', type: 'crypto', institution: 'Mercado Bitcoin', invested: 1200, currentValue: 1100, dividends: 0, createdAt: CREATED },
    { id: 'inv_prev', name: t('Previdência PGBL'), type: 'pension', institution: 'Itaú', invested: 1650, currentValue: 1800, dividends: 0, createdAt: CREATED },
  ];
  return base.map((inv, idx) => {
    const r = rng(idx + 7);
    const history = [];
    for (let i = 11; i >= 0; i--) {
      const progress = (12 - i) / 12;
      const noise = inv.type === 'crypto' ? (r() - 0.5) * 0.18 : inv.type === 'fixed_income' ? 0 : (r() - 0.5) * 0.05;
      const start = inv.invested * 0.55;
      const value = i === 0 ? inv.currentValue : start + (inv.currentValue - start) * progress * (1 + noise);
      history.push({ month: monthKey(addMonths(ref, -i)), value: round2(value) });
    }
    return { ...inv, history };
  });
}

function buildGoals(ref: string): Goal[] {
  const contributions = (id: string, monthly: number, months: number, seed: number) => {
    const r = rng(seed);
    return Array.from({ length: months }, (_, i) => ({
      id: `${id}_c${i}`,
      date: addDays(startOfMonth(addMonths(ref, -(months - 1 - i))), 7),
      amount: round2(monthly * (0.8 + r() * 0.4)),
    })).filter((c) => c.date <= ref);
  };
  return [
    { id: 'goal_car', name: t('Comprar carro'), target: 50000, deadline: addMonths(ref, 24), icon: 'car', color: '#2a78d6', initialAmount: 10500, contributions: contributions('goal_car', 900, 9, 11), createdAt: CREATED },
    { id: 'goal_trip', name: t('Viagem ao Japão'), target: 15000, deadline: addMonths(ref, 14), icon: 'plane', color: '#e87ba4', initialAmount: 2000, contributions: contributions('goal_trip', 600, 7, 12), createdAt: CREATED },
    { id: 'goal_reserve', name: t('Reserva de emergência'), target: 20000, deadline: addMonths(ref, 18), icon: 'shield', color: '#1baf7a', initialAmount: 4000, contributions: contributions('goal_reserve', 500, 6, 13), createdAt: CREATED },
  ];
}

function demoDebts(): Debt[] {
  return [
    { id: 'debt_loan', name: t('Empréstimo pessoal'), creditor: 'Itaú', total: 6000, remaining: 2650, interestRate: 2.1, installments: 12, installmentsPaid: 7, installmentAmount: 565, dueDay: 15, status: 'active', createdAt: CREATED },
    { id: 'debt_ipva', name: t('Parcelamento IPVA'), creditor: 'Detran-SP', total: 1800, remaining: 600, interestRate: 0, installments: 6, installmentsPaid: 4, installmentAmount: 300, dueDay: 20, status: 'active', createdAt: CREATED },
  ];
}

const DEMO_BUDGETS: Budget[] = [
  { id: 'bud_food', categoryId: 'cat_food', amount: 1300, period: 'recurring' },
  { id: 'bud_home', categoryId: 'cat_home', amount: 2300, period: 'recurring' },
  { id: 'bud_transport', categoryId: 'cat_transport', amount: 600, period: 'recurring' },
  { id: 'bud_leisure', categoryId: 'cat_leisure', amount: 400, period: 'recurring' },
  { id: 'bud_shopping', categoryId: 'cat_shopping', amount: 500, period: 'recurring' },
];

function buildReminders(ref: string): Reminder[] {
  return [
    { id: 'rem_ir', title: t('Revisar documentos do IR'), date: addDays(ref, 9), done: false },
    { id: 'rem_seguro', title: t('Renovar seguro do carro'), date: addDays(ref, 21), amount: 2400, done: false },
  ];
}

export function createDemoData(ref: string = today()): FinanceData {
  const transactions = buildTransactions(ref);
  const accounts = demoAccounts();
  // Calibra os saldos iniciais para que o saldo de hoje seja o definido acima.
  const current = accountBalances(accounts, transactions, ref);
  for (const a of accounts) a.initialBalance = round2(a.initialBalance + (TARGET_BALANCES[a.id] - (current.get(a.id) ?? 0)));
  return {
    accounts,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions,
    cards: DEMO_CARDS.map((c) => ({ ...c })),
    budgets: DEMO_BUDGETS.map((b) => ({ ...b })),
    goals: buildGoals(ref),
    debts: demoDebts(),
    investments: buildInvestments(ref),
    subscriptions: demoSubscriptions(),
    reminders: buildReminders(ref),
  };
}

export function createEmptyData(): FinanceData {
  return {
    accounts: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    cards: [],
    budgets: [],
    goals: [],
    debts: [],
    investments: [],
    subscriptions: [],
    reminders: [],
  };
}
