import { memo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useMoney } from '@/hooks/useMoney';
import { formatPercent } from '@/lib/format';
import { ChartTooltipBox } from './ChartTooltip';

export interface DonutDatum {
  id: string;
  label: string;
  value: number;
  color: string;
  pct: number;
}

/** Donut com valor total no centro; clique em uma fatia seleciona a categoria. */
export const Donut = memo(function Donut({
  data,
  total,
  centerLabel = 'Total',
  selected,
  onSelect,
  size = 220,
}: {
  data: DonutDatum[];
  total: number;
  centerLabel?: string;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  size?: number;
}) {
  const money = useMoney();
  const [hover, setHover] = useState<string | null>(null);
  const focus = hover ?? selected ?? null;
  const focused = data.find((d) => d.id === focus);
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DonutDatum;
              return <ChartTooltipBox title={d.label} rows={[{ label: 'Valor', value: money(d.value), color: d.color }, { label: 'Participação', value: formatPercent(d.pct) }]} />;
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={1.5}
            stroke="var(--surface)"
            strokeWidth={2}
            cornerRadius={4}
            onMouseLeave={() => setHover(null)}
            animationDuration={700}
          >
            {data.map((d) => (
              <Cell
                key={d.id}
                fill={d.color}
                opacity={focus && focus !== d.id ? 0.35 : 1}
                style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'opacity 150ms' }}
                onMouseEnter={() => setHover(d.id)}
                onClick={() => onSelect?.(selected === d.id ? null : d.id)}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-fg-subtle">{focused ? focused.label : centerLabel}</span>
        <span className="tabular font-display text-xl font-semibold">{money(focused ? focused.value : total, { compact: true })}</span>
        {focused && <span className="text-xs text-fg-muted">{formatPercent(focused.pct)}</span>}
      </div>
    </div>
  );
});
