import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Pencil, Search, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Deferred } from '@/components/common/Deferred';
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
import { addMonths, eachMonth, formatDate, formatDayMonth, formatMonthLong, formatMonthShort, monthKey, monthName, startOfMonth, today } from '@/lib/dates';
import { inPeriod, isRealized, monthlyByCategory, totalsByCategory, type DayActivity, type Period } from '@/lib/finance';
import { formatMoney, formatPercent } from '@/lib/format';
import type { FinanceData, Transaction } from '@/types';
import { METHOD_LABELS, STATUS_LABELS } from '@/lib/labels';
import { currentLocale, t } from '@/i18n';

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
            title={t('Para onde vai meu dinheiro?')}
            description={t('Clique em uma categoria para ver o detalhamento')}
            action={<Segmented size="sm" label={t('Visualização')} value={view} onChange={setView} options={[{ value: 'donut', label: t('Donut') }, { value: 'bars', label: t('Barras') }]} />}
          />
          <CardBody>
            {cats.length === 0 ? (
              <p className="py-12 text-center text-sm text-fg-subtle">{t('Sem despesas no período.')}</p>
            ) : view === 'donut' ? (
              <div className="grid items-center gap-6 sm:grid-cols-[220px_1fr]">
                <Donut data={cats.map((c) => ({ id: c.category.id, label: t(c.category.name), value: c.total, pct: c.pct, color: c.category.color }))} total={total} selected={selected} onSelect={setSelected} />
                <ul className="space-y-1">
                  {cats.map((c) => (
                    <li key={c.category.id}>
                      <button onClick={() => setSelected(selected === c.category.id ? null : c.category.id)} aria-pressed={selected === c.category.id} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-2', selected === c.category.id && 'bg-surface-2')}>
                        <span className="size-2.5 rounded-full" style={{ background: c.category.color }} aria-hidden />
                        <span className="flex-1 truncate text-left">{t(c.category.name)}</span>
                        <span className="tabular text-xs text-fg-subtle">{formatPercent(c.pct)}</span>
                        <span className="tabular w-24 text-right font-medium">{money(c.total)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <BarList selected={selected} onSelect={(id) => setSelected(selected === id ? null : id)} items={cats.map((c) => ({ id: c.category.id, label: t(c.category.name), value: c.total, pct: c.pct, color: c.category.color, icon: <CategoryIcon icon={c.category.icon} color={c.category.color} size="sm" /> }))} />
            )}
          </CardBody>
        </Card>

        {/* 23. Ranking */}
        <Card className="lg:col-span-2">
          {sel ? (
            <CategoryDetail data={data} period={period} categoryId={sel.category.id} total={sel.total} pct={sel.pct} count={sel.count} onClose={() => setSelected(null)} />
          ) : (
            <>
              <CardHeader title={t('Onde seu dinheiro está indo?')} description={t('Ranking de gastos no período')} />
              <CardBody>
                <BarList ranked items={cats.slice(0, 7).map((c) => ({ id: c.category.id, label: t(c.category.name), value: c.total, color: c.category.color }))} onSelect={setSelected} />
              </CardBody>
            </>
          )}
        </Card>
      </div>

      <Deferred minHeight={460}>
        <SpendingEvolution data={data} />
      </Deferred>
      <Deferred minHeight={560}>
        <SpendingTable data={data} period={period} />
      </Deferred>
      <Deferred minHeight={520}>
        <Heatmap data={data} />
      </Deferred>
    </div>
  );
}

function CategoryDetail({ data, period, categoryId, total, pct, count, onClose }: { data: FinanceData; period: Period; categoryId: string; total: number; pct: number; count: number; onClose: () => void }) {
  const money = useMoney();
  const openTx = useUI((s) => s.openTransaction);
  const cat = data.categories.find((c) => c.id === categoryId);
  const txs = useMemo(() => data.transactions.filter((tx) => tx.type === 'expense' && tx.categoryId === categoryId && inPeriod(tx, period) && isRealized(tx)).sort((a, b) => b.amount - a.amount), [data, categoryId, period]);
  const months = eachMonth(startOfMonth(addMonths(today(), -5)), today());
  const trend = useMemo(() => {
    const m = monthlyByCategory(data.transactions, months, 'expense');
    return months.map((k) => m.get(k)?.get(categoryId) ?? 0);
  }, [data.transactions, months, categoryId]);
  return (
    <>
      <CardHeader
        title={cat ? t(cat.name) : t('Categoria')}
        icon={<CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" className="!size-8" />}
        description={t('{pct} das despesas do período', { pct: formatPercent(pct) })}
        action={<Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('Fechar detalhamento')}><X className="size-4" /></Button>}
      />
      <CardBody>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">{t('Total')}</p><p className="tabular text-sm font-semibold">{money(total, { compact: true })}</p></div>
          <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">{t('Transações')}</p><p className="tabular text-sm font-semibold">{count}</p></div>
          <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">{t('Ticket médio')}</p><p className="tabular text-sm font-semibold">{money(count ? total / count : 0, { compact: true })}</p></div>
        </div>
        <p className="mt-4 text-xs text-fg-subtle">{t('Últimos 6 meses')}</p>
        <Sparkline data={trend} color={cat?.color} height={44} label={t('Tendência de {cat}', { cat: t(cat?.name ?? '') })} />
        <p className="mt-4 mb-1 text-xs font-medium text-fg-subtle">{t('Maiores lançamentos')}</p>
        <ul className="scrollbar-thin max-h-52 divide-y divide-border overflow-y-auto">
          {txs.slice(0, 12).map((tx) => (
            <li key={tx.id}>
              <button onClick={() => openTx({ type: tx.type, editing: tx })} className="flex w-full justify-between gap-2 py-2 text-left text-sm hover:text-primary">
                <span className="truncate">{tx.description} <span className="text-xs text-fg-subtle">· {formatDayMonth(tx.date)}</span></span>
                <span className="tabular shrink-0 font-medium">{money(tx.amount)}</span>
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
      <CardHeader title={t('Evolução dos gastos')} description={t('Total mensal ou comparação entre categorias')} action={<Segmented size="sm" label={t('Intervalo')} value={String(range) as '6' | '12'} onChange={(v) => setRange(Number(v) as 6 | 12)} options={[{ value: '6', label: t('{n} meses', { n: 6 }) }, { value: '12', label: t('{n} meses', { n: 12 }) }]} />} />
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-fg-subtle">{t('Comparar categorias (até {n}):', { n: 4 })}</span>
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
                {t(c.name)}
              </button>
            );
          })}
          {compare.length > 0 && <Button size="sm" variant="ghost" onClick={() => setCompare([])}>{t('Limpar')}</Button>}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="h-72" role="img" aria-label={t('Evolução mensal dos gastos')}>
            <ResponsiveContainer>
              {compare.length === 0 ? (
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ active, payload }) => (active && payload?.length ? <ChartTooltipBox title={formatMonthLong(String((payload[0].payload as { key: string }).key))} rows={[{ label: t('Gastos'), value: money(Number(payload[0].value)), color: 'var(--series-expense)' }]} footer={t('Média do intervalo: {valor}', { valor: money(avg) })} /> : null)} />
                  <Bar dataKey="total" fill="var(--series-expense)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              ) : (
                <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
                  <Tooltip content={({ active, payload }) => (active && payload?.length ? <ChartTooltipBox title={formatMonthLong(String((payload[0].payload as { key: string }).key))} rows={payload.map((p) => ({ label: t(catById.get(String(p.dataKey))?.name ?? ''), value: money(Number(p.value)), color: catById.get(String(p.dataKey))?.color }))} /> : null)} />
                  {compare.map((id) => (
                    <Line key={id} type="monotone" dataKey={id} stroke={catById.get(id)?.color} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, stroke: 'var(--surface)' }} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
            {compare.length > 0 && <div className="mt-2"><Legend items={compare.map((id) => ({ label: t(catById.get(id)?.name ?? ''), color: catById.get(id)?.color ?? '' }))} /></div>}
          </div>
          <ul className="space-y-1.5 text-sm">
            {[...rows].reverse().map((r) => (
              <li key={String(r.key)} className="flex justify-between rounded-lg px-2 py-1 hover:bg-surface-2">
                <span className="text-fg-muted">{monthName(String(r.key))}</span>
                <span className="tabular font-medium">{money(Number(r.total))}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border px-2 pt-2 text-xs text-fg-subtle"><span>{t('Média mensal')}</span><span className="tabular">{money(avg)}</span></li>
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
    const list = data.transactions.filter((tx) => tx.type === 'expense' && inPeriod(tx, period) && (!category || tx.categoryId === category) && (!dq || tx.description.toLowerCase().includes(dq)));
    list.sort((a, b) => {
      const k = sort.key;
      const v = k === 'amount' ? a.amount - b.amount : k === 'date' ? a.date.localeCompare(b.date) : k === 'description' ? a.description.localeCompare(b.description, currentLocale()) : t(lookups.category.get(a.categoryId ?? '')?.name ?? '').localeCompare(t(lookups.category.get(b.categoryId ?? '')?.name ?? ''), currentLocale());
      return v * sort.dir;
    });
    return list;
  }, [data.transactions, period, category, dq, sort, lookups]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = rows.slice(page * PAGE, page * PAGE + PAGE);
  const source = (tx: Transaction) => (tx.cardId ? lookups.card.get(tx.cardId)?.name : lookups.account.get(tx.accountId ?? '')?.name) ?? '—';
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
        title={t('Detalhamento de Gastos')}
        description={rows.length === 1 ? t('{n} despesa · {valor}', { n: rows.length, valor: money(rows.reduce((s, tx) => s + tx.amount, 0)) }) : t('{n} despesas · {valor}', { n: rows.length, valor: money(rows.reduce((s, tx) => s + tx.amount, 0)) })}
        action={
          <ExportMenu
            size="sm"
            title={t('Detalhamento de gastos')}
            getTables={() => [
              {
                title: t('Detalhamento de Gastos'),
                columns: [
                  { header: t('Data'), key: 'date', type: 'date', width: 12 },
                  { header: t('Descrição'), key: 'desc', width: 30 },
                  { header: t('Categoria'), key: 'cat' },
                  { header: t('Conta'), key: 'acc' },
                  { header: t('Método'), key: 'method' },
                  { header: t('Valor'), key: 'amount', type: 'money' },
                  { header: t('Status'), key: 'status' },
                ],
                rows: rows.map((tx) => ({ date: tx.date, desc: tx.description, cat: t(lookups.category.get(tx.categoryId ?? '')?.name ?? ''), acc: source(tx), method: t(METHOD_LABELS[tx.method]), amount: tx.amount, status: t(STATUS_LABELS[tx.status]) })),
                summary: [{ label: t('Total'), value: formatMoney(rows.reduce((s, tx) => s + tx.amount, 0)) }],
              },
            ]}
          />
        }
      />
      <CardBody>
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_220px]">
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t('Buscar despesa…')} leftIcon={<Search />} aria-label={t('Buscar despesas')} className="h-10" />
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} aria-label={t('Filtrar categoria')} className="h-10">
            <option value="">{t('Todas as categorias')}</option>
            {data.categories.filter((c) => c.kind === 'expense').map((c) => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-subtle">
                {th('date', t('Data'))}
                {th('description', t('Descrição'))}
                {th('category', t('Categoria'))}
                <th className="pb-2 font-medium">{t('Conta')}</th>
                <th className="pb-2 font-medium">{t('Método')}</th>
                {th('amount', t('Valor'), true)}
                <th className="pb-2 pl-3 font-medium">{t('Status')}</th>
                <th className="pb-2"><span className="sr-only">{t('Ações')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {current.map((tx) => {
                const c = lookups.category.get(tx.categoryId ?? '');
                return (
                  <tr key={tx.id} className="group">
                    <td className="tabular py-2.5 text-fg-muted">{formatDayMonth(tx.date)}</td>
                    <td className="max-w-56 truncate py-2.5 font-medium">{tx.description}</td>
                    <td className="py-2.5"><span className="inline-flex items-center gap-1.5 text-fg-muted"><span className="size-2 rounded-full" style={{ background: c?.color }} aria-hidden />{c ? t(c.name) : '—'}</span></td>
                    <td className="py-2.5 text-fg-muted">{source(tx)}</td>
                    <td className="py-2.5 text-fg-muted">{t(METHOD_LABELS[tx.method])}</td>
                    <td className="tabular py-2.5 text-right font-semibold">{money(tx.amount)}</td>
                    <td className="py-2.5 pl-3"><Badge tone={tx.status === 'paid' ? 'success' : 'warning'}>{t(STATUS_LABELS[tx.status])}</Badge></td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon-sm" aria-label={t('Editar {item}', { item: tx.description })} onClick={() => openTx({ type: tx.type, editing: tx })}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label={t('Excluir {item}', { item: tx.description })} onClick={() => setConfirm(tx)}><Trash2 className="size-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
              {current.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-fg-subtle">{t('Nenhuma despesa encontrada.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-fg-subtle">
            <span>{t('Página {page} de {pages}', { page: page + 1, pages })}</span>
            <Button variant="ghost" size="icon-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label={t('Página anterior')}><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="icon-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label={t('Próxima página')}><ChevronRight className="size-4" /></Button>
          </div>
        )}
      </CardBody>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title={t('Excluir despesa?')} description={confirm ? `${confirm.description} · ${formatMoney(confirm.amount)}` : ''} confirmLabel={t('Excluir')} onConfirm={() => { if (confirm) { deleteTransactions([confirm.id]); toast.success(t('Despesa excluída')); } }} />
    </Card>
  );
}

function Heatmap({ data }: { data: FinanceData }) {
  const money = useMoney();
  const lookups = useLookups();
  const [month, setMonth] = useState(monthKey(today()));
  const [day, setDay] = useState<{ date: string; activity?: DayActivity } | null>(null);
  const dayTxs = useMemo(() => (day ? data.transactions.filter((tx) => tx.date === day.date && tx.type !== 'transfer') : []), [day, data.transactions]);
  const isCurrent = month === monthKey(today());
  return (
    <Card>
      <CardHeader
        title={t('Heatmap financeiro')}
        description={t('Intensidade de gastos por dia — clique em um dia')}
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={t('Mês anterior')} onClick={() => { setMonth(monthKey(addMonths(`${month}-01`, -1))); setDay(null); }}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-32 text-center text-sm font-medium">{formatMonthLong(month)}</span>
            <Button variant="ghost" size="icon-sm" aria-label={t('Próximo mês')} disabled={isCurrent} onClick={() => { setMonth(monthKey(addMonths(`${month}-01`, 1))); setDay(null); }}><ChevronRight className="size-4" /></Button>
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
                <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">{t('Receitas')}</p><p className="tabular text-sm font-semibold text-income">{money(day.activity?.income ?? 0)}</p></div>
                <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">{t('Despesas')}</p><p className="tabular text-sm font-semibold">{money(day.activity?.expense ?? 0)}</p></div>
                <div className="rounded-lg bg-surface-2/70 p-2"><p className="text-[11px] text-fg-subtle">{t('Resultado')}</p><p className={cn('tabular text-sm font-semibold', (day.activity?.net ?? 0) >= 0 ? 'text-success' : 'text-danger')}>{money(day.activity?.net ?? 0, { signed: true })}</p></div>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {dayTxs.map((tx) => (
                  <li key={tx.id} className="flex items-center gap-2 py-2 text-sm">
                    <CategoryIcon icon={lookups.category.get(tx.categoryId ?? '')?.icon} color={lookups.category.get(tx.categoryId ?? '')?.color} size="sm" />
                    <span className="flex-1 truncate">{tx.description}</span>
                    <span className={cn('tabular font-medium', tx.type === 'income' && 'text-income')}>{tx.type === 'income' ? '+' : '−'}{money(tx.amount)}</span>
                  </li>
                ))}
                {!dayTxs.length && <li className="py-4 text-center text-sm text-fg-subtle">{t('Sem transações neste dia.')}</li>}
              </ul>
            </>
          ) : (
            <p className="grid h-full min-h-40 place-items-center text-center text-sm text-fg-subtle">{t('Selecione um dia no calendário para ver receitas, despesas e transações.')}</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
