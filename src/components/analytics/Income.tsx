import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/common/StatCard';
import { BarList } from '@/components/charts/BarList';
import { axisProps, ChartTooltipBox, Legend } from '@/components/charts/ChartTooltip';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { useMoney } from '@/hooks/useMoney';
import { addMonths, eachMonth, formatMonthLong, formatMonthShort, startOfMonth, today, diffDays } from '@/lib/dates';
import { monthlyByCategory, summarize, totalsByCategory, type Period } from '@/lib/finance';
import { formatMoney, formatNumber, pctChange } from '@/lib/format';
import type { FinanceData } from '@/types';
import { t } from '@/i18n';

export function Income({ data, period, previous }: { data: FinanceData; period: Period; previous: Period }) {
  const money = useMoney();
  const cur = useMemo(() => summarize(data.transactions, period), [data.transactions, period]);
  const prev = useMemo(() => summarize(data.transactions, previous), [data.transactions, previous]);
  const cats = useMemo(() => totalsByCategory(data.transactions, data.categories, period, 'income'), [data, period]);
  const months = useMemo(() => eachMonth(startOfMonth(addMonths(today(), -11)), today()), []);
  const byCat = useMemo(() => monthlyByCategory(data.transactions, months, 'income'), [data.transactions, months]);
  const incomeCats = data.categories.filter((c) => c.kind === 'income' && months.some((m) => byCat.get(m)?.get(c.id)));
  const rows = months.map((m) => {
    const r: Record<string, string | number> = { key: m, label: formatMonthShort(m) };
    for (const c of incomeCats) r[c.id] = Math.round((byCat.get(m)?.get(c.id) ?? 0) * 100) / 100;
    return r;
  });
  const monthsInPeriod = Math.max(1, (diffDays(period.from, period.to) + 1) / 30.44);
  const catById = new Map(data.categories.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg font-semibold">{t('Evolução das receitas')}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t('Receita total')} value={cur.income} format={(v) => money(v)} delta={pctChange(cur.income, prev.income)} comparison={t('ant. {valor}', { valor: money(prev.income, { compact: true }) })} />
        <StatCard label={t('Crescimento')} value={pctChange(cur.income, prev.income) ?? 0} format={(v) => `${v > 0 ? '+' : ''}${formatNumber(v, 1)}%`} comparison={t('vs. período anterior')} info={t('Variação da receita total em relação ao período anterior de mesma duração.')} />
        <StatCard label={t('Quantidade de receitas')} value={cur.incomeCount} format={(v) => String(Math.round(v))} delta={pctChange(cur.incomeCount, prev.incomeCount)} comparison={t('ant. {valor}', { valor: prev.incomeCount })} />
        <StatCard label={t('Média mensal')} value={cur.income / monthsInPeriod} format={(v) => money(v)} comparison={t('{n} meses no período', { n: formatNumber(monthsInPeriod, 1) })} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('Receitas por origem')} description={t('Últimos 12 meses, empilhado por categoria')} />
          <CardBody>
            <Legend items={incomeCats.map((c) => ({ label: t(c.name), color: c.color }))} />
            <div className="mt-3 h-72" role="img" aria-label={t('Receitas mensais por categoria')}>
              <ResponsiveContainer>
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const total = payload.reduce((s, p) => s + Number(p.value), 0);
                      return <ChartTooltipBox title={formatMonthLong(String((payload[0].payload as { key: string }).key))} rows={payload.filter((p) => Number(p.value) > 0).map((p) => ({ label: t(catById.get(String(p.dataKey))?.name ?? ''), value: money(Number(p.value)), color: catById.get(String(p.dataKey))?.color }))} footer={t('Total: {valor}', { valor: money(total) })} />;
                    }}
                  />
                  {incomeCats.map((c, i) => (
                    <Bar key={c.id} dataKey={c.id} stackId="a" fill={c.color} stroke="var(--surface)" strokeWidth={1} radius={i === incomeCats.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('Origem no período')} />
          <CardBody>
            {cats.length ? (
              <BarList items={cats.map((c) => ({ id: c.category.id, label: t(c.category.name), value: c.total, pct: c.pct, color: c.category.color, icon: <CategoryIcon icon={c.category.icon} color={c.category.color} size="sm" />, meta: c.count === 1 ? t('{n} lançamento', { n: c.count }) : t('{n} lançamentos', { n: c.count }) }))} />
            ) : (
              <p className="py-10 text-center text-sm text-fg-subtle">{t('Sem receitas no período.')}</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
