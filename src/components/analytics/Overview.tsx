import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, ChevronsUpDown, Equal, Gauge, Minus, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Deferred } from '@/components/common/Deferred';
import { Segmented } from '@/components/ui/Segmented';
import { Sparkline } from '@/components/ui/Sparkline';
import { Delta } from '@/components/ui/Delta';
import { Tooltip as Tip } from '@/components/ui/Tooltip';
import { StatCard } from '@/components/common/StatCard';
import { InsightList } from '@/components/common/InsightList';
import { ExportMenu } from '@/components/common/ExportMenu';
import { FlowChart } from '@/components/charts/FlowChart';
import { axisProps, ChartTooltipBox, Legend } from '@/components/charts/ChartTooltip';
import { useMoney } from '@/hooks/useMoney';
import { cn } from '@/lib/cn';
import { addMonths, monthKey, formatMonthLong, formatMonthShort, startOfMonth, today } from '@/lib/dates';
import { autoGranularity, dre, indicators, netWorth, summarize, timeSeries, type Period } from '@/lib/finance';
import { formatMoney, formatPercent, pctChange } from '@/lib/format';
import { generateInsights } from '@/lib/insights';
import type { FinanceData } from '@/types';

export function Overview({ data, period, previous }: { data: FinanceData; period: Period; previous: Period }) {
  const money = useMoney();
  const [chartMode, setChartMode] = useState<'area' | 'line'>('area');

  const m = useMemo(() => {
    const cur = summarize(data.transactions, period);
    const prev = summarize(data.transactions, previous);
    const series = timeSeries(data.transactions, period, autoGranularity(period));
    const nw = netWorth(data);
    const nwPrev = netWorth(data, previous.to);
    const ind = indicators(data, period, previous);
    // Últimos 12 meses (para R×D mensal, lucros e perdas e sparklines dos indicadores).
    const year = { from: startOfMonth(addMonths(today(), -11)), to: today() };
    const monthly = timeSeries(data.transactions, year, 'month');
    return { cur, prev, series, nw, nwPrev, ind, monthly };
  }, [data, period, previous]);

  const insights = useMemo(() => generateInsights(data, period, previous, (v) => money(v)), [data, period, previous, money]);
  const margin = m.cur.income ? (m.cur.net / m.cur.income) * 100 : 0;
  const marginPrev = m.prev.income ? (m.prev.net / m.prev.income) * 100 : 0;
  const monthlyRates = m.monthly.map((p) => (p.income ? (p.net / p.income) * 100 : 0));

  return (
    <div className="space-y-6">
      {/* 11. Visão Financeira */}
      <section aria-labelledby="visao">
        <h2 id="visao" className="mb-3 font-display text-lg font-semibold">Visão Financeira</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatCard label="Receita total" value={m.cur.income} format={(v) => money(v)} delta={pctChange(m.cur.income, m.prev.income)} comparison={`${money(m.cur.income - m.prev.income, { signed: true, compact: true })}`} spark={m.series.map((s) => s.income)} sparkColor="var(--series-income)" info="Soma das receitas no período vs. período anterior." />
          <StatCard label="Despesas totais" value={m.cur.expense} format={(v) => money(v)} inverse delta={pctChange(m.cur.expense, m.prev.expense)} comparison={`${money(m.cur.expense - m.prev.expense, { signed: true, compact: true })}`} spark={m.series.map((s) => s.expense)} sparkColor="var(--series-expense)" info="Soma das despesas no período vs. período anterior." />
          <StatCard label={m.cur.net >= 0 ? 'Lucro' : 'Prejuízo'} value={m.cur.net} format={(v) => money(v, { signed: true })} delta={pctChange(m.cur.net, m.prev.net)} comparison={`ant. ${money(m.prev.net, { compact: true })}`} spark={m.series.map((s) => s.net)} info="Receitas − despesas." />
          <StatCard label="Margem de lucro" value={margin} format={(v) => formatPercent(v)} delta={margin - marginPrev} deltaUnit="p.p." comparison={`ant. ${formatPercent(marginPrev)}`} spark={monthlyRates} info="Lucro ÷ receita. Variação em pontos percentuais." />
          <StatCard label="Patrimônio" value={m.nw.total} format={(v) => money(v)} delta={pctChange(m.nw.total, m.nwPrev.total)} comparison={`ant. ${money(m.nwPrev.total, { compact: true })}`} info="Patrimônio líquido hoje vs. no fim do período anterior." />
          <StatCard label="Economia" value={Math.max(0, m.cur.net)} format={(v) => money(v)} delta={pctChange(Math.max(0, m.cur.net), Math.max(0, m.prev.net))} comparison={`${formatPercent(m.cur.savingsRate, 0)} da renda`} info="Valor poupado no período (resultado positivo)." />
        </div>
      </section>

      {/* 12. Receitas x Despesas */}
      <Card>
        <CardHeader
          title="Receitas x Despesas"
          description="Comparação no período selecionado"
          action={<Segmented size="sm" label="Tipo de gráfico" value={chartMode} onChange={setChartMode} options={[{ value: 'area', label: 'Área' }, { value: 'line', label: 'Linha' }]} />}
        />
        <CardBody>
          <Legend items={[{ label: 'Receitas', color: 'var(--series-income)' }, { label: 'Despesas', color: 'var(--series-expense)' }, { label: 'Resultado', color: 'var(--series-net)', dashed: true }]} />
          <div className="mt-3">
            <FlowChart data={m.series} variant={chartMode} height={300} />
          </div>
          <h3 className="mt-6 mb-2 text-sm font-medium text-fg-muted">Comparação mensal (12 meses)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-subtle">
                  <th className="pb-2 font-medium">Mês</th>
                  <th className="pb-2 text-right font-medium">Receitas</th>
                  <th className="pb-2 text-right font-medium">Despesas</th>
                  <th className="pb-2 text-right font-medium">Resultado</th>
                  <th className="pb-2 text-right font-medium">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...m.monthly].reverse().map((p) => (
                  <tr key={p.key}>
                    <td className="py-2">{formatMonthLong(p.key)}{p.key === monthKey(today()) && <span className="ml-1.5 text-xs text-fg-subtle">(parcial)</span>}</td>
                    <td className="tabular py-2 text-right">{money(p.income)}</td>
                    <td className="tabular py-2 text-right">{money(p.expense)}</td>
                    <td className={cn('tabular py-2 text-right font-medium', p.net >= 0 ? 'text-success' : 'text-danger')}>{money(p.net, { signed: true })}</td>
                    <td className="tabular py-2 text-right text-fg-muted">{p.income ? formatPercent((p.net / p.income) * 100) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* 13. Lucros e Perdas */}
      <Deferred minHeight={460}>
        <ProfitLoss income={m.cur.income} expense={m.cur.expense} monthly={m.monthly} />
      </Deferred>

      {/* 14. DRE */}
      <DRETable data={data} period={period} previous={previous} />

      {/* 21. Indicadores */}
      <Deferred minHeight={380}>
      <Card>
        <CardHeader title="Indicadores financeiros" icon={<Gauge />} description="Calculados sobre seus dados no período" />
        <CardBody className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[
            { label: 'Taxa de economia', value: formatPercent(m.ind.savingsRate), spark: monthlyRates, good: m.ind.savingsRate >= 20, tip: 'Resultado ÷ receitas. Referência: acima de 20%.' },
            { label: 'Margem de lucro', value: formatPercent(m.ind.profitMargin), spark: monthlyRates, good: m.ind.profitMargin > 0, tip: 'Lucro líquido ÷ receita no período.' },
            { label: 'Crescimento da receita', value: m.ind.revenueGrowth === null ? '—' : formatPercent(m.ind.revenueGrowth, 1, true), spark: m.monthly.map((x) => x.income), good: (m.ind.revenueGrowth ?? 0) >= 0, tip: 'Receita do período vs. período anterior.' },
            { label: 'Crescimento dos gastos', value: m.ind.expenseGrowth === null ? '—' : formatPercent(m.ind.expenseGrowth, 1, true), spark: m.monthly.map((x) => x.expense), good: (m.ind.expenseGrowth ?? 0) <= 0, tip: 'Despesas do período vs. período anterior. Menor é melhor.' },
            { label: 'Relação dívida/renda', value: formatPercent(m.ind.debtToIncome, 0), spark: undefined, good: m.ind.debtToIncome < 30, tip: 'Parcelas mensais de dívidas ÷ renda média (3 meses). Ideal: abaixo de 30%.' },
            { label: 'Reserva financeira', value: `${m.ind.reserveMonths.toFixed(1).replace('.', ',')} meses`, spark: undefined, good: m.ind.reserveMonths >= 6, tip: '(Poupança + renda fixa) ÷ gasto médio mensal. Ideal: 6+ meses.' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <Tip content={k.tip}>
                  <span className="cursor-help text-xs text-fg-subtle underline decoration-dotted underline-offset-2" tabIndex={0}>{k.label}</span>
                </Tip>
                <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold', k.good ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>{k.good ? 'Saudável' : 'Atenção'}</span>
              </div>
              <p className="tabular mt-1.5 font-display text-xl font-semibold">{k.value}</p>
              {k.spark && <Sparkline data={k.spark} height={30} className="mt-2" color={k.good ? 'var(--series-3)' : 'var(--series-2)'} />}
            </div>
          ))}
        </CardBody>
      </Card>
      </Deferred>

      {/* 24. Insights */}
      <Deferred minHeight={300}>
      <Card>
        <CardHeader title="Nexora Insights" icon={<Sparkles />} description="Gerados a partir dos seus números — nada é estimado sem dados." />
        <CardBody className="grid gap-x-6 px-3 md:grid-cols-2">
          <InsightList insights={insights} />
        </CardBody>
      </Card>
      </Deferred>
    </div>
  );
}

function ProfitLoss({ income, expense, monthly }: { income: number; expense: number; monthly: { key: string; label: string; net: number; income: number; expense: number }[] }) {
  const money = useMoney();
  const net = income - expense;
  const profitMonths = monthly.filter((m) => m.net >= 0).length;
  return (
    <Card>
      <CardHeader title="Lucros e Perdas" description="Resultado líquido do período e histórico mensal" />
      <CardBody>
        <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-xl bg-surface-2/70 p-4">
            <p className="text-xs text-fg-subtle">Receita</p>
            <p className="tabular font-display text-xl font-semibold text-income">{money(income)}</p>
          </div>
          <Minus className="mx-auto size-5 text-fg-subtle" aria-label="menos" />
          <div className="rounded-xl bg-surface-2/70 p-4">
            <p className="text-xs text-fg-subtle">Despesas</p>
            <p className="tabular font-display text-xl font-semibold">{money(expense)}</p>
          </div>
          <Equal className="mx-auto size-5 text-fg-subtle" aria-label="igual a" />
          <div className={cn('rounded-xl p-4', net >= 0 ? 'bg-success-soft' : 'bg-danger-soft')}>
            <p className="text-xs text-fg-subtle">Resultado líquido · {net >= 0 ? 'Lucro' : 'Prejuízo'}</p>
            <p className={cn('tabular font-display text-2xl font-bold', net >= 0 ? 'text-success' : 'text-danger')}>{money(net, { signed: true })}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h3 className="text-sm font-medium text-fg-muted">Histórico de lucro e prejuízo</h3>
          <p className="text-xs text-fg-subtle">{profitMonths} meses com lucro · {monthly.length - profitMonths} com prejuízo</p>
        </div>
        <div className="mt-3 h-56" role="img" aria-label="Resultado mensal: barras acima de zero indicam lucro, abaixo indicam prejuízo">
          <ResponsiveContainer>
            <BarChart data={monthly.map((x) => ({ ...x, label: formatMonthShort(x.key) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { key: string; net: number; income: number; expense: number };
                  return <ChartTooltipBox title={formatMonthLong(d.key)} rows={[{ label: d.net >= 0 ? 'Lucro' : 'Prejuízo', value: money(d.net, { signed: true }), color: d.net >= 0 ? 'var(--success)' : 'var(--danger)' }, { label: 'Receitas', value: money(d.income) }, { label: 'Despesas', value: money(d.expense) }]} />;
                }}
              />
              <Bar dataKey="net" radius={[4, 4, 4, 4]} maxBarSize={36}>
                {monthly.map((x) => (
                  <Cell key={x.key} fill={x.net >= 0 ? 'var(--success)' : 'var(--danger)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

type DREKey = 'revenue' | 'costs' | 'expenses' | 'grossProfit' | 'netProfit' | 'netMargin';
const DRE_ROWS: { key: DREKey; label: string; group: 'receitas' | 'custos' | 'resultado'; inverse?: boolean; tip: string }[] = [
  { key: 'revenue', label: 'Receita', group: 'receitas', tip: 'Todas as receitas do período.' },
  { key: 'costs', label: 'Custos', group: 'custos', inverse: true, tip: 'Despesas de categorias de natureza fixa (moradia, saúde, educação, assinaturas…).' },
  { key: 'expenses', label: 'Despesas', group: 'custos', inverse: true, tip: 'Despesas de categorias variáveis.' },
  { key: 'grossProfit', label: 'Lucro bruto', group: 'resultado', tip: 'Receita − custos.' },
  { key: 'netProfit', label: 'Lucro líquido', group: 'resultado', tip: 'Lucro bruto − despesas.' },
  { key: 'netMargin', label: 'Margem líquida', group: 'resultado', tip: 'Lucro líquido ÷ receita.' },
];

function DRETable({ data, period, previous }: { data: FinanceData; period: Period; previous: Period }) {
  const money = useMoney();
  const [compare, setCompare] = useState<'previous' | 'yoy'>('previous');
  const [group, setGroup] = useState<'all' | 'receitas' | 'custos' | 'resultado'>('all');
  const [sort, setSort] = useState<{ key: 'order' | 'current' | 'variation'; dir: 1 | -1 }>({ key: 'order', dir: 1 });
  const base = useMemo(() => (compare === 'previous' ? previous : { from: addMonths(period.from, -12), to: addMonths(period.to, -12) }), [compare, previous, period]);
  const cur = useMemo(() => dre(data.transactions, data.categories, period), [data, period]);
  const prev = useMemo(() => dre(data.transactions, data.categories, base), [data, base]);

  const rows = DRE_ROWS.filter((r) => group === 'all' || r.group === group).map((r, i) => {
    const c = cur[r.key];
    const p = prev[r.key];
    const variation = r.key === 'netMargin' ? c - p : pctChange(c, p);
    return { ...r, order: i, current: c, previous: p, variation };
  });
  if (sort.key !== 'order') rows.sort((a, b) => ((sort.key === 'current' ? a.current - b.current : (a.variation ?? 0) - (b.variation ?? 0)) * sort.dir));

  const fmt = (k: DREKey, v: number) => (k === 'netMargin' ? formatPercent(v) : money(v));
  const toggle = (key: 'current' | 'variation') => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }));
  const Icon = ({ k }: { k: 'current' | 'variation' }) => (sort.key === k ? sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />);

  return (
    <Card data-tour="dre">
      <CardHeader
        title="Demonstrativo de Resultados"
        description="DRE simplificada — custos = categorias fixas; despesas = variáveis"
        action={
          <ExportMenu
            size="sm"
            title="DRE"
            getTables={() => [
              {
                title: 'Demonstrativo de Resultados',
                subtitle: `${period.from.split('-').reverse().join('/')} a ${period.to.split('-').reverse().join('/')}`,
                columns: [
                  { header: 'Indicador', key: 'label', width: 22 },
                  { header: 'Atual', key: 'current' },
                  { header: compare === 'previous' ? 'Período anterior' : 'Ano anterior', key: 'previous' },
                  { header: 'Variação', key: 'variation' },
                ],
                rows: DRE_ROWS.map((r) => {
                  const v = r.key === 'netMargin' ? cur[r.key] - prev[r.key] : pctChange(cur[r.key], prev[r.key]);
                  return { label: r.label, current: fmt(r.key, cur[r.key]), previous: fmt(r.key, prev[r.key]), variation: v === null ? '—' : r.key === 'netMargin' ? `${v >= 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')} p.p.` : formatPercent(v, 1, true) };
                }),
              },
            ]}
          />
        }
      />
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Segmented size="sm" label="Comparar com" value={compare} onChange={setCompare} options={[{ value: 'previous', label: 'Período anterior' }, { value: 'yoy', label: 'Ano anterior' }]} />
          <Segmented size="sm" label="Filtrar linhas" value={group} onChange={setGroup} options={[{ value: 'all', label: 'Todas' }, { value: 'receitas', label: 'Receitas' }, { value: 'custos', label: 'Custos' }, { value: 'resultado', label: 'Resultado' }]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-subtle">
                <th className="pb-2 font-medium"><button onClick={() => setSort({ key: 'order', dir: 1 })} className="hover:text-fg">Indicador</button></th>
                <th className="pb-2 text-right font-medium"><button onClick={() => toggle('current')} className="ml-auto flex items-center gap-1 hover:text-fg">Atual <Icon k="current" /></button></th>
                <th className="pb-2 text-right font-medium">{compare === 'previous' ? 'Período anterior' : 'Ano anterior'}</th>
                <th className="pb-2 text-right font-medium"><button onClick={() => toggle('variation')} className="ml-auto flex items-center gap-1 hover:text-fg">Variação <Icon k="variation" /></button></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key} className={cn(r.group === 'resultado' && 'font-semibold')}>
                  <td className="py-3">
                    <Tip content={r.tip}><span tabIndex={0} className="cursor-help">{r.label}</span></Tip>
                  </td>
                  <td className={cn('tabular py-3 text-right', r.key === 'netProfit' && (r.current >= 0 ? 'text-success' : 'text-danger'))}>{fmt(r.key, r.current)}</td>
                  <td className="tabular py-3 text-right text-fg-muted">{fmt(r.key, r.previous)}</td>
                  <td className="py-3 text-right"><Delta value={r.variation} inverse={r.inverse} unit={r.key === 'netMargin' ? 'p.p.' : '%'} suffix="" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
