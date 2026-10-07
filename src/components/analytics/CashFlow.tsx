import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Equal, Minus, Plus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { ExportMenu } from '@/components/common/ExportMenu';
import { axisProps, ChartTooltipBox, Legend } from '@/components/charts/ChartTooltip';
import { useMoney } from '@/hooks/useMoney';
import { cn } from '@/lib/cn';
import { addDays, addMonths, startOfMonth, today } from '@/lib/dates';
import { cashFlow, type Granularity, type Period } from '@/lib/finance';
import { formatAxis } from '@/lib/format';
import type { FinanceData } from '@/types';
import { t } from '@/i18n';

const VIEWS: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Diário' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensal' },
  { value: 'year', label: 'Anual' },
];

/** Período padrão de cada visão do fluxo de caixa. */
function periodFor(g: Granularity, data: FinanceData): Period {
  const ref = today();
  if (g === 'day') return { from: addDays(ref, -29), to: ref };
  if (g === 'week') return { from: addDays(ref, -7 * 12 + 1), to: ref };
  if (g === 'month') return { from: startOfMonth(addMonths(ref, -11)), to: ref };
  const first = data.transactions.reduce((m, tx) => (tx.date < m ? tx.date : m), ref);
  return { from: `${first.slice(0, 4)}-01-01`, to: ref };
}

export function CashFlow({ data }: { data: FinanceData }) {
  const money = useMoney();
  const [g, setG] = useState<Granularity>('month');
  const period = useMemo(() => periodFor(g, data), [g, data]);
  const rows = useMemo(() => cashFlow(data.accounts, data.transactions, period, g), [data, period, g]);
  const opening = rows[0]?.opening ?? 0;
  const inflow = rows.reduce((s, r) => s + r.inflow, 0);
  const outflow = rows.reduce((s, r) => s + r.outflow, 0);
  const closing = rows.at(-1)?.closing ?? opening;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{t('Fluxo de Caixa')}</h2>
          <p className="text-sm text-fg-subtle">{t('Movimentação real das contas (compras no cartão entram quando a fatura é paga).')}</p>
        </div>
        <Segmented label={t('Visão')} value={g} onChange={setG} options={VIEWS.map((v) => ({ ...v, label: t(v.label) }))} />
      </div>

      <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        <div className="card p-4"><p className="text-xs text-fg-subtle">{t('Saldo inicial')}</p><p className="tabular font-display text-lg font-semibold">{money(opening)}</p></div>
        <Plus className="mx-auto size-4 text-fg-subtle" aria-label={t('mais')} />
        <div className="card p-4"><p className="text-xs text-fg-subtle">{t('Entradas')}</p><p className="tabular font-display text-lg font-semibold text-income">{money(inflow)}</p></div>
        <Minus className="mx-auto size-4 text-fg-subtle" aria-label={t('menos')} />
        <div className="card p-4"><p className="text-xs text-fg-subtle">{t('Saídas')}</p><p className="tabular font-display text-lg font-semibold">{money(outflow)}</p></div>
        <Equal className="mx-auto size-4 text-fg-subtle" aria-label={t('igual a')} />
        <div className="card holo p-4"><p className="text-xs text-fg-subtle">{t('Saldo final')}</p><p className={cn('tabular font-display text-lg font-semibold', closing < 0 && 'text-danger')}>{money(closing)}</p></div>
      </div>

      <Card>
        <CardHeader
          title={t('Entradas, saídas e saldo')}
          action={
            <ExportMenu
              size="sm"
              title={t('Fluxo de caixa')}
              getTables={() => [
                {
                  title: t('Fluxo de Caixa'),
                  subtitle: t(VIEWS.find((v) => v.value === g)?.label ?? ''),
                  columns: [
                    { header: t('Período'), key: 'label' },
                    { header: t('Saldo inicial'), key: 'opening', type: 'money' },
                    { header: t('Entradas'), key: 'inflow', type: 'money' },
                    { header: t('Saídas'), key: 'outflow', type: 'money' },
                    { header: t('Saldo final'), key: 'closing', type: 'money' },
                  ],
                  rows: rows.map((r) => ({ ...r })),
                },
              ]}
            />
          }
        />
        <CardBody>
          <Legend items={[{ label: t('Entradas'), color: 'var(--series-income)' }, { label: t('Saídas'), color: 'var(--series-expense)' }, { label: t('Saldo final'), color: 'var(--series-net)' }]} />
          <div className="mt-3 h-72" role="img" aria-label={t('Gráfico de fluxo de caixa')}>
            <ResponsiveContainer>
              <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" {...axisProps} minTickGap={12} />
                <YAxis {...axisProps} width={56} tickFormatter={formatAxis} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0].payload as (typeof rows)[number];
                    return <ChartTooltipBox title={r.label} rows={[{ label: t('Saldo inicial'), value: money(r.opening) }, { label: t('Entradas'), value: money(r.inflow), color: 'var(--series-income)' }, { label: t('Saídas'), value: money(r.outflow), color: 'var(--series-expense)' }, { label: t('Saldo final'), value: money(r.closing), color: 'var(--series-net)' }]} />;
                  }}
                />
                <Bar dataKey="inflow" fill="var(--series-income)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="outflow" fill="var(--series-expense)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Line type="monotone" dataKey="closing" stroke="var(--series-net)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="scrollbar-thin mt-6 max-h-96 overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border text-left text-xs text-fg-subtle">
                  <th className="pb-2 font-medium">{t('Período')}</th>
                  <th className="pb-2 text-right font-medium">{t('Saldo inicial')}</th>
                  <th className="pb-2 text-right font-medium">{t('Entradas')}</th>
                  <th className="pb-2 text-right font-medium">{t('Saídas')}</th>
                  <th className="pb-2 text-right font-medium">{t('Saldo final')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...rows].reverse().map((r) => (
                  <tr key={r.key}>
                    <td className="py-2">{r.label}</td>
                    <td className="tabular py-2 text-right text-fg-muted">{money(r.opening)}</td>
                    <td className="tabular py-2 text-right text-income">+{money(r.inflow)}</td>
                    <td className="tabular py-2 text-right">−{money(r.outflow)}</td>
                    <td className={cn('tabular py-2 text-right font-semibold', r.closing < 0 && 'text-danger')}>{money(r.closing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
