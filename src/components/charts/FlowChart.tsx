import { memo } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { formatDate } from '@/lib/dates';
import { useMoney } from '@/hooks/useMoney';
import { axisProps, ChartTooltipBox } from './ChartTooltip';

const C = { income: 'var(--series-income)', expense: 'var(--series-expense)', net: 'var(--series-net)' };

/** Receitas × Despesas (áreas) + Resultado (linha). Um único eixo em R$. */
export const FlowChart = memo(function FlowChart({ data, height = 300, showNet = true, variant = 'area' }: { data: SeriesPoint[]; height?: number; showNet?: boolean; variant?: 'area' | 'line' }) {
  const money = useMoney();
  return (
    <div style={{ height }} role="img" aria-label="Gráfico de receitas, despesas e resultado por período">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="g-income" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.income} stopOpacity={0.28} />
              <stop offset="100%" stopColor={C.income} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-expense" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.expense} stopOpacity={0.22} />
              <stop offset="100%" stopColor={C.expense} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
          <XAxis dataKey="label" {...axisProps} minTickGap={16} dy={6} />
          <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
          <Tooltip
            cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as SeriesPoint;
              return (
                <ChartTooltipBox
                  title={p.from === p.to ? formatDate(p.from) : `${formatDate(p.from)} – ${formatDate(p.to)}`}
                  rows={[
                    { label: 'Receitas', value: money(p.income), color: C.income },
                    { label: 'Despesas', value: money(p.expense), color: C.expense },
                    { label: 'Resultado', value: money(p.net, { signed: true }), color: C.net },
                  ]}
                />
              );
            }}
          />
          {variant === 'area' ? (
            <>
              <Area type="monotone" dataKey="income" name="Receitas" stroke={C.income} strokeWidth={2} fill="url(#g-income)" activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} animationDuration={700} />
              <Area type="monotone" dataKey="expense" name="Despesas" stroke={C.expense} strokeWidth={2} fill="url(#g-expense)" activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} animationDuration={700} />
            </>
          ) : (
            <>
              <Line type="monotone" dataKey="income" name="Receitas" stroke={C.income} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} />
              <Line type="monotone" dataKey="expense" name="Despesas" stroke={C.expense} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} />
            </>
          )}
          {showNet && <Line type="monotone" dataKey="net" name="Resultado" stroke={C.net} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} animationDuration={700} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
