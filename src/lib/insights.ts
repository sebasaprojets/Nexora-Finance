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
  unusualExpenses,
  type Period,
} from './finance';
import { formatMoney, formatPercent, pctChange } from './format';
import { t } from '@/i18n';

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
      title: t('Maior categoria de gasto'),
      text: t('Seu maior gasto foi {categoria}: {valor}, o que representa {pct} das suas despesas no período.', { categoria: t(top.category.name).toLowerCase(), valor: money(top.total), pct: formatPercent(top.pct) }),
      href: '/app/analises',
    });
    const food = cats.find((c) => c.category.id === 'cat_food');
    if (food && food.category.id !== top.category.id)
      out.push({
        id: 'food-share',
        tone: 'neutral',
        title: t('Alimentação'),
        text: t('Seus gastos com alimentação representam {pct} das suas despesas.', { pct: formatPercent(food.pct, 0) }),
      });
  }

  if (cur.expense > 0 && before.expense > 0) {
    const diff = cur.expense - before.expense;
    out.push({
      id: 'expense-vs-prev',
      tone: diff <= 0 ? 'positive' : 'warning',
      title: diff <= 0 ? t('Gastos em queda') : t('Gastos em alta'),
      text: (diff <= 0 ? t('Você gastou {valor} a menos que no período anterior ({pct}).', {
        valor: money(Math.abs(diff)),
        pct: formatPercent(pctChange(cur.expense, before.expense) ?? 0, 1, true),
      }) : t('Você gastou {valor} a mais que no período anterior ({pct}).', {
        valor: money(Math.abs(diff)),
        pct: formatPercent(pctChange(cur.expense, before.expense) ?? 0, 1, true),
      })),
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
      title: growth > 0 ? t('Receita crescendo') : t('Receita em queda'),
      text: (growth > 0 ? t('Sua receita cresceu {pct} nos últimos 3 meses em relação aos 3 anteriores.', { pct: formatPercent(Math.abs(growth), 0) }) : t('Sua receita caiu {pct} nos últimos 3 meses em relação aos 3 anteriores.', { pct: formatPercent(Math.abs(growth), 0) })),
    });

  if (cur.income > 0)
    out.push({
      id: 'savings-rate',
      tone: cur.savingsRate >= 20 ? 'positive' : cur.savingsRate >= 0 ? 'warning' : 'negative',
      title: cur.net >= 0 ? t('Resultado positivo') : t('Resultado negativo'),
      text:
        cur.net >= 0
          ? t('Você economizou {valor} no período — {pct} da sua renda.', { valor: money(cur.net), pct: formatPercent(cur.savingsRate, 0) })
          : t('Suas despesas superaram as receitas em {valor} no período.', { valor: money(Math.abs(cur.net)) }),
    });

  const goals = data.goals.map((g) => goalProgress(g)).filter((g) => !g.reached);
  const g = goals.sort((a, b) => b.pct - a.pct)[0];
  if (g && g.avgMonthly > 0 && g.monthsToGoal !== null)
    out.push({
      id: `goal-${g.goal.id}`,
      tone: g.onTrack === false ? 'warning' : 'positive',
      title: t('Meta: {meta}', { meta: g.goal.name }),
      text: (g.monthsToGoal === 1 ? t('Se continuar guardando {valor} por mês, sua meta será alcançada em aproximadamente {n} mês.', {
        valor: money(g.avgMonthly),
        n: g.monthsToGoal,
      }) : t('Se continuar guardando {valor} por mês, sua meta será alcançada em aproximadamente {n} meses.', {
        valor: money(g.avgMonthly),
        n: g.monthsToGoal,
      })),
      href: '/app/metas',
    });

  const risky = budgetUsage(data.budgets, data.categories, data.transactions).filter((b) => b.level !== 'ok');
  if (risky[0])
    out.push({
      id: `budget-${risky[0].budget.id}`,
      tone: risky[0].level === 'exceeded' ? 'negative' : 'warning',
      title: t('Orçamento'),
      text:
        risky[0].level === 'exceeded'
          ? t('Você ultrapassou o orçamento de {categoria} em {valor}.', { categoria: t(risky[0].category?.name ?? 'Categoria'), valor: money(Math.abs(risky[0].remaining)) })
          : t('Você já usou {pct} do orçamento de {categoria} este mês.', { pct: formatPercent(risky[0].pct, 0), categoria: t(risky[0].category?.name ?? 'Categoria') }),
      href: '/app/orcamentos',
    });

  const unusual = unusualExpenses(data)[0];
  if (unusual)
    out.push({
      id: `unusual-${unusual.tx.id}`,
      tone: 'warning',
      title: t('Gasto fora do padrão'),
      text: t('“{descricao}” ({valor}) está bem acima do seu gasto médio em {categoria} ({media}).', { descricao: unusual.tx.description, valor: money(unusual.tx.amount), categoria: t(unusual.category).toLowerCase(), media: money(unusual.avg) }),
      href: '/app/transacoes',
    });

  const subs = subscriptionsSummary(data.subscriptions);
  if (subs.count)
    out.push({
      id: 'subscriptions',
      tone: 'neutral',
      title: t('Assinaturas'),
      text: (subs.count === 1 ? t('Você gasta {mensal}/mês com 1 assinatura ({anual} por ano).', { mensal: money(subs.monthly), n: subs.count, anual: money(subs.yearly) }) : t('Você gasta {mensal}/mês com {n} assinaturas ({anual} por ano).', { mensal: money(subs.monthly), n: subs.count, anual: money(subs.yearly) })),
      href: '/app/assinaturas',
    });

  const biggest = data.transactions
    .filter((t) => t.type === 'expense' && inPeriod(t, p) && isRealized(t))
    .sort((a, b) => b.amount - a.amount)[0];
  if (biggest)
    out.push({
      id: 'biggest-expense',
      tone: 'neutral',
      title: t('Maior despesa'),
      text: t('Sua maior despesa no período foi “{descricao}”, de {valor}.', { descricao: biggest.description, valor: money(biggest.amount) }),
      href: '/app/transacoes',
    });

  return out;
}
