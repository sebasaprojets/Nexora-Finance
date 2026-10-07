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
import { currentLocale, t } from '@/i18n';

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
  const tourId = transactions.length > 0 ? 'transactions' : 'transactions-empty';
  usePageTour(tourId);

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
    const out = transactions.filter((tx) => {
      if (type !== 'all' && tx.type !== type) return false;
      if (category && tx.categoryId !== category) return false;
      if (source) {
        const [k, id] = source.split(':');
        if (k === 'acc' && tx.accountId !== id && tx.toAccountId !== id) return false;
        if (k === 'card' && tx.cardId !== id && tx.toCardId !== id) return false;
      }
      if (method && tx.method !== method) return false;
      if (status && tx.status !== status) return false;
      if (from && tx.date < from) return false;
      if (q) {
        const cat = tx.categoryId ? lookups.category.get(tx.categoryId)?.name ?? '' : '';
        if (!normalize(`${tx.description} ${cat} ${cat && t(cat)} ${tx.tags.join(' ')} ${tx.notes ?? ''}`).includes(q)) return false;
      }
      return true;
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    const locale = currentLocale();
    const catName = (x: Transaction) => {
      const name = x.categoryId ? lookups.category.get(x.categoryId)?.name : undefined;
      return name ? t(name) : '';
    };
    out.sort((a, b) => {
      switch (sort.key) {
        case 'amount':
          return (a.amount - b.amount) * dir;
        case 'description':
          return a.description.localeCompare(b.description, locale) * dir;
        case 'category':
          return catName(a).localeCompare(catName(b), locale) * dir;
        default:
          return (a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)) * dir;
      }
    });
    return out;
  }, [transactions, debounced, type, category, source, method, status, range, sort, lookups]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
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
    const removed = transactions.filter((tx) => ids.includes(tx.id));
    deleteTransactions(ids);
    setSelected(new Set());
    toast.success(ids.length > 1 ? t('{n} transações excluídas', { n: ids.length }) : t('Transação excluída'), {
      action: {
        label: t('Desfazer'),
        onClick: () => useFinance.setState((s) => ({ transactions: [...removed, ...s.transactions] })),
      },
    });
  };

  const sourceName = (tx: Transaction) =>
    tx.cardId ? lookups.card.get(tx.cardId)?.name ?? '—' : tx.accountId ? lookups.account.get(tx.accountId)?.name ?? '—' : '—';

  const catLabel = (tx: Transaction) => {
    const name = tx.categoryId ? lookups.category.get(tx.categoryId)?.name : undefined;
    return name ? t(name) : '';
  };

  const exportTables = (): ExportTable[] => [
    {
      title: t('Detalhamento de transações'),
      subtitle: filtered.length === 1 ? t('{n} lançamento', { n: filtered.length }) : t('{n} lançamentos', { n: filtered.length }),
      columns: [
        { header: t('Data'), key: 'date', type: 'date', width: 12 },
        { header: t('Descrição'), key: 'description', width: 32 },
        { header: t('Tipo'), key: 'type', width: 14 },
        { header: t('Categoria'), key: 'category', width: 18 },
        { header: t('Conta'), key: 'account', width: 22 },
        { header: t('Método'), key: 'method', width: 14 },
        { header: t('Valor'), key: 'amount', type: 'money' },
        { header: t('Status'), key: 'status', width: 12 },
      ],
      rows: filtered.map((tx) => ({
        date: tx.date,
        description: tx.description,
        type: t(TYPE_LABELS[tx.type]),
        category: catLabel(tx),
        account: sourceName(tx),
        method: t(METHOD_LABELS[tx.method]),
        amount: tx.type === 'expense' ? -tx.amount : tx.amount,
        status: t(STATUS_LABELS[tx.status]),
      })),
      summary: [
        { label: t('Receitas'), value: money(totals.income, { ignoreHidden: true }) },
        { label: t('Despesas'), value: money(totals.expense, { ignoreHidden: true }) },
        { label: t('Resultado'), value: money(totals.net, { ignoreHidden: true }) },
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

  const allSelected = filtered.length > 0 && filtered.every((tx) => selected.has(tx.id));
  const actionsFor = (tx: Transaction) => [
    { label: t('Editar'), icon: <Pencil />, onSelect: () => openTx({ type: tx.type, editing: tx }) },
    {
      label: t('Duplicar'),
      icon: <Copy />,
      onSelect: () => {
        duplicateTransaction(tx.id);
        toast.success(t('Transação duplicada com a data de hoje'));
      },
    },
    { label: t('Excluir'), icon: <Trash2 />, danger: true, onSelect: () => setConfirm([tx.id]) },
  ];

  const SortHeader = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <button onClick={() => toggleSort(k)} className={cn('flex items-center gap-1 hover:text-fg', className)} aria-label={t('Ordenar por {column}', { column: String(children) })}>
      {children}
      {sort.key === k ? sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />}
    </button>
  );

  const gridCols = 'grid-cols-[28px_92px_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_100px_130px_96px_40px]';

  return (
    <div>
      <PageHeader
        title={t('Transações')}
        description={t('Receitas, despesas e transferências em um só lugar.')}
        actions={
          <>
            <TourButton id={tourId} />
            <ExportMenu getTables={exportTables} title={t('Transações')} />
            <Button leftIcon={<Plus className="size-4" />} onClick={() => openTx({ type: 'expense' })}>
              {t('Nova transação')}
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1" data-tour="tx-search">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Buscar por descrição, categoria ou tag…')} leftIcon={<Search />} aria-label={t('Buscar transações')} />
          </div>
          <div data-tour="tx-filters" className="flex items-center gap-2 overflow-x-auto">
            <Segmented
              label={t('Tipo')}
              value={type}
              onChange={setType}
              size="sm"
              options={[
                { value: 'all', label: t('Todas') },
                { value: 'income', label: t('Receitas') },
                { value: 'expense', label: t('Despesas') },
                { value: 'transfer', label: t('Transferências') },
              ]}
            />
            <Button variant={showFilters ? 'soft' : 'secondary'} size="sm" leftIcon={<SlidersHorizontal className="size-3.5" />} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
              {t('Filtros')}{activeFilters ? ` (${activeFilters})` : ''}
            </Button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 md:grid-cols-3 xl:grid-cols-6">
            <Select aria-label={t('Período')} value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="h-9">
              <option value="all">{t('Todo o período')}</option>
              <option value="month">{t('Este mês')}</option>
              <option value="30d">{t('Últimos 30 dias')}</option>
              <option value="3m">{t('Últimos 3 meses')}</option>
              <option value="1y">{t('Últimos 12 meses')}</option>
            </Select>
            <Select aria-label={t('Categoria')} value={category} onChange={(e) => setCategory(e.target.value)} className="h-9">
              <option value="">{t('Todas as categorias')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.name)} ({c.kind === 'income' ? t('receita') : t('despesa')})
                </option>
              ))}
            </Select>
            <Select aria-label={t('Conta ou cartão')} value={source} onChange={(e) => setSource(e.target.value)} className="h-9">
              <option value="">{t('Todas as contas')}</option>
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
            <Select aria-label={t('Método')} value={method} onChange={(e) => setMethod(e.target.value)} className="h-9">
              <option value="">{t('Todos os métodos')}</option>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </Select>
            <Select aria-label={t('Status')} value={status} onChange={(e) => setStatus(e.target.value)} className="h-9">
              <option value="">{t('Todos os status')}</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" className="h-9" leftIcon={<FilterX className="size-3.5" />} onClick={clearFilters} disabled={!activeFilters}>
              {t('Limpar filtros')}
            </Button>
          </div>
        )}
      </Card>

      <div data-tour="tx-summary" className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: t('Receitas'), value: totals.income, cls: 'text-income' },
          { label: t('Despesas'), value: totals.expense, cls: 'text-fg' },
          { label: t('Resultado'), value: totals.net, cls: totals.net >= 0 ? 'text-success' : 'text-danger' },
        ].map((s) => (
          <div key={s.label} className="card px-3 py-2.5 sm:px-4">
            <p className="text-xs text-fg-subtle">{s.label}</p>
            <p className={cn('tabular mt-0.5 truncate text-sm font-semibold sm:text-base', s.cls)}>{money(s.value)}</p>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="glass sticky top-[calc(72px+env(safe-area-inset-top))] z-20 mb-3 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm shadow-md">
          <span className="font-medium">{selected.size === 1 ? t('{n} selecionada', { n: selected.size }) : t('{n} selecionadas', { n: selected.size })}</span>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            {t('Limpar')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Copy className="size-3.5" />}
            onClick={() => {
              for (const id of selected) {
                const tx = transactions.find((x) => x.id === id);
                if (tx) addTransaction({ ...tx, date: today(), tags: tx.tags });
              }
              toast.success(selected.size === 1 ? t('{n} transação duplicada', { n: selected.size }) : t('{n} transações duplicadas', { n: selected.size }));
              setSelected(new Set());
            }}
          >
            {t('Duplicar')}
          </Button>
          <Button size="sm" variant="danger" className="ml-auto" leftIcon={<Trash2 className="size-3.5" />} onClick={() => setConfirm([...selected])}>
            {t('Excluir')}
          </Button>
        </div>
      )}

      <Card data-tour="tx-list">
        {transactions.length === 0 ? (
          <div data-tour="tx-empty">
          <EmptyState
            icon={<Plus />}
            title={t('Você ainda não possui transações.')}
            description={t('Comece pela sua renda (salário) e depois registre as despesas do mês. Leva poucos segundos.')}
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => openTx({ type: 'income' })}>{t('+ Adicionar receita')}</Button>
                <Button variant="secondary" onClick={() => openTx({ type: 'expense' })}>{t('+ Adicionar despesa')}</Button>
              </div>
            }
          />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search />} title={t('Nenhum resultado')} description={t('Nenhuma transação corresponde aos filtros. Tente ajustar a busca.')} action={<Button variant="secondary" onClick={clearFilters}>{t('Limpar filtros')}</Button>} />
        ) : (
          <div role="table" aria-label={t('Transações')} aria-rowcount={filtered.length}>
            {desktop && (
              <div role="row" className={cn("grid items-center gap-3 rounded-t-xl border-b border-border bg-surface-2/50 px-4 py-2.5 text-xs font-medium text-fg-subtle", gridCols)}>
                <span role="columnheader">
                  <input
                    type="checkbox"
                    aria-label={t('Selecionar todas')}
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((tx) => tx.id)))}
                    className="size-4 accent-[var(--primary)]"
                  />
                </span>
                <span role="columnheader"><SortHeader k="date">{t('Data')}</SortHeader></span>
                <span role="columnheader"><SortHeader k="description">{t('Descrição')}</SortHeader></span>
                <span role="columnheader"><SortHeader k="category">{t('Categoria')}</SortHeader></span>
                <span role="columnheader">{t('Conta')}</span>
                <span role="columnheader">{t('Método')}</span>
                <span role="columnheader"><SortHeader k="amount" className="ml-auto">{t('Valor')}</SortHeader></span>
                <span role="columnheader">{t('Status')}</span>
                <span role="columnheader" className="sr-only">{t('Ações')}</span>
              </div>
            )}
            <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((v) => {
                const tx = filtered[v.index];
                const cat = tx.categoryId ? lookups.category.get(tx.categoryId) : undefined;
                return (
                  <div
                    key={tx.id}
                    role="row"
                    aria-rowindex={v.index + 1}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: v.size, transform: `translateY(${v.start - virtualizer.options.scrollMargin}px)` }}
                    className={cn('border-b border-border/70', selected.has(tx.id) && 'bg-primary-soft')}
                  >
                    {desktop ? (
                      <div className={cn('grid h-full items-center gap-3 px-4 text-sm', gridCols)}>
                        <span role="cell">
                          <input
                            type="checkbox"
                            aria-label={t('Selecionar {name}', { name: tx.description })}
                            checked={selected.has(tx.id)}
                            onChange={() =>
                              setSelected((s) => {
                                const n = new Set(s);
                                if (n.has(tx.id)) n.delete(tx.id);
                                else n.add(tx.id);
                                return n;
                              })
                            }
                            className="size-4 accent-[var(--primary)]"
                          />
                        </span>
                        <span role="cell" className="tabular text-fg-muted" title={formatDate(tx.date)}>
                          {formatRelativeDay(tx.date)}
                        </span>
                        <button role="cell" onClick={() => openTx({ type: tx.type, editing: tx })} className="min-w-0 truncate text-left font-medium hover:text-primary">
                          {tx.description}
                          {tx.installment && <span className="ml-1.5 text-xs text-fg-subtle">{tx.installment.current}/{tx.installment.total}</span>}
                          {tx.tags.length > 0 && <span className="ml-2 text-xs font-normal text-fg-subtle">#{tx.tags[0]}</span>}
                        </button>
                        <span role="cell" className="flex min-w-0 items-center gap-2">
                          {cat ? (
                            <>
                              <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                              <span className="truncate text-fg-muted">{t(cat.name)}</span>
                            </>
                          ) : (
                            <span className="text-fg-subtle">{t('Transferência')}</span>
                          )}
                        </span>
                        <span role="cell" className="truncate text-fg-muted">
                          {sourceName(tx)}
                          {tx.type === 'transfer' && <span className="text-fg-subtle"> → {tx.toAccountId ? lookups.account.get(tx.toAccountId)?.name : tx.toCardId ? t('Fatura') : t('Investimentos')}</span>}
                        </span>
                        <span role="cell" className="truncate text-fg-muted">{t(METHOD_LABELS[tx.method])}</span>
                        <span role="cell" className={cn('tabular text-right font-semibold', tx.type === 'income' ? 'text-income' : tx.type === 'transfer' ? 'text-fg-muted' : '')}>
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                          {money(tx.amount)}
                        </span>
                        <span role="cell">
                          <Badge tone={tx.status === 'paid' ? 'success' : tx.status === 'pending' ? 'warning' : 'info'}>{t(STATUS_LABELS[tx.status])}</Badge>
                        </span>
                        <span role="cell">
                          <Dropdown label={t('Ações')} items={actionsFor(tx)} trigger={(p) => <Button variant="ghost" size="icon-sm" aria-label={t('Ações para {name}', { name: tx.description })} {...p}><MoreHorizontal className="size-4" /></Button>} />
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full items-center px-2">
                        <div className="min-w-0 flex-1">
                          <TransactionRow
                            tx={tx}
                            category={cat}
                            account={tx.accountId ? lookups.account.get(tx.accountId) : undefined}
                            toAccount={tx.toAccountId ? lookups.account.get(tx.toAccountId) : undefined}
                            card={tx.cardId ? lookups.card.get(tx.cardId) : undefined}
                            onClick={() => openTx({ type: tx.type, editing: tx })}
                          />
                        </div>
                        <Dropdown label={t('Ações')} items={actionsFor(tx)} trigger={(p) => <Button variant="ghost" size="icon-sm" aria-label={t('Ações para {name}', { name: tx.description })} {...p}><MoreHorizontal className="size-4" /></Button>} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
      {filtered.length > 0 && <p className="mt-3 text-center text-xs text-fg-subtle">{filtered.length === 1 ? t('{n} transação · lista virtualizada para alta performance', { n: filtered.length }) : t('{n} transações · lista virtualizada para alta performance', { n: filtered.length })}</p>}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && remove(confirm)}
        title={confirm && confirm.length > 1 ? t('Excluir {n} transações?', { n: confirm.length }) : t('Excluir transação?')}
        description={t('Os saldos das contas serão recalculados. Você poderá desfazer logo em seguida.')}
        confirmLabel={t('Excluir')}
      />
    </div>
  );
}
