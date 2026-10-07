import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRightLeft, Lightbulb } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Delta } from '@/components/ui/Delta';
import { Select } from '@/components/ui/Field';
import { axisProps, ChartTooltipBox, Legend } from '@/components/charts/ChartTooltip';
import { useMoney } from '@/hooks/useMoney';
import { addDays, addMonths, endOfMonth, formatDate, monthKey, startOfMonth, today } from '@/lib/dates';
import { inPeriod, isRealized, summarize, type Period } from '@/lib/finance';
import { formatMoney, formatNumber, pctChange, round2 } from '@/lib/format';
import type { FinanceData } from '@/types';
import { t } from '@/i18n';

type Preset = 'this-month' | 'last-month' | 'month-2' | 'last-3' | 'prev-3' | 'this-year' | 'last-year' | 'custom';
const PRESET_LABELS: Record<Preset, string> = {
  'this-month': 'Este mês',
  'last-month': 'Mês passado',
  'month-2': 'Há 2 meses',
  'last-3': 'Últimos 3 meses',
  'prev-3': '3 meses anteriores',
  'this-year': 'Este ano',
  'last-year': 'Ano passado',
  custom: 'Personalizado',
};

function resolve(p: Preset, custom: Period): Period {
  const ref = today();
  switch (p) {
    case 'this-month':
      return { from: startOfMonth(ref), to: ref };
    case 'last-month':
      return { from: startOfMonth(addMonths(ref, -1)), to: endOfMonth(addMonths(ref, -1)) };
    case 'month-2':
      return { from: startOfMonth(addMonths(ref, -2)), to: endOfMonth(addMonths(ref, -2)) };
    case 'last-3':
      return { from: startOfMonth(addMonths(ref, -3)), to: addDays(startOfMonth(ref), -1) };
    case 'prev-3':
      return { from: startOfMonth(addMonths(ref, -6)), to: addDays(startOfMonth(addMonths(ref, -3)), -1) };
    case 'this-year':
      return { from: `${ref.slice(0, 4)}-01-01`, to: ref };
    case 'last-year': {
      const y = Number(ref.slice(0, 4)) - 1;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    default:
      return custom;
  }
}

function metrics(data: FinanceData, p: Period) {
  const s = summarize(data.transactions, p);
  let invested = 0;
  let debtPaid = 0;
  for (const tx of data.transactions) {
    if (!inPeriod(tx, p) || !isRealized(tx)) continue;
    if (tx.type === 'transfer' && !tx.toAccountId && !tx.toCardId) invested += tx.amount;
    if (tx.type === 'expense' && tx.tags.includes('dívida')) debtPaid += tx.amount;
  }
  return { income: s.income, expense: s.expense, profit: s.net, savings: Math.max(0, s.net), invested: round2(invested), debts: round2(debtPaid) };
}

const ROWS: { key: keyof ReturnType<typeof metrics>; label: string; short: string; inverse?: boolean }[] = [
  { key: 'income', label: 'Receita', short: 'Receita' },
  { key: 'expense', label: 'Despesas', short: 'Despesas', inverse: true },
  { key: 'profit', label: 'Lucro', short: 'Lucro' },
  { key: 'savings', label: 'Economia', short: 'Economia' },
  { key: 'invested', label: 'Investimentos (aportes)', short: 'Investimentos' },
  { key: 'debts', label: 'Dívidas pagas', short: 'Dívidas' },
];

function PeriodPicker({ label, preset, onPreset, custom, onCustom }: { label: string; preset: Preset; onPreset: (p: Preset) => void; custom: Period; onCustom: (p: Period) => void }) {
  return (
    <div className="flex-1 space-y-2">
      <p className="text-xs font-medium text-fg-subtle">{label}</p>
      <Select value={preset} onChange={(e) => onPreset(e.target.value as Preset)} aria-label={label} className="h-10">
        {Object.entries(PRESET_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
      </Select>
      {preset === 'custom' && (
        <div className="flex items-center gap-1.5 text-xs">
          <input type="date" aria-label={t('{periodo}: início', { periodo: label })} value={custom.from} onChange={(e) => e.target.value && onCustom({ ...custom, from: e.target.value })} className="h-9 flex-1 rounded-lg border border-border bg-surface-2/60 px-2" />
          <span className="text-fg-subtle">{t('até')}</span>
          <input type="date" aria-label={t('{periodo}: fim', { periodo: label })} value={custom.to} onChange={(e) => e.target.value && onCustom({ ...custom, to: e.target.value })} className="h-9 flex-1 rounded-lg border border-border bg-surface-2/60 px-2" />
        </div>
      )}
    </div>
  );
}

export function Compare({ data }: { data: FinanceData }) {
  const money = useMoney();
  const [a, setA] = useState<Preset>('last-month');
  const [b, setB] = useState<Preset>('month-2');
  const [ca, setCa] = useState<Period>({ from: startOfMonth(today()), to: today() });
  const [cb, setCb] = useState<Period>({ from: startOfMonth(addMonths(today(), -1)), to: endOfMonth(addMonths(today(), -1)) });
  const pa = resolve(a, ca);
  const pb = resolve(b, cb);
  const ma = useMemo(() => metrics(data, pa), [data, pa]);
  const mb = useMemo(() => metrics(data, pb), [data, pb]);
  const labelA = a === 'custom' ? `${formatDate(pa.from)}–${formatDate(pa.to)}` : t(PRESET_LABELS[a]);
  const labelB = b === 'custom' ? `${formatDate(pb.from)}–${formatDate(pb.to)}` : t(PRESET_LABELS[b]);

  const insights = useMemo(() => {
    const out: string[] = [];
    const de = ma.expense - mb.expense;
    if (ma.expense || mb.expense) {
      const vars = { a: labelA.toLowerCase(), b: labelB.toLowerCase(), valor: money(Math.abs(de)) };
      out.push(de <= 0 ? t('Em {a} você gastou {valor} a menos que em {b}.', vars) : t('Em {a} você gastou {valor} a mais que em {b}.', vars));
    }
    const di = pctChange(ma.income, mb.income);
    if (di !== null && ma.income && mb.income) out.push(di >= 0 ? t('Sua receita aumentou {pct}% entre os períodos.', { pct: formatNumber(Math.abs(di), 1) }) : t('Sua receita diminuiu {pct}% entre os períodos.', { pct: formatNumber(Math.abs(di), 1) }));
    if (ma.profit < 0 || mb.profit < 0) out.push(t('{periodo} terminou com prejuízo de {valor}.', { periodo: ma.profit < 0 ? labelA : labelB, valor: money(Math.abs(ma.profit < 0 ? ma.profit : mb.profit)) }));
    else if (ma.income && mb.income) {
      const ra = (ma.profit / ma.income) * 100;
      const rb = (mb.profit / mb.income) * 100;
      out.push(t('Taxa de economia: {pa}% em {a} vs. {pb}% em {b}.', { pa: formatNumber(ra), a: labelA.toLowerCase(), pb: formatNumber(rb), b: labelB.toLowerCase() }));
    }
    if (monthKey(pa.to) === monthKey(today()) && pa.to === today() && a === 'this-month') out.push(t('Atenção: o mês atual ainda está em andamento — a comparação é parcial.'));
    return out;
  }, [ma, mb, labelA, labelB, money, pa, a]);

  const chart = ROWS.map((r) => ({ label: t(r.short), A: ma[r.key], B: mb[r.key] }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold">{t('Comparar períodos')}</h2>
        <p className="text-sm text-fg-subtle">{t('Escolha dois períodos e veja as diferenças lado a lado.')}</p>
      </div>
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start">
          <PeriodPicker label={t('Período A')} preset={a} onPreset={setA} custom={ca} onCustom={setCa} />
          <ArrowRightLeft className="mx-auto mt-0 size-5 shrink-0 text-fg-subtle sm:mt-9" aria-hidden />
          <PeriodPicker label={t('Período B')} preset={b} onPreset={setB} custom={cb} onCustom={setCb} />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={t('Comparativo')} description={`${formatDate(pa.from)}–${formatDate(pa.to)} vs. ${formatDate(pb.from)}–${formatDate(pb.to)}`} />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-subtle">
                  <th className="pb-2 font-medium">{t('Indicador')}</th>
                  <th className="pb-2 text-right font-medium">A · {labelA}</th>
                  <th className="pb-2 text-right font-medium">B · {labelB}</th>
                  <th className="pb-2 text-right font-medium">A vs. B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ROWS.map((r) => (
                  <tr key={r.key}>
                    <td className="py-3 font-medium">{t(r.label)}</td>
                    <td className="tabular py-3 text-right">{money(ma[r.key])}</td>
                    <td className="tabular py-3 text-right text-fg-muted">{money(mb[r.key])}</td>
                    <td className="py-3 text-right"><Delta value={pctChange(ma[r.key], mb[r.key])} inverse={r.inverse} suffix="" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={t('Visualização')} />
          <CardBody>
            <Legend items={[{ label: `A · ${labelA}`, color: 'var(--series-1)' }, { label: `B · ${labelB}`, color: 'var(--series-2)' }]} />
            <div className="mt-3 h-64" role="img" aria-label={t('Comparativo em barras entre os períodos A e B')}>
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" {...axisProps} interval={0} fontSize={10} />
                  <YAxis {...axisProps} width={48} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ active, payload, label }) => (active && payload?.length ? <ChartTooltipBox title={String(label)} rows={[{ label: 'A', value: money(Number(payload[0].value)), color: 'var(--series-1)' }, { label: 'B', value: money(Number(payload[1]?.value ?? 0)), color: 'var(--series-2)' }]} /> : null)} />
                  <Bar dataKey="A" fill="var(--series-1)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="B" fill="var(--series-2)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title={t('O que mudou')} icon={<Lightbulb />} />
        <CardBody>
          <ul className="space-y-2 text-sm">
            {insights.map((i) => <li key={i} className="rounded-lg bg-surface-2/70 px-3 py-2">{i}</li>)}
            {!insights.length && <li className="text-fg-subtle">{t('Sem dados suficientes nos períodos escolhidos.')}</li>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
