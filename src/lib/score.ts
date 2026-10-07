import type { FinanceData } from '@/types';
import { addDays, addMonths, endOfMonth, eachMonth, startOfMonth, today } from './dates';
import { formatNumber } from './format';
import { t } from '@/i18n';
import { budgetUsage, debtTotals, indicators, monthlyAverages, periodFromPreset, previousPeriod, summarize } from './finance';

/**
 * Score de Saúde Financeira Nexora (0–1000).
 * É um indicador educativo calculado sobre os dados do próprio usuário —
 * NÃO é score de crédito e não tem relação com birôs (Serasa, SPC, Boa Vista).
 */

export interface ScoreFactor {
  key: 'spending' | 'reserve' | 'debts' | 'budget' | 'savings' | 'investments';
  label: string;
  weight: number;
  /** 0–100 */
  value: number;
  detail: string;
  tip: string;
}

export interface FinancialScore {
  score: number;
  band: { label: string; tone: 'danger' | 'warning' | 'primary' | 'success' };
  factors: ScoreFactor[];
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function scoreBand(score: number): FinancialScore['band'] {
  if (score >= 800) return { label: t('Excelente'), tone: 'success' };
  if (score >= 650) return { label: t('Boa'), tone: 'primary' };
  if (score >= 450) return { label: t('Regular'), tone: 'warning' };
  return { label: t('Atenção'), tone: 'danger' };
}

export function financialScore(data: FinanceData, ref = today()): FinancialScore {
  const last3: { from: string; to: string } = {
    from: startOfMonth(addMonths(ref, -3)),
    to: addDays(startOfMonth(ref), -1),
  };
  const s3 = summarize(data.transactions, last3);
  const ind = indicators(data, periodFromPreset('3m', ref), previousPeriod(periodFromPreset('3m', ref)));
  const avg = monthlyAverages(data.transactions, 3, ref);
  const debts = debtTotals(data.debts);
  const lateDebts = data.debts.filter((d) => d.status === 'late').length;
  const budgets = budgetUsage(data.budgets, data.categories, data.transactions);
  const months = eachMonth(startOfMonth(addMonths(ref, -6)), addDays(startOfMonth(ref), -1));
  const positiveMonths = months.filter((m) => summarize(data.transactions, { from: `${m}-01`, to: endOfMonth(`${m}-01`) }).net > 0).length;
  const invested = data.investments.reduce((s, i) => s + i.currentValue, 0);

  const factors: ScoreFactor[] = [
    {
      key: 'spending',
      label: t('Controle de gastos'),
      weight: 0.2,
      value: s3.income ? clamp((s3.savingsRate / 30) * 100) : 0,
      detail: s3.income ? t('Você guardou {pct}% da renda nos últimos 3 meses.', { pct: formatNumber(s3.savingsRate, 1) }) : t('Sem receitas registradas nos últimos 3 meses.'),
      tip: t('Meta de referência: guardar ao menos 20–30% da renda.'),
    },
    {
      key: 'reserve',
      label: t('Reserva de emergência'),
      weight: 0.2,
      value: clamp((ind.reserveMonths / 6) * 100),
      detail: t('Sua reserva cobre {n} meses de gastos.', { n: formatNumber(ind.reserveMonths, 1) }),
      tip: t('O ideal é cobrir de 6 a 12 meses de despesas em aplicações de liquidez diária.'),
    },
    {
      key: 'debts',
      label: t('Dívidas'),
      weight: 0.15,
      value: clamp(100 - (ind.debtToIncome / 40) * 100 - lateDebts * 25),
      detail: debts.count
        ? t('Parcelas de dívidas consomem {pct}% da renda média.', { pct: ind.debtToIncome.toFixed(0) }) + (lateDebts ? ` ${t('{n} em atraso.', { n: lateDebts })}` : '')
        : t('Nenhuma dívida ativa registrada.'),
      tip: t('Mantenha parcelas abaixo de 30% da renda e priorize dívidas com juros altos.'),
    },
    {
      key: 'budget',
      label: t('Orçamento'),
      weight: 0.15,
      value: budgets.length
        ? clamp((budgets.filter((b) => b.level !== 'exceeded').length / budgets.length) * 100 - budgets.filter((b) => b.level === 'alert').length * 5)
        : 40,
      detail: budgets.length
        ? t('{n} de {total} orçamentos dentro do limite este mês.', { n: budgets.filter((b) => b.level !== 'exceeded').length, total: budgets.length })
        : t('Você ainda não definiu orçamentos.'),
      tip: t('Defina limites para as categorias em que mais gasta.'),
    },
    {
      key: 'savings',
      label: t('Consistência de economia'),
      weight: 0.15,
      value: months.length ? clamp((positiveMonths / months.length) * 100) : 0,
      detail: t('Resultado positivo em {n} dos últimos {total} meses.', { n: positiveMonths, total: months.length }),
      tip: t('Feche o mês no azul com regularidade — consistência pesa mais que valor.'),
    },
    {
      key: 'investments',
      label: t('Investimentos'),
      weight: 0.15,
      value: avg.expense ? clamp((invested / (avg.expense * 12)) * 100) : invested > 0 ? 100 : 0,
      detail: avg.expense
        ? t('Seu patrimônio investido equivale a {n} meses de gastos.', { n: formatNumber(invested / avg.expense, 1) })
        : t('Sem histórico de despesas para comparar.'),
      tip: t('Construa patrimônio investido equivalente a pelo menos 12 meses de gastos.'),
    },
  ];

  const score = Math.round(factors.reduce((s, f) => s + f.value * f.weight, 0) * 10);
  return { score, band: scoreBand(score), factors };
}
