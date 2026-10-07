import { useMemo, useState } from 'react';
import { UsageBadge } from '@/components/billing/UsageBadge';
import { usePlan } from '@/hooks/usePlan';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { useMoney } from '@/hooks/useMoney';
import { ICONS } from '@/lib/icons';
import { periodFromPreset, totalsByCategory } from '@/lib/finance';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import { cn } from '@/lib/cn';
import type { Category, CategoryKind } from '@/types';
import { t } from '@/i18n';

const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948', '#0891b2', '#898781'];

const schema = z.object({
  name: z.string().trim().min(1, 'Informe um nome').max(30),
  kind: z.enum(['income', 'expense']),
  icon: z.string(),
  color: z.string(),
  nature: z.enum(['fixed', 'variable']),
  monthlyLimit: z.string().refine((v) => !v.trim() || parseMoneyInput(v) >= 0, 'Valor inválido'),
});
type Values = z.infer<typeof schema>;

function CategoryModal({ open, onClose, category, kind }: { open: boolean; onClose: () => void; category?: Category; kind: CategoryKind }) {
  const upsert = useFinance((s) => s.upsert);
  const { register, handleSubmit, formState, watch, setValue } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: category?.name ?? '',
      kind: category?.kind ?? kind,
      icon: category?.icon ?? 'shopping-bag',
      color: category?.color ?? COLORS[0],
      nature: category?.nature ?? 'variable',
      monthlyLimit: category?.monthlyLimit ? formatMoney(category.monthlyLimit).replace(/[^\d,.]/g, '') : '',
    },
  });
  const icon = watch('icon');
  const color = watch('color');
  const k = watch('kind');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? t('Editar categoria') : t('Nova categoria')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('Cancelar')}</Button>
          <Button type="submit" form="cat-form">{t('Salvar')}</Button>
        </>
      }
    >
      <form
        id="cat-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) => {
          upsert('categories', {
            id: category?.id ?? uid('cat'),
            name: sanitizeText(v.name, 30),
            kind: v.kind,
            icon: v.icon,
            color: v.color,
            nature: v.kind === 'expense' ? v.nature : undefined,
            monthlyLimit: v.kind === 'expense' && v.monthlyLimit.trim() ? parseMoneyInput(v.monthlyLimit) : undefined,
            system: category?.system,
          });
          toast.success(category ? t('Categoria atualizada') : t('Categoria criada'));
          onClose();
        })}
      >
        <div className="flex items-center gap-3">
          <CategoryIcon icon={icon} color={color} size="lg" />
          <Field label={t('Nome')} error={formState.errors.name?.message} className="flex-1">{(p) => <Input {...p} {...register('name')} data-autofocus placeholder={t('Ex.: Pets')} />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Tipo')}>
            {(p) => (
              <Select {...p} {...register('kind')} disabled={!!category}>
                <option value="expense">{t('Despesa')}</option>
                <option value="income">{t('Receita')}</option>
              </Select>
            )}
          </Field>
          {k === 'expense' && (
            <Field label={t('Natureza')} hint={t('Usada na DRE (custos fixos × despesas variáveis)')}>
              {(p) => (
                <Select {...p} {...register('nature')}>
                  <option value="variable">{t('Variável')}</option>
                  <option value="fixed">{t('Fixa')}</option>
                </Select>
              )}
            </Field>
          )}
        </div>
        {k === 'expense' && (
          <Field label={t('Limite mensal (opcional)')} error={formState.errors.monthlyLimit?.message}>
            {(p) => <Input {...p} {...register('monthlyLimit')} inputMode="decimal" placeholder={formatMoney(0)} />}
          </Field>
        )}
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg-muted">{t('Ícone')}</legend>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
            {Object.entries(ICONS)
              .filter(([n]) => n !== 'circle-help')
              .map(([name, I]) => (
                <button key={name} type="button" aria-label={name} aria-pressed={icon === name} onClick={() => setValue('icon', name)} className={cn('grid aspect-square place-items-center rounded-lg border transition-colors', icon === name ? 'border-primary bg-primary-soft text-primary' : 'border-transparent text-fg-muted hover:bg-surface-2')}>
                  <I className="size-4" aria-hidden />
                </button>
              ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg-muted">{t('Cor')}</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={t('Cor {cor}', { cor: c })} aria-pressed={color === c} onClick={() => setValue('color', c)} className={cn('size-7 rounded-full', color === c && 'ring-2 ring-fg ring-offset-2 ring-offset-bg-elevated')} style={{ background: c }} />
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Categories() {
  const categories = useFinance((s) => s.categories);
  const transactions = useFinance((s) => s.transactions);
  const remove = useFinance((s) => s.remove);
  const money = useMoney();
  const [tab, setTab] = useState<CategoryKind>('expense');
  const [modal, setModal] = useState<{ open: boolean; category?: Category }>({ open: false });
  const { canCreate } = usePlan();
  const openNew = () => canCreate('categories') && setModal({ open: true });
  const [confirm, setConfirm] = useState<Category | null>(null);

  const usage = useMemo(() => {
    const month = periodFromPreset('month');
    const map = new Map<string, number>();
    for (const c of [...totalsByCategory(transactions, categories, month, 'expense'), ...totalsByCategory(transactions, categories, month, 'income')]) map.set(c.category.id, c.total);
    return map;
  }, [transactions, categories]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const tx of transactions) if (tx.categoryId) m.set(tx.categoryId, (m.get(tx.categoryId) ?? 0) + 1);
    return m;
  }, [transactions]);

  const list = categories.filter((c) => c.kind === tab);

  return (
    <div>
      <PageHeader title={t('Categorias')} description={t('Personalize nome, ícone, cor, tipo e limite mensal.')} actions={<><UsageBadge resource="categories" /><Button leftIcon={<Plus className="size-4" />} onClick={openNew}>{t('Nova categoria')}</Button></>} />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-4"
        tabs={[
          { value: 'expense', label: t('Despesas'), count: categories.filter((c) => c.kind === 'expense').length },
          { value: 'income', label: t('Receitas'), count: categories.filter((c) => c.kind === 'income').length },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const spent = usage.get(c.id) ?? 0;
          const pct = c.monthlyLimit ? (spent / c.monthlyLimit) * 100 : 0;
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={c.icon} color={c.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t(c.name)}</p>
                  <p className="text-xs text-fg-subtle">
                    <Link to={`/app/transacoes?categoria=${c.id}`} className="hover:text-primary">{t((counts.get(c.id) ?? 0) === 1 ? '{n} transação' : '{n} transações', { n: counts.get(c.id) ?? 0 })}</Link>
                    {c.kind === 'expense' && ` · ${c.nature === 'fixed' ? t('Fixa') : t('Variável')}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={t('Editar {nome}', { nome: t(c.name) })} onClick={() => setModal({ open: true, category: c })}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={t('Excluir {nome}', { nome: t(c.name) })} onClick={() => setConfirm(c)}><Trash2 className="size-4" /></Button>
              </div>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="text-fg-subtle">{t('Este mês')}</span>
                <span className="tabular font-semibold">{money(spent)}{c.monthlyLimit ? <span className="font-normal text-fg-subtle"> / {money(c.monthlyLimit, { compact: true })}</span> : null}</span>
              </div>
              {c.monthlyLimit ? (
                <Progress value={pct} className="mt-2" size="sm" color={pct >= 100 ? 'var(--danger)' : pct >= 90 ? 'var(--series-2)' : pct >= 70 ? 'var(--warning)' : c.color} label={t('Uso do limite de {nome}', { nome: t(c.name) })} />
              ) : (
                c.kind === 'expense' && <Badge className="mt-2">{t('Sem limite definido')}</Badge>
              )}
            </Card>
          );
        })}
      </div>
      <CategoryModal open={modal.open} category={modal.category} kind={tab} onClose={() => setModal({ open: false })} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={t('Excluir “{nome}”?', { nome: confirm ? t(confirm.name) : '' })}
        description={confirm && counts.get(confirm.id) ? t(counts.get(confirm.id) === 1 ? '{n} transação usa esta categoria e ficará “Sem categoria”.' : '{n} transações usam esta categoria e ficarão “Sem categoria”.', { n: counts.get(confirm.id) }) : t('Esta ação não pode ser desfeita.')}
        confirmLabel={t('Excluir')}
        onConfirm={() => {
          if (!confirm) return;
          remove('categories', confirm.id);
          remove('budgets', useFinance.getState().budgets.find((b) => b.categoryId === confirm.id)?.id ?? '');
          toast.success(t('Categoria excluída'));
        }}
      />
    </div>
  );
}
