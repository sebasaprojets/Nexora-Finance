import { useCallback, useMemo, useState } from 'react';
import { UsageBadge } from '@/components/billing/UsageBadge';
import { usePlan } from '@/hooks/usePlan';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, OctagonAlert, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { Badge, type Tone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFinance } from '@/store/finance';
import { TourButton, usePageTour } from '@/components/tour/Tour';
import { toast } from '@/store/toast';
import { useMoney } from '@/hooks/useMoney';
import { useQueryAction } from '@/hooks/useQueryAction';
import { budgetUsage, totalsByCategory, type BudgetLevel } from '@/lib/finance';
import { addDays, addMonths, formatMonthLong, monthKey, startOfMonth, today } from '@/lib/dates';
import { formatMoney, parseMoneyInput, round2 } from '@/lib/format';
import { uid } from '@/lib/id';
import { cn } from '@/lib/cn';
import type { Budget } from '@/types';
import { t } from '@/i18n';

export const LEVEL: Record<BudgetLevel, { label: string; tone: Tone; color: string; icon: typeof CheckCircle2 }> = {
  ok: { label: 'Dentro do limite', tone: 'success', color: 'var(--success)', icon: CheckCircle2 },
  attention: { label: 'Atenção (70%)', tone: 'warning', color: 'var(--warning)', icon: AlertTriangle },
  alert: { label: 'Alerta (90%)', tone: 'warning', color: 'var(--series-2)', icon: AlertTriangle },
  exceeded: { label: 'Ultrapassado', tone: 'danger', color: 'var(--danger)', icon: OctagonAlert },
};

function BudgetModal({ open, onClose, budget, month, suggestion }: { open: boolean; onClose: () => void; budget?: Budget; month: string; suggestion?: { categoryId: string; amount: number } }) {
  const categories = useFinance((s) => s.categories).filter((c) => c.kind === 'expense');
  const budgets = useFinance((s) => s.budgets);
  const upsert = useFinance((s) => s.upsert);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [error, setError] = useState('');
  const key = `${open}-${budget?.id}-${suggestion?.categoryId}`;
  const [lastKey, setLastKey] = useState('');
  if (open && key !== lastKey) {
    setLastKey(key);
    setCategoryId(budget?.categoryId ?? suggestion?.categoryId ?? categories.find((c) => !budgets.some((b) => b.categoryId === c.id))?.id ?? categories[0]?.id ?? '');
    setAmount(budget ? formatMoney(budget.amount).replace(/[^\d,.]/g, '') : suggestion ? formatMoney(suggestion.amount).replace(/[^\d,.]/g, '') : '');
    setRecurring(budget ? budget.period === 'recurring' : true);
    setError('');
  }
  const save = () => {
    const v = parseMoneyInput(amount);
    if (!(v > 0)) return setError(t('Informe um valor maior que zero'));
    const dup = budgets.find((b) => b.categoryId === categoryId && b.id !== budget?.id && (b.period === 'recurring' || b.period === month));
    if (dup && !budget) return setError(t('Já existe um orçamento para esta categoria'));
    upsert('budgets', { id: budget?.id ?? uid('bud'), categoryId, amount: v, period: recurring ? 'recurring' : month });
    toast.success(budget ? t('Orçamento atualizado') : t('Orçamento criado'));
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={budget ? t('Editar orçamento') : t('Novo orçamento')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('Cancelar')}</Button>
          <Button onClick={save}>{t('Salvar')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('Categoria')}>
          {(p) => (
            <Select {...p} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!!budget}>
              {categories.map((c) => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('Limite mensal')} error={error}>{(p) => <Input {...p} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={formatMoney(0)} data-autofocus />}</Field>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          {t('Repetir todos os meses')}
        </label>
        <p className="text-xs text-fg-subtle">{t('Você será alertado ao atingir 70%, 90% e 100% do limite.')}</p>
      </div>
    </Modal>
  );
}

export default function Budgets() {
  const { budgets, categories, transactions, remove } = useFinance();
  const money = useMoney();
  const [month, setMonth] = useState(monthKey(today()));
  const [modal, setModal] = useState<{ open: boolean; budget?: Budget; suggestion?: { categoryId: string; amount: number } }>({ open: false });

  const tourId = budgets.length > 0 ? 'budgets' : 'budgets-empty';
  usePageTour(tourId);
  const { canCreate } = usePlan();
  const openNew = useCallback(() => canCreate('budgets') && setModal({ open: true }), [canCreate]);
  useQueryAction('novo', openNew);
  const usage = useMemo(() => budgetUsage(budgets, categories, transactions, month), [budgets, categories, transactions, month]);
  const totals = usage.reduce((s, u) => ({ budget: s.budget + u.budget.amount, spent: s.spent + u.spent }), { budget: 0, spent: 0 });
  const isCurrent = month === monthKey(today());

  // Sugestões: categorias sem orçamento, com base na média dos últimos 3 meses.
  const suggestions = useMemo(() => {
    const from = startOfMonth(addMonths(today(), -3));
    const to = addDays(startOfMonth(today()), -1);
    const withBudget = new Set(budgets.map((b) => b.categoryId));
    return totalsByCategory(transactions, categories, { from, to }, 'expense')
      .filter((c) => !withBudget.has(c.category.id) && c.total > 0 && c.category.id !== 'uncategorized')
      .slice(0, 3)
      .map((c) => ({ category: c.category, avg: round2(c.total / 3) }));
  }, [budgets, transactions, categories]);

  return (
    <div>
      <PageHeader
        title={t('Orçamentos')}
        description={t('Defina limites por categoria e acompanhe em tempo real.')}
        actions={<><TourButton id={tourId} /><UsageBadge resource="budgets" /><Button data-tour="budget-new" leftIcon={<Plus className="size-4" />} onClick={openNew}>{t('Novo orçamento')}</Button></>}
      />

      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t('Mês anterior')} onClick={() => setMonth(monthKey(addMonths(`${month}-01`, -1)))}><ChevronLeft className="size-4" /></Button>
          <h2 className="min-w-44 text-center font-display font-semibold">{formatMonthLong(month)}</h2>
          <Button variant="ghost" size="icon-sm" aria-label={t('Próximo mês')} disabled={isCurrent} onClick={() => setMonth(monthKey(addMonths(`${month}-01`, 1)))}><ChevronRight className="size-4" /></Button>
        </div>
        {!isCurrent && <Button variant="ghost" size="sm" onClick={() => setMonth(monthKey(today()))}>{t('Mês atual')}</Button>}
      </div>

      {usage.length === 0 ? (
        <Card>
          <EmptyState icon={<Wallet />} title={t('Nenhum orçamento definido')} description={t('Crie limites para as categorias em que você mais gasta e receba alertas antes de estourar.')} action={<Button onClick={() => setModal({ open: true })}>{t('+ Criar orçamento')}</Button>} />
        </Card>
      ) : (
        <>
          <Card className="mb-6 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-fg-muted">{t('Total utilizado')}</p>
                <p className="tabular font-display text-3xl font-semibold tracking-tight">
                  {money(totals.spent)} <span className="text-base font-normal text-fg-subtle">{t('de {valor}', { valor: money(totals.budget) })}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {(['ok', 'attention', 'alert', 'exceeded'] as BudgetLevel[]).map((l) => {
                  const n = usage.filter((u) => u.level === l).length;
                  return n ? <Badge key={l} tone={LEVEL[l].tone}>{n} {t(LEVEL[l].label).toLowerCase()}</Badge> : null;
                })}
              </div>
            </div>
            <Progress value={totals.budget ? (totals.spent / totals.budget) * 100 : 0} className="mt-4" label={t('Uso total do orçamento')} />
          </Card>

          <div data-tour="budget-list" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {usage.map((u) => {
              const L = LEVEL[u.level];
              return (
                <Card key={u.budget.id} className="p-5">
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={u.category?.icon} color={u.category?.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.category ? t(u.category.name) : t('Categoria removida')}</p>
                      <p className="text-xs text-fg-subtle">{u.budget.period === 'recurring' ? t('Mensal recorrente') : t('Somente este mês')}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label={t('Editar orçamento')} onClick={() => setModal({ open: true, budget: u.budget })}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={t('Excluir orçamento')} onClick={() => { remove('budgets', u.budget.id); toast.success(t('Orçamento removido')); }}><Trash2 className="size-4" /></Button>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="tabular text-xl font-semibold">{money(u.spent)}</span>
                    <span className="tabular text-sm text-fg-subtle">{t('de {valor}', { valor: money(u.budget.amount) })}</span>
                  </div>
                  <Progress value={u.pct} className="mt-2" color={L.color} label={t('Uso do orçamento de {categoria}', { categoria: u.category ? t(u.category.name) : '' })} />
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <Badge tone={L.tone}><L.icon aria-hidden /> {Math.round(u.pct)}% · {t(L.label)}</Badge>
                    <span className={cn('tabular', u.remaining < 0 ? 'text-danger' : 'text-fg-subtle')}>
                      {u.remaining >= 0 ? t('Restam {valor}', { valor: money(u.remaining) }) : t('Excedeu {valor}', { valor: money(-u.remaining) })}
                    </span>
                  </div>
                  {isCurrent && u.projected > u.budget.amount && u.level !== 'exceeded' && (
                    <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{t('No ritmo atual, você deve gastar {valor} até o fim do mês.', { valor: money(u.projected) })}</p>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {suggestions.length > 0 && (
        <Card className="mt-6">
          <CardHeader title={t('Sugestões de orçamento')} description={t('Baseadas na sua média dos últimos 3 meses')} icon={<Lightbulb />} />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            {suggestions.map((s) => (
              <div key={s.category.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <CategoryIcon icon={s.category.icon} color={s.category.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t(s.category.name)}</p>
                  <p className="text-xs text-fg-subtle">{t('Média {valor}/mês', { valor: money(s.avg) })}</p>
                </div>
                <Button size="sm" variant="soft" onClick={() => setModal({ open: true, suggestion: { categoryId: s.category.id, amount: Math.ceil(s.avg / 10) * 10 } })}>{t('Criar')}</Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <BudgetModal open={modal.open} budget={modal.budget} suggestion={modal.suggestion} month={month} onClose={() => setModal({ open: false })} />
    </div>
  );
}
