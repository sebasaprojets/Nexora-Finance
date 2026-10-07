import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Pencil, Search, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Sparkline } from '@/components/ui/Sparkline';
import { ConfirmDialog } from '@/components/ui/Modal';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { ExportMenu } from '@/components/common/ExportMenu';
import { Donut } from '@/components/charts/Donut';
import { BarList } from '@/components/charts/BarList';
import { HeatmapCalendar } from '@/components/charts/HeatmapCalendar';
import { axisProps, ChartTooltipBox, Legend } from '@/components/charts/ChartTooltip';
import { useMoney } from '@/hooks/useMoney';
import { useLookups } from '@/hooks/useLookups';
import { useDebounce } from '@/hooks/useDebounce';
import { useUI } from '@/store/ui';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { cn } from '@/lib/cn';
import { addMonths, eachMonth, formatDate, formatMonthLong, formatMonthShort, monthKey, startOfMonth, today } from '@/lib/dates';
import { inPeriod, isRealized, monthlyByCategory, totalsByCategory, type DayActivity, type Period } from '@/lib/finance';
import { formatMoney, formatPercent } from '@/lib/format';
import type { FinanceData, Transaction } from '@/types';
import { METHOD_LABELS, STATUS_LABELS } from '@/lib/labels';

export function Spending({ data, period }: { data: FinanceData; period: Period }) {
  const money = useMoney();
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<'donut' | 'bars'>('donut');
  const cats = useMemo(() => totalsByCategory(data.transactions, data.categories, period, 'expense'), [data, period]);
  const total = cats.reduce((s, c) => s + c.total, 0);
  const sel = cats.find((c) => c.category.id === selected);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5">
        {/* 16. Para onde vai meu dinheiro? */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Para onde vai meu dinheiro?"
            description="Clique em uma categoria para ver o detalhamento"
            action={<Segmented size="sm" label="Visualização" value={view} onChange={setView} options={[{ value: 'donut', label: 'Donut' }, { value: 'bars', label: 'Barras' }]} />}
          />
          <CardBody>
            {cats.length === 0 ? (
              <p className="py-12 text-center text-sm text-fg-subtle">Sem despesas no período.</p>
            ) : view === 'donut' ? (
              <div className="grid items-center gap-6 sm:grid-cols-[220px_1fr]">
                <Donut data={cats.map((c) => ({ id: c.category.id, label: c.category.name, value: c.total, pct: c.pct, color: c.category.color }))} total={total} selected={selected} onSelect={setSelected} />
                <ul className="space-y-1">
                  {cats.map((c) => (
                    <li key={c.category.id}>
                      <button onClick={() => setSelected(selected === c.category.id ? null : c.category.id)} aria-pressed={selected === c.category.id} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-2', selected === c.category.id && 'bg-surface-2')}>
                        <span className="size-2.5 rounded-full" style={{ background: c.category.color }} aria-hidden />
                        <span className="flex-1 truncate text-left">{c.category.name}</span>
                        <span className="tabular text-xs text-fg-subtle">{formatPercent(c.pct)}</span>
                        <span className="tabular w-24 text-right font-medium">{money(c.total)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <BarList selected={selected} onSelect={(id) => setSelected(selected === id ? null : id)} items={cats.map((c) => ({ id: c.category.id, label: c.category.name, value: c.total, pct: c.pct, color: c.category.color, icon: <CategoryIcon icon={c.category.icon} color={c.category.color} size="sm" /> }))} />
            )}
          </CardBody>
        </Card>

        {/* 23. Ranking */}
        <Card className="lg:col-span-2">
          {sel ? (
            <CategoryDetail data={data} period={period} categoryId={sel.category.id} total={sel.total} pct={sel.pct} count={sel.count} onClose={() => setSelected(null)} />
          ) : (
            <>
              <CardHeader title="Onde seu dinheiro está indo?" description="Ranking de gastos no período" />
              <CardBody>
                <BarList ranked items={cats.slice(0, 7).map((c) => ({ id: c.category.id, label: c.category.name, value: c.total, color: c.category.color }))} onSelect={setSelected} />
              </CardBody>
            </>
          )}
        </Card>
      </div>

      <SpendingEvolution data={data} />
      <SpendingTable data={data} period={period} />
      <Heatmap data={data} />
    </div>
  );
}

function CategoryDetail({ data, period, categoryId, total, pct, count, onClose }: { data: FinanceData; period: Period; categoryId: string; total: number; pct: number; count: number; onClose: () => void }) {
  const money = useMoney();
  const openTx = useUI((s) => s.openTransaction);
  const cat = data.categories.find((c) => c.id === categoryId);
  const txs = useMemo(() => data.transactions.filter((t) => t.type === 'expense' && t.categoryId === categoryId && inPeriod(t, period) && isRealized(t)).sort((a, b) => b.amount - a.amount), [data, categoryId, period]);
  const months = eachMonth(startOfMonth(addMonths(today(), -5)), today());
  const trend = useMemo(() => {
    const m = monthlyByCategory(data.transactions, months, 'expense');
    return months.map((k) => m.get(k)?.get(categoryId) ?? 0);
  }, [data.transactions, months, categoryId]);
  return (
    <>
      <CardHeader
        title={cat?.name ?? 'Categoria'}
        icon={<CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" className="!size-8" />}
        description={`${formatPercent(pct)} das despesas do período`}
        action={<Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar detalhamento"><X className="size-4" /></Button>}
      />
      <CardBody>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">Total</p><p className="tabular text-sm font-semibold">{money(total, { compact: true })}</p></div>
          <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">Transações</p><p className="tabular text-sm font-semibold">{count}</p></div>
          <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">Ticket médio</p><p className="tabular text-sm font-semibold">{money(count ? total / count : 0, { compact: true })}</p></div>
        </div>
        <p className="mt-4 text-xs text-fg-subtle">Últimos 6 meses</p>
        <Sparkline data={trend} color={cat?.color} height={44} label={`Tendência de ${cat?.name}`} />
        <p className="mt-4 mb-1 text-xs font-medium text-fg-subtle">Maiores lançamentos</p>
        <ul className="scrollbar-thin max-h-52 divide-y divide-border overflow-y-auto">
          {txs.slice(0, 12).map((t) => (
            <li key={t.id}>
              <button onClick={() => openTx({ type: t.type, editing: t })} className="flex w-full justify-between gap-2 py-2 text-left text-sm hover:text-primary">
                <span className="truncate">{t.description} <span className="text-xs text-fg-subtle">· {formatDate(t.date).slice(0, 5)}</span></span>
                <span className="tabular shrink-0 font-medium">{money(t.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      </CardBody>
    </>
  );
}

function SpendingEvolution({ data }: { data: FinanceData }) {
  const money = useMoney();
  const [range, setRange] = useState<6 | 12>(6);
  const [compare, setCompare] = useState<string[]>([]);
  const months = useMemo(() => eachMonth(startOfMonth(addMonths(today(), -(range - 1))), today()), [range]);
  const byCat = useMemo(() => monthlyByCategory(data.transactions, months, 'expense'), [data.transactions, months]);
  const expenseCats = data.categories.filter((c) => c.kind === 'expense');
  const rows = months.map((m) => {
    const row: Record<string, number | string> = { key: m, label: formatMonthShort(m), total: [...(byCat.get(m)?.values() ?? [])].reduce((s, v) => s + v, 0) };
    for (const id of compare) row[id] = Math.round((byCat.get(m)?.get(id) ?? 0) * 100) / 100;
    return row;
  });
  const avg = rows.reduce((s, r) => s + Number(r.total), 0) / (rows.length || 1);
  const catById = new Map(data.categories.map((c) => [c.id, c]));

  return (
    <Card>
      <CardHeader title="Evolução dos gastos" description="Total mensal ou comparação entre categorias" action={<Segmented size="sm" label="Intervalo" value={String(range) as '6' | '12'} onChange={(v) => setRange(Number(v) as 6 | 12)} options={[{ value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }]} />} />
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-fg-subtle">Comparar categorias (até 4):</span>
          {expenseCats.map((c) => {
            const on = compare.includes(c.id);
            return (
              <button
                key={c.id}
                aria-pressed={on}
                disabled={!on && compare.length >= 4}
                onClick={() => setCompare((l) => (on ? l.filter((x) => x !== c.id) : [...l, c.id]))}
                className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40', on ? 'border-primary bg-primary-soft text-fg' : 'border-border text-fg-muted hover:bg-surface-2')}
              >
                <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                {c.name}
              </button>
            );
          })}
          {compare.length > 0 && <Button size="sm" variant="ghost" onClick={() => setCompare([])}>Limpar</Button>}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="h-72" role="img" aria-label="Evolução mensal dos gastos">
            <ResponsiveContainer>
              {compare.length === 0 ? (
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ active, payload }) => (active && payload?.length ? <ChartTooltipBox title={formatMonthLong(String((payload[0].payload as { key: string }).key))} rows={[{ label: 'Gastos', value: money(Number(payload[0].value)), color: 'var(--series-expense)' }]} footer={`Média do intervalo: ${money(avg)}`} /> : null)} />
                  <Bar dataKey="total" fill="var(--series-expense)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              ) : (
                <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
                  <Tooltip content={({ active, payload }) => (active && payload?.length ? <ChartTooltipBox title={formatMonthLong(String((payload[0].payload as { key: string }).key))} rows={payload.map((p) => ({ label: catById.get(String(p.dataKey))?.name ?? '', value: money(Number(p.value)), color: catById.get(String(p.dataKey))?.color }))} /> : null)} />
                  {compare.map((id) => (
                    <Line key={id} type="monotone" dataKey={id} stroke={catById.get(id)?.color} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, stroke: 'var(--surface)' }} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
            {compare.length > 0 && <div className="mt-2"><Legend items={compare.map((id) => ({ label: catById.get(id)?.name ?? '', color: catById.get(id)?.color ?? '' }))} /></div>}
          </div>
          <ul className="space-y-1.5 text-sm">
            {[...rows].reverse().map((r) => (
              <li key={String(r.key)} className="flex justify-between rounded-lg px-2 py-1 hover:bg-surface-2">
                <span className="text-fg-muted">{formatMonthLong(String(r.key)).split(' de ')[0]}</span>
                <span className="tabular font-medium">{money(Number(r.total))}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border px-2 pt-2 text-xs text-fg-subtle"><span>Média mensal</span><span className="tabular">{money(avg)}</span></li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}

type SortKey = 'date' | 'description' | 'category' | 'amount';
const PAGE = 12;

function SpendingTable({ data, period }: { data: FinanceData; period: Period }) {
  const money = useMoney();
  const lookups = useLookups();
  const openTx = useUI((s) => s.openTransaction);
  const deleteTransactions = useFinance((s) => s.deleteTransactions);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<Transaction | null>(null);
  const dq = useDebounce(q, 200).toLowerCase();

  const rows = useMemo(() => {
    const list = data.transactions.filter((t) => t.type === 'expense' && inPeriod(t, period) && (!category || t.categoryId === category) && (!dq || t.description.toLowerCase().includes(dq)));
    list.sort((a, b) => {
      const k = sort.key;
      const v = k === 'amount' ? a.amount - b.amount : k === 'date' ? a.date.localeCompare(b.date) : k === 'description' ? a.description.localeCompare(b.description) : (lookups.category.get(a.categoryId ?? '')?.name ?? '').localeCompare(lookups.category.get(b.categoryId ?? '')?.name ?? '');
      return v * sort.dir;
    });
    return list;
  }, [data.transactions, period, category, dq, sort, lookups]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = rows.slice(page * PAGE, page * PAGE + PAGE);
  const source = (t: Transaction) => (t.cardId ? lookups.card.get(t.cardId)?.name : lookups.account.get(t.accountId ?? '')?.name) ?? '—';
  const th = (k: SortKey, label: string, right?: boolean) => (
    <th className={cn('pb-2 font-medium', right && 'text-right')}>
      <button onClick={() => { setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : k === 'amount' || k === 'date' ? -1 : 1 })); setPage(0); }} className={cn('flex items-center gap-1 hover:text-fg', right && 'ml-auto')}>
        {label} {sort.key === k ? sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />}
      </button>
    </th>
  );

  return (
    <Card>
      <CardHeader
        title="Detalhamento de Gastos"
        description={`${rows.length} despesas · ${money(rows.reduce((s, t) => s + t.amount, 0))}`}
        action={
          <ExportMenu
            size="sm"
            title="Detalhamento de gastos"
            getTables={() => [
              {
                title: 'Detalhamento de Gastos',
                columns: [
                  { header: 'Data', key: 'date', type: 'date', width: 12 },
                  { header: 'Descrição', key: 'desc', width: 30 },
                  { header: 'Categoria', key: 'cat' },
                  { header: 'Conta', key: 'acc' },
                  { header: 'Método', key: 'method' },
                  { header: 'Valor', key: 'amount', type: 'money' },
                  { header: 'Status', key: 'status' },
                ],
                rows: rows.map((t) => ({ date: t.date, desc: t.description, cat: lookups.category.get(t.categoryId ?? '')?.name ?? '', acc: source(t), method: METHOD_LABELS[t.method], amount: t.amount, status: STATUS_LABELS[t.status] })),
                summary: [{ label: 'Total', value: formatMoney(rows.reduce((s, t) => s + t.amount, 0)) }],
              },
            ]}
          />
        }
      />
      <CardBody>
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_220px]">
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Buscar despesa…" leftIcon={<Search />} aria-label="Buscar despesas" className="h-10" />
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} aria-label="Filtrar categoria" className="h-10">
            <option value="">Todas as categorias</option>
            {data.categories.filter((c) => c.kind === 'expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-subtle">
                {th('date', 'Data')}
                {th('description', 'Descrição')}
                {th('category', 'Categoria')}
                <th className="pb-2 font-medium">Conta</th>
                <th className="pb-2 font-medium">Método</th>
                {th('amount', 'Valor', true)}
                <th className="pb-2 pl-3 font-medium">Status</th>
                <th className="pb-2"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {current.map((t) => {
                const c = lookups.category.get(t.categoryId ?? '');
                return (
                  <tr key={t.id} className="group">
                    <td className="tabular py-2.5 text-fg-muted">{formatDate(t.date).slice(0, 5)}</td>
                    <td className="max-w-56 truncate py-2.5 font-medium">{t.description}</td>
                    <td className="py-2.5"><span className="inline-flex items-center gap-1.5 text-fg-muted"><span className="size-2 rounded-full" style={{ background: c?.color }} aria-hidden />{c?.name ?? '—'}</span></td>
                    <td className="py-2.5 text-fg-muted">{source(t)}</td>
                    <td className="py-2.5 text-fg-muted">{METHOD_LABELS[t.method]}</td>
                    <td className="tabular py-2.5 text-right font-semibold">{money(t.amount)}</td>
                    <td className="py-2.5 pl-3"><Badge tone={t.status === 'paid' ? 'success' : 'warning'}>{STATUS_LABELS[t.status]}</Badge></td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${t.description}`} onClick={() => openTx({ type: t.type, editing: t })}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${t.description}`} onClick={() => setConfirm(t)}><Trash2 className="size-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
              {current.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-fg-subtle">Nenhuma despesa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-fg-subtle">
            <span>Página {page + 1} de {pages}</span>
            <Button variant="ghost" size="icon-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior"><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="icon-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página"><ChevronRight className="size-4" /></Button>
          </div>
        )}
      </CardBody>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title="Excluir despesa?" description={confirm ? `${confirm.description} · ${formatMoney(confirm.amount)}` : ''} confirmLabel="Excluir" onConfirm={() => { if (confirm) { deleteTransactions([confirm.id]); toast.success('Despesa excluída'); } }} />
    </Card>
  );
}

function Heatmap({ data }: { data: FinanceData }) {
  const money = useMoney();
  const lookups = useLookups();
  const [month, setMonth] = useState(monthKey(today()));
  const [day, setDay] = useState<{ date: string; activity?: DayActivity } | null>(null);
  const dayTxs = useMemo(() => (day ? data.transactions.filter((t) => t.date === day.date && t.type !== 'transfer') : []), [day, data.transactions]);
  const isCurrent = month === monthKey(today());
  return (
    <Card>
      <CardHeader
        title="Heatmap financeiro"
        description="Intensidade de gastos por dia — clique em um dia"
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Mês anterior" onClick={() => { setMonth(monthKey(addMonths(`${month}-01`, -1))); setDay(null); }}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-32 text-center text-sm font-medium">{formatMonthLong(month)}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Próximo mês" disabled={isCurrent} onClick={() => { setMonth(monthKey(addMonths(`${month}-01`, 1))); setDay(null); }}><ChevronRight className="size-4" /></Button>
          </div>
        }
      />
      <CardBody className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <HeatmapCalendar month={month} transactions={data.transactions} selected={day?.date ?? null} onSelect={(date, activity) => setDay({ date, activity })} />
        <div className="rounded-xl border border-border p-4" aria-live="polite">
          {day ? (
            <>
              <p className="font-display font-semibold">{formatDate(day.date)}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">Receitas</p><p className="tabular text-sm font-semibold text-income">{money(day.activity?.income ?? 0)}</p></div>
                <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">Despesas</p><p className="tabular text-sm font-semibold">{money(day.activity?.expense ?? 0)}</p></div>
                <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">Resultado</p><p className={cn('tabular text-sm font-semibold', (day.activity?.net ?? 0) >= 0 ? 'text-success' : 'text-danger')}>{money(day.activity?.net ?? 0, { signed: true })}</p></div>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {dayTxs.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-2 text-sm">
                    <CategoryIcon icon={lookups.category.get(t.categoryId ?? '')?.icon} color={lookups.category.get(t.categoryId ?? '')?.color} size="sm" />
                    <span className="flex-1 truncate">{t.description}</span>
                    <span className={cn('tabular font-medium', t.type === 'income' && 'text-income')}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</span>
                  </li>
                ))}
                {!dayTxs.length && <li className="py-4 text-center text-sm text-fg-subtle">Sem transações neste dia.</li>}
              </ul>
            </>
          ) : (
            <p className="grid h-full min-h-40 place-items-center text-center text-sm text-fg-subtle">Selecione um dia no calendário para ver receitas, despesas e transações.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
