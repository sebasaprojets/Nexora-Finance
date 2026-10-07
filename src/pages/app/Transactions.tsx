import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown, ArrowUp, ChevronsUpDown, Copy, FilterX, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ExportMenu } from '@/components/common/ExportMenu';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { Badge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useFinance } from '@/store/finance';
import { TourButton, usePageTour } from '@/components/tour/Tour';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useLookups } from '@/hooks/useLookups';
import { useMoney } from '@/hooks/useMoney';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { addDays, addMonths, formatDate, formatRelativeDay, startOfMonth, today } from '@/lib/dates';
import { round2 } from '@/lib/format';
import type { ExportTable } from '@/lib/export';
import { METHOD_LABELS, STATUS_LABELS, TYPE_LABELS } from '@/lib/labels';
import type { Transaction, TransactionType } from '@/types';

type SortKey = 'date' | 'description' | 'category' | 'amount';
type RangeKey = 'all' | 'month' | '30d' | '3m' | '1y';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Transactions() {
  const transactions = useFinance((s) => s.transactions);
  const categories = useFinance((s) => s.categories);
  const accounts = useFinance((s) => s.accounts);
  const cards = useFinance((s) => s.cards);
  const deleteTransactions = useFinance((s) => s.deleteTransactions);
  const duplicateTransaction = useFinance((s) => s.duplicateTransaction);
  const addTransaction = useFinance((s) => s.addTransaction);
  const openTx = useUI((s) => s.openTransaction);
  const lookups = useLookups();
  const money = useMoney();
  const desktop = useIsDesktop();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get('busca') ?? '');
  const [type, setType] = useState<'all' | TransactionType>('all');
  const [category, setCategory] = useState(params.get('categoria') ?? '');
  const [source, setSource] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState<RangeKey>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const debounced = useDebounce(query, 200);
  usePageTour('transactions');

  // Atalhos de URL: ?nova=expense (atalho do PWA) e ?busca=
  useEffect(() => {
    const nova = params.get('nova') as TransactionType | null;
    if (nova && ['income', 'expense', 'transfer'].includes(nova)) {
      openTx({ type: nova });
      params.delete('nova');
      setParams(params, { replace: true });
    }
  }, [params, setParams, openTx]);

  const filtered = useMemo(() => {
    const q = normalize(debounced.trim());
    const ref = today();
    const from =
      range === 'month' ? startOfMonth(ref) : range === '30d' ? addDays(ref, -29) : range === '3m' ? startOfMonth(addMonths(ref, -2)) : range === '1y' ? addMonths(ref, -12) : '';
    const out = transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (category && t.categoryId !== category) return false;
      if (source) {
        const [k, id] = source.split(':');
        if (k === 'acc' && t.accountId !== id && t.toAccountId !== id) return false;
        if (k === 'card' && t.cardId !== id && t.toCardId !== id) return false;
      }
      if (method && t.method !== method) return false;
      if (status && t.status !== status) return false;
      if (from && t.date < from) return false;
      if (q) {
        const cat = t.categoryId ? lookups.category.get(t.categoryId)?.name ?? '' : '';
        if (!normalize(`${t.description} ${cat} ${t.tags.join(' ')} ${t.notes ?? ''}`).includes(q)) return false;
      }
      return true;
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    out.sort((a, b) => {
      switch (sort.key) {
        case 'amount':
          return (a.amount - b.amount) * dir;
        case 'description':
          return a.description.localeCompare(b.description, 'pt-BR') * dir;
        case 'category':
          return (lookups.category.get(a.categoryId ?? '')?.name ?? '').localeCompare(lookups.category.get(b.categoryId ?? '')?.name ?? '', 'pt-BR') * dir;
        default:
          return (a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)) * dir;
      }
    });
    return out;
  }, [transactions, debounced, type, category, source, method, status, range, sort, lookups]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    }
    return { income: round2(income), expense: round2(expense), net: round2(income - expense) };
  }, [filtered]);

  const activeFilters = [category, source, method, status].filter(Boolean).length + (type !== 'all' ? 1 : 0) + (range !== 'all' ? 1 : 0) + (debounced ? 1 : 0);
  const clearFilters = () => {
    setQuery('');
    setType('all');
    setCategory('');
    setSource('');
    setMethod('');
    setStatus('');
    setRange('all');
  };

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'description' || key === 'category' ? 'asc' : 'desc' }));

  const remove = (ids: string[]) => {
    const removed = transactions.filter((t) => ids.includes(t.id));
    deleteTransactions(ids);
    setSelected(new Set());
    toast.success(ids.length > 1 ? `${ids.length} transações excluídas` : 'Transação excluída', {
      action: {
        label: 'Desfazer',
        onClick: () => useFinance.setState((s) => ({ transactions: [...removed, ...s.transactions] })),
      },
    });
  };

  const sourceName = (t: Transaction) =>
    t.cardId ? lookups.card.get(t.cardId)?.name ?? '—' : t.accountId ? lookups.account.get(t.accountId)?.name ?? '—' : '—';

  const exportTables = (): ExportTable[] => [
    {
      title: 'Detalhamento de transações',
      subtitle: `${filtered.length} lançamentos`,
      columns: [
        { header: 'Data', key: 'date', type: 'date', width: 12 },
        { header: 'Descrição', key: 'description', width: 32 },
        { header: 'Tipo', key: 'type', width: 14 },
        { header: 'Categoria', key: 'category', width: 18 },
        { header: 'Conta', key: 'account', width: 22 },
        { header: 'Método', key: 'method', width: 14 },
        { header: 'Valor', key: 'amount', type: 'money' },
        { header: 'Status', key: 'status', width: 12 },
      ],
      rows: filtered.map((t) => ({
        date: t.date,
        description: t.description,
        type: TYPE_LABELS[t.type],
        category: t.categoryId ? lookups.category.get(t.categoryId)?.name ?? '' : '',
        account: sourceName(t),
        method: METHOD_LABELS[t.method],
        amount: t.type === 'expense' ? -t.amount : t.amount,
        status: STATUS_LABELS[t.status],
      })),
      summary: [
        { label: 'Receitas', value: money(totals.income, { ignoreHidden: true }) },
        { label: 'Despesas', value: money(totals.expense, { ignoreHidden: true }) },
        { label: 'Resultado', value: money(totals.net, { ignoreHidden: true }) },
      ],
    },
  ];

  const listRef = useRef<HTMLDivElement>(null);
  const rowHeight = desktop ? 56 : 64;
  const virtualizer = useWindowVirtualizer({
    count: filtered.length,
    estimateSize: () => rowHeight,
    overscan: 12,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  const actionsFor = (t: Transaction) => [
    { label: 'Editar', icon: <Pencil />, onSelect: () => openTx({ type: t.type, editing: t }) },
    {
      label: 'Duplicar',
      icon: <Copy />,
      onSelect: () => {
        duplicateTransaction(t.id);
        toast.success('Transação duplicada com a data de hoje');
      },
    },
    { label: 'Excluir', icon: <Trash2 />, danger: true, onSelect: () => setConfirm([t.id]) },
  ];

  const SortHeader = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <button onClick={() => toggleSort(k)} className={cn('flex items-center gap-1 hover:text-fg', className)} aria-label={`Ordenar por ${children}`}>
      {children}
      {sort.key === k ? sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />}
    </button>
  );

  const gridCols = 'grid-cols-[28px_92px_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_100px_130px_96px_40px]';

  return (
    <div>
      <PageHeader
        title="Transações"
        description="Receitas, despesas e transferências em um só lugar."
        actions={
          <>
            <TourButton id="transactions" />
            <ExportMenu getTables={exportTables} title="Transações" />
            <Button leftIcon={<Plus className="size-4" />} onClick={() => openTx({ type: 'expense' })}>
              Nova transação
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1" data-tour="tx-search">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por descrição, categoria ou tag…" leftIcon={<Search />} aria-label="Buscar transações" />
          </div>
          <div data-tour="tx-filters" className="flex items-center gap-2 overflow-x-auto">
            <Segmented
              label="Tipo"
              value={type}
              onChange={setType}
              size="sm"
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'income', label: 'Receitas' },
                { value: 'expense', label: 'Despesas' },
                { value: 'transfer', label: 'Transferências' },
              ]}
            />
            <Button variant={showFilters ? 'soft' : 'secondary'} size="sm" leftIcon={<SlidersHorizontal className="size-3.5" />} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
              Filtros{activeFilters ? ` (${activeFilters})` : ''}
            </Button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 md:grid-cols-3 xl:grid-cols-6">
            <Select aria-label="Período" value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="h-9">
              <option value="all">Todo o período</option>
              <option value="month">Este mês</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="3m">Últimos 3 meses</option>
              <option value="1y">Últimos 12 meses</option>
            </Select>
            <Select aria-label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9">
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind === 'income' ? 'receita' : 'despesa'})
                </option>
              ))}
            </Select>
            <Select aria-label="Conta ou cartão" value={source} onChange={(e) => setSource(e.target.value)} className="h-9">
              <option value="">Todas as contas</option>
              {accounts.map((a) => (
                <option key={a.id} value={`acc:${a.id}`}>
                  {a.name}
                </option>
              ))}
              {cards.map((c) => (
                <option key={c.id} value={`card:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select aria-label="Método" value={method} onChange={(e) => setMethod(e.target.value)} className="h-9">
              <option value="">Todos os métodos</option>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9">
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" className="h-9" leftIcon={<FilterX className="size-3.5" />} onClick={clearFilters} disabled={!activeFilters}>
              Limpar filtros
            </Button>
          </div>
        )}
      </Card>

      <div data-tour="tx-summary" className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Receitas', value: totals.income, cls: 'text-income' },
          { label: 'Despesas', value: totals.expense, cls: 'text-fg' },
          { label: 'Resultado', value: totals.net, cls: totals.net >= 0 ? 'text-success' : 'text-danger' },
        ].map((s) => (
          <div key={s.label} className="card px-3 py-2.5 sm:px-4">
            <p className="text-xs text-fg-subtle">{s.label}</p>
            <p className={cn('tabular mt-0.5 truncate text-sm font-semibold sm:text-base', s.cls)}>{money(s.value)}</p>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="glass sticky top-[72px] z-20 mb-3 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm shadow-md">
          <span className="font-medium">{selected.size} selecionada(s)</span>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Limpar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Copy className="size-3.5" />}
            onClick={() => {
              for (const id of selected) {
                const t = transactions.find((x) => x.id === id);
                if (t) addTransaction({ ...t, date: today(), tags: t.tags });
              }
              toast.success(`${selected.size} transação(ões) duplicada(s)`);
              setSelected(new Set());
            }}
          >
            Duplicar
          </Button>
          <Button size="sm" variant="danger" className="ml-auto" leftIcon={<Trash2 className="size-3.5" />} onClick={() => setConfirm([...selected])}>
            Excluir
          </Button>
        </div>
      )}

      <Card data-tour="tx-list">
        {transactions.length === 0 ? (
          <EmptyState
            icon={<Plus />}
            title="Você ainda não possui transações."
            description="Registre sua primeira receita ou despesa — leva poucos segundos."
            action={<Button onClick={() => openTx({ type: 'expense' })}>+ Adicionar primeira transação</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search />} title="Nenhum resultado" description="Nenhuma transação corresponde aos filtros. Tente ajustar a busca." action={<Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button>} />
        ) : (
          <div role="table" aria-label="Transações" aria-rowcount={filtered.length}>
            {desktop && (
              <div role="row" className={cn("grid items-center gap-3 rounded-t-xl border-b border-border bg-surface-2/50 px-4 py-2.5 text-xs font-medium text-fg-subtle", gridCols)}>
                <span role="columnheader">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((t) => t.id)))}
                    className="size-4 accent-[var(--primary)]"
                  />
                </span>
                <span role="columnheader"><SortHeader k="date">Data</SortHeader></span>
                <span role="columnheader"><SortHeader k="description">Descrição</SortHeader></span>
                <span role="columnheader"><SortHeader k="category">Categoria</SortHeader></span>
                <span role="columnheader">Conta</span>
                <span role="columnheader">Método</span>
                <span role="columnheader"><SortHeader k="amount" className="ml-auto">Valor</SortHeader></span>
                <span role="columnheader">Status</span>
                <span role="columnheader" className="sr-only">Ações</span>
              </div>
            )}
            <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((v) => {
                const t = filtered[v.index];
                const cat = t.categoryId ? lookups.category.get(t.categoryId) : undefined;
                return (
                  <div
                    key={t.id}
                    role="row"
                    aria-rowindex={v.index + 1}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: v.size, transform: `translateY(${v.start - virtualizer.options.scrollMargin}px)` }}
                    className={cn('border-b border-border/70', selected.has(t.id) && 'bg-primary-soft')}
                  >
                    {desktop ? (
                      <div className={cn('grid h-full items-center gap-3 px-4 text-sm', gridCols)}>
                        <span role="cell">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${t.description}`}
                            checked={selected.has(t.id)}
                            onChange={() =>
                              setSelected((s) => {
                                const n = new Set(s);
                                if (n.has(t.id)) n.delete(t.id);
                                else n.add(t.id);
                                return n;
                              })
                            }
                            className="size-4 accent-[var(--primary)]"
                          />
                        </span>
                        <span role="cell" className="tabular text-fg-muted" title={formatDate(t.date)}>
                          {formatRelativeDay(t.date)}
                        </span>
                        <button role="cell" onClick={() => openTx({ type: t.type, editing: t })} className="min-w-0 truncate text-left font-medium hover:text-primary">
                          {t.description}
                          {t.installment && <span className="ml-1.5 text-xs text-fg-subtle">{t.installment.current}/{t.installment.total}</span>}
                          {t.tags.length > 0 && <span className="ml-2 text-xs font-normal text-fg-subtle">#{t.tags[0]}</span>}
                        </button>
                        <span role="cell" className="flex min-w-0 items-center gap-2">
                          {cat ? (
                            <>
                              <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                              <span className="truncate text-fg-muted">{cat.name}</span>
                            </>
                          ) : (
                            <span className="text-fg-subtle">Transferência</span>
                          )}
                        </span>
                        <span role="cell" className="truncate text-fg-muted">
                          {sourceName(t)}
                          {t.type === 'transfer' && <span className="text-fg-subtle"> → {t.toAccountId ? lookups.account.get(t.toAccountId)?.name : t.toCardId ? 'Fatura' : 'Investimentos'}</span>}
                        </span>
                        <span role="cell" className="truncate text-fg-muted">{METHOD_LABELS[t.method]}</span>
                        <span role="cell" className={cn('tabular text-right font-semibold', t.type === 'income' ? 'text-income' : t.type === 'transfer' ? 'text-fg-muted' : '')}>
                          {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}
                          {money(t.amount)}
                        </span>
                        <span role="cell">
                          <Badge tone={t.status === 'paid' ? 'success' : t.status === 'pending' ? 'warning' : 'info'}>{STATUS_LABELS[t.status]}</Badge>
                        </span>
                        <span role="cell">
                          <Dropdown label="Ações" items={actionsFor(t)} trigger={(p) => <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${t.description}`} {...p}><MoreHorizontal className="size-4" /></Button>} />
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full items-center px-2">
                        <div className="min-w-0 flex-1">
                          <TransactionRow
                            tx={t}
                            category={cat}
                            account={t.accountId ? lookups.account.get(t.accountId) : undefined}
                            toAccount={t.toAccountId ? lookups.account.get(t.toAccountId) : undefined}
                            card={t.cardId ? lookups.card.get(t.cardId) : undefined}
                            onClick={() => openTx({ type: t.type, editing: t })}
                          />
                        </div>
                        <Dropdown label="Ações" items={actionsFor(t)} trigger={(p) => <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${t.description}`} {...p}><MoreHorizontal className="size-4" /></Button>} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
      {filtered.length > 0 && <p className="mt-3 text-center text-xs text-fg-subtle">{filtered.length} transações · lista virtualizada para alta performance</p>}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && remove(confirm)}
        title={confirm && confirm.length > 1 ? `Excluir ${confirm.length} transações?` : 'Excluir transação?'}
        description="Os saldos das contas serão recalculados. Você poderá desfazer logo em seguida."
        confirmLabel="Excluir"
      />
    </div>
  );
}
