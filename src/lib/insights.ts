import type { FinanceData } from '@/types';
import { addDays, addMonths, startOfMonth, today } from './dates';
import {
  budgetUsage,
  goalProgress,
  isRealized,
  inPeriod,
  subscriptionsSummary,
  summarize,
  totalsByCategory,
  type Period,
} from './finance';
import { formatMoney, formatPercent, pctChange } from './format';

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'warning';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  text: string;
  href?: string;
}

/**
 * Gera insights a partir dos dados reais. Cada regra só produz texto quando
 * há dados suficientes — nada é inventado.
 */
export function generateInsights(data: FinanceData, p: Period, prev: Period, money = (v: number) => formatMoney(v)): Insight[] {
  const out: Insight[] = [];
  const cur = summarize(data.transactions, p);
  const before = summarize(data.transactions, prev);
  const cats = totalsByCategory(data.transactions, data.categories, p, 'expense');

  if (cats.length && cur.expense > 0) {
    const top = cats[0];
    out.push({
      id: 'top-category',
      tone: 'neutral',
      title: 'Maior categoria de gasto',
      text: `Seu maior gasto foi ${top.category.name.toLowerCase()}: ${money(top.total)}, o que representa ${formatPercent(top.pct)} das suas despesas no período.`,
      href: '/app/analises',
    });
    const food = cats.find((c) => c.category.id === 'cat_food');
    if (food && food.category.id !== top.category.id)
      out.push({
        id: 'food-share',
        tone: 'neutral',
        title: 'Alimentação',
        text: `Seus gastos com alimentação representam ${formatPercent(food.pct, 0)} das suas despesas.`,
      });
  }

  if (cur.expense > 0 && before.expense > 0) {
    const diff = cur.expense - before.expense;
    out.push({
      id: 'expense-vs-prev',
      tone: diff <= 0 ? 'positive' : 'warning',
      title: diff <= 0 ? 'Gastos em queda' : 'Gastos em alta',
      text: `Você gastou ${money(Math.abs(diff))} a ${diff <= 0 ? 'menos' : 'mais'} que no período anterior (${formatPercent(pctChange(cur.expense, before.expense) ?? 0, 1, true)}).`,
      href: '/app/analises',
    });
  }

  const ref = today();
  const last3 = { from: startOfMonth(addMonths(ref, -3)), to: addDays(startOfMonth(ref), -1) };
  const prev3 = { from: startOfMonth(addMonths(ref, -6)), to: addDays(startOfMonth(addMonths(ref, -3)), -1) };
  const r3 = summarize(data.transactions, last3).income;
  const rp3 = summarize(data.transactions, prev3).income;
  const growth = pctChange(r3, rp3);
  if (r3 > 0 && rp3 > 0 && growth !== null && Math.abs(growth) >= 1)
    out.push({
      id: 'revenue-growth',
      tone: growth > 0 ? 'positive' : 'negative',
      title: growth > 0 ? 'Receita crescendo' : 'Receita em queda',
      text: `Sua receita ${growth > 0 ? 'cresceu' : 'caiu'} ${formatPercent(Math.abs(growth), 0)} nos últimos 3 meses em relação aos 3 anteriores.`,
    });

  if (cur.income > 0)
    out.push({
      id: 'savings-rate',
      tone: cur.savingsRate >= 20 ? 'positive' : cur.savingsRate >= 0 ? 'warning' : 'negative',
      title: cur.net >= 0 ? 'Resultado positivo' : 'Resultado negativo',
      text:
        cur.net >= 0
          ? `Você economizou ${money(cur.net)} no período — ${formatPercent(cur.savingsRate, 0)} da sua renda.`
          : `Suas despesas superaram as receitas em ${money(Math.abs(cur.net))} no período.`,
    });

  const goals = data.goals.map((g) => goalProgress(g)).filter((g) => !g.reached);
  const g = goals.sort((a, b) => b.pct - a.pct)[0];
  if (g && g.avgMonthly > 0 && g.monthsToGoal !== null)
    out.push({
      id: `goal-${g.goal.id}`,
      tone: g.onTrack === false ? 'warning' : 'positive',
      title: `Meta: ${g.goal.name}`,
      text: `Se continuar guardando ${money(g.avgMonthly)} por mês, sua meta será alcançada em aproximadamente ${g.monthsToGoal} ${g.monthsToGoal === 1 ? 'mês' : 'meses'}.`,
      href: '/app/metas',
    });

  const risky = budgetUsage(data.budgets, data.categories, data.transactions).filter((b) => b.level !== 'ok');
  if (risky[0])
    out.push({
      id: `budget-${risky[0].budget.id}`,
      tone: risky[0].level === 'exceeded' ? 'negative' : 'warning',
      title: 'Orçamento',
      text:
        risky[0].level === 'exceeded'
          ? `Você ultrapassou o orçamento de ${risky[0].category?.name} em ${money(Math.abs(risky[0].remaining))}.`
          : `Você já usou ${formatPercent(risky[0].pct, 0)} do orçamento de ${risky[0].category?.name} este mês.`,
      href: '/app/orcamentos',
    });

  const subs = subscriptionsSummary(data.subscriptions);
  if (subs.count)
    out.push({
      id: 'subscriptions',
      tone: 'neutral',
      title: 'Assinaturas',
      text: `Você gasta ${money(subs.monthly)}/mês com ${subs.count} assinaturas (${money(subs.yearly)} por ano).`,
      href: '/app/assinaturas',
    });

  const biggest = data.transactions
    .filter((t) => t.type === 'expense' && inPeriod(t, p) && isRealized(t))
    .sort((a, b) => b.amount - a.amount)[0];
  if (biggest)
    out.push({
      id: 'biggest-expense',
      tone: 'neutral',
      title: 'Maior despesa',
      text: `Sua maior despesa no período foi “${biggest.description}”, de ${money(biggest.amount)}.`,
      href: '/app/transacoes',
    });

  return out;
}
