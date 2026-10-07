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
import { formatMoney, pctChange } from '@/lib/format';
import type { FinanceData } from '@/types';

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
      <h2 className="font-display text-lg font-semibold">Evolução das receitas</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Receita total" value={cur.income} format={(v) => money(v)} delta={pctChange(cur.income, prev.income)} comparison={`ant. ${money(prev.income, { compact: true })}`} />
        <StatCard label="Crescimento" value={pctChange(cur.income, prev.income) ?? 0} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`} comparison="vs. período anterior" info="Variação da receita total em relação ao período anterior de mesma duração." />
        <StatCard label="Quantidade de receitas" value={cur.incomeCount} format={(v) => String(Math.round(v))} delta={pctChange(cur.incomeCount, prev.incomeCount)} comparison={`ant. ${prev.incomeCount}`} />
        <StatCard label="Média mensal" value={cur.income / monthsInPeriod} format={(v) => money(v)} comparison={`${monthsInPeriod.toFixed(1).replace('.', ',')} meses no período`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Receitas por origem" description="Últimos 12 meses, empilhado por categoria" />
          <CardBody>
            <Legend items={incomeCats.map((c) => ({ label: c.name, color: c.color }))} />
            <div className="mt-3 h-72" role="img" aria-label="Receitas mensais por categoria">
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
                      return <ChartTooltipBox title={formatMonthLong(String((payload[0].payload as { key: string }).key))} rows={payload.filter((p) => Number(p.value) > 0).map((p) => ({ label: catById.get(String(p.dataKey))?.name ?? '', value: money(Number(p.value)), color: catById.get(String(p.dataKey))?.color }))} footer={`Total: ${money(total)}`} />;
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
          <CardHeader title="Origem no período" />
          <CardBody>
            {cats.length ? (
              <BarList items={cats.map((c) => ({ id: c.category.id, label: c.category.name, value: c.total, pct: c.pct, color: c.category.color, icon: <CategoryIcon icon={c.category.icon} color={c.category.color} size="sm" />, meta: `${c.count} lançamento(s)` }))} />
            ) : (
              <p className="py-10 text-center text-sm text-fg-subtle">Sem receitas no período.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
