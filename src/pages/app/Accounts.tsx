import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Archive, Banknote, Landmark, MoreHorizontal, Pencil, PiggyBank, Plus, Repeat2, Smartphone, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { Sparkline } from '@/components/ui/Sparkline';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { useFinance } from '@/store/finance';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';
import { useMoney } from '@/hooks/useMoney';
import { useLookups } from '@/hooks/useLookups';
import { accountBalances, accountEffect, accountFlows, periodFromPreset } from '@/lib/finance';
import { addDays, eachDay, today } from '@/lib/dates';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import { cn } from '@/lib/cn';
import type { Account, AccountType } from '@/types';

export const ACCOUNT_TYPES: Record<AccountType, { label: string; icon: typeof Landmark }> = {
  checking: { label: 'Conta corrente', icon: Landmark },
  savings: { label: 'Poupança', icon: PiggyBank },
  wallet: { label: 'Carteira', icon: Wallet },
  digital: { label: 'Conta digital', icon: Smartphone },
  investment: { label: 'Investimentos', icon: TrendingUp },
  cash: { label: 'Dinheiro físico', icon: Banknote },
};

const COLORS = ['#7b6dff', '#2a78d6', '#1baf7a', '#eda100', '#eb6834', '#e87ba4', '#e34948', '#0891b2'];

const schema = z.object({
  name: z.string().trim().min(1, 'Informe um nome').max(40),
  institution: z.string().trim().max(40),
  type: z.enum(['checking', 'savings', 'wallet', 'digital', 'investment', 'cash']),
  initialBalance: z.string().refine((v) => v.trim() === '' || !Number.isNaN(parseMoneyInput(v)), 'Valor inválido'),
  color: z.string(),
});
type Values = z.infer<typeof schema>;

function AccountModal({ open, onClose, account }: { open: boolean; onClose: () => void; account?: Account }) {
  const upsert = useFinance((s) => s.upsert);
  const { register, handleSubmit, formState, watch, setValue, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: account?.name ?? '',
      institution: account?.institution ?? '',
      type: account?.type ?? 'checking',
      initialBalance: account ? formatMoney(account.initialBalance).replace(/[^\d,.-]/g, '') : '',
      color: account?.color ?? COLORS[0],
    },
  });
  const color = watch('color');
  const submit = (v: Values) => {
    upsert('accounts', {
      id: account?.id ?? uid('acc'),
      name: sanitizeText(v.name, 40),
      institution: sanitizeText(v.institution, 40) || ACCOUNT_TYPES[v.type].label,
      type: v.type,
      initialBalance: parseMoneyInput(v.initialBalance) || 0,
      color: v.color,
      archived: account?.archived,
      createdAt: account?.createdAt ?? new Date().toISOString(),
    });
    toast.success(account ? 'Conta atualizada' : 'Conta criada');
    reset();
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? 'Editar conta' : 'Nova conta'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="account-form">Salvar</Button>
        </>
      }
    >
      <form id="account-form" onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Field label="Nome" error={formState.errors.name?.message}>{(p) => <Input {...p} {...register('name')} placeholder="Ex.: Nubank" data-autofocus />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            {(p) => (
              <Select {...p} {...register('type')}>
                {Object.entries(ACCOUNT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Instituição">{(p) => <Input {...p} {...register('institution')} placeholder="Banco ou corretora" />}</Field>
        </div>
        <Field label="Saldo inicial" hint="Saldo antes do primeiro lançamento registrado." error={formState.errors.initialBalance?.message}>
          {(p) => <Input {...p} {...register('initialBalance')} inputMode="decimal" placeholder="0,00" />}
        </Field>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg-muted">Cor</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={color === c} onClick={() => setValue('color', c)} className={cn('size-8 rounded-full transition-transform', color === c && 'scale-110 ring-2 ring-fg ring-offset-2 ring-offset-bg-elevated')} style={{ background: c }} />
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Accounts() {
  const accounts = useFinance((s) => s.accounts);
  const transactions = useFinance((s) => s.transactions);
  const upsert = useFinance((s) => s.upsert);
  const remove = useFinance((s) => s.remove);
  const openTx = useUI((s) => s.openTransaction);
  const money = useMoney();
  const lookups = useLookups();
  const [modal, setModal] = useState<{ open: boolean; account?: Account }>({ open: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Account | null>(null);

  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const month = periodFromPreset('month');
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const total = active.filter((a) => a.type !== 'investment').reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

  // Histórico de 90 dias por conta (saldo ao fim de cada dia).
  const histories = useMemo(() => {
    const from = addDays(today(), -89);
    const days = eachDay(from, today());
    const out = new Map<string, number[]>();
    for (const a of accounts) {
      let running = balances.get(a.id) ?? 0;
      const deltas = new Map<string, number>();
      for (const t of transactions) {
        if (t.date < from || t.date > today() || t.status === 'scheduled') continue;
        const e = accountEffect(t, a.id);
        if (e) deltas.set(t.date, (deltas.get(t.date) ?? 0) + e);
      }
      const series: number[] = [];
      for (let i = days.length - 1; i >= 0; i--) {
        series.unshift(running);
        running -= deltas.get(days[i]) ?? 0;
      }
      out.set(a.id, series);
    }
    return out;
  }, [accounts, transactions, balances]);

  const selectedAccount = accounts.find((a) => a.id === selected);
  const accountTxs = useMemo(
    () => (selected ? transactions.filter((t) => t.accountId === selected || t.toAccountId === selected).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30) : []),
    [selected, transactions],
  );

  const hasTxs = (id: string) => transactions.some((t) => t.accountId === id || t.toAccountId === id);

  return (
    <div>
      <PageHeader
        title="Contas"
        description="Saldos, entradas, saídas e histórico de cada conta."
        actions={
          <>
            <Button variant="secondary" leftIcon={<Repeat2 className="size-4" />} onClick={() => openTx({ type: 'transfer' })} disabled={active.length < 2}>
              Transferir
            </Button>
            <Button leftIcon={<Plus className="size-4" />} onClick={() => setModal({ open: true })}>
              Nova conta
            </Button>
          </>
        }
      />

      <Card className="holo mb-6 p-5 sm:p-6">
        <p className="text-sm text-fg-muted">Saldo consolidado</p>
        <AnimatedNumber value={total} format={(v) => money(v)} className="tabular mt-1 block font-display text-3xl font-semibold tracking-tight sm:text-4xl" />
        <p className="mt-1 text-xs text-fg-subtle">{active.length} contas ativas · contas de investimento não entram no saldo</p>
      </Card>

      {active.length === 0 ? (
        <Card>
          <EmptyState icon={<Landmark />} title="Nenhuma conta cadastrada" description="Adicione suas contas bancárias, carteira e poupança para acompanhar saldos." action={<Button onClick={() => setModal({ open: true })}>+ Adicionar conta</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((a) => {
            const Icon = ACCOUNT_TYPES[a.type].icon;
            const flows = accountFlows(a.id, transactions, month);
            const bal = balances.get(a.id) ?? 0;
            return (
              <Card key={a.id} className={cn('group cursor-pointer p-5 transition-colors hover:border-border-strong', selected === a.id && 'border-primary')} onClick={() => setSelected(selected === a.id ? null : a.id)}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${a.color}, color-mix(in oklab, ${a.color} 45%, black))` }}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="truncate text-xs text-fg-subtle">{a.institution} · {ACCOUNT_TYPES[a.type].label}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      label={`Ações para ${a.name}`}
                      trigger={(p) => <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${a.name}`} {...p}><MoreHorizontal className="size-4" /></Button>}
                      items={[
                        { label: 'Editar', icon: <Pencil />, onSelect: () => setModal({ open: true, account: a }) },
                        { label: 'Arquivar', icon: <Archive />, onSelect: () => { upsert('accounts', { ...a, archived: true }); toast.success('Conta arquivada'); } },
                        { label: 'Excluir', icon: <Trash2 />, danger: true, onSelect: () => setConfirm(a) },
                      ]}
                    />
                  </div>
                </div>
                <p className={cn('tabular mt-4 font-display text-2xl font-semibold tracking-tight', bal < 0 && 'text-danger')}>{money(bal)}</p>
                <Sparkline data={histories.get(a.id) ?? []} color={a.color} height={40} className="mt-2" label={`Evolução do saldo de ${a.name} em 90 dias`} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-surface-2/70 px-2.5 py-2">
                    <p className="text-fg-subtle">Entradas no mês</p>
                    <p className="tabular mt-0.5 font-semibold text-income">+{money(flows.inflow)}</p>
                  </div>
                  <div className="rounded-lg bg-surface-2/70 px-2.5 py-2">
                    <p className="text-fg-subtle">Saídas no mês</p>
                    <p className="tabular mt-0.5 font-semibold">−{money(flows.outflow)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedAccount && (
        <Card className="mt-6">
          <CardHeader title={`Histórico — ${selectedAccount.name}`} description="Últimas 30 movimentações" action={<Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Fechar</Button>} />
          <CardBody className="px-3">
            {accountTxs.length ? (
              accountTxs.map((t) => (
                <TransactionRow key={t.id} tx={t} category={t.categoryId ? lookups.category.get(t.categoryId) : undefined} account={t.accountId ? lookups.account.get(t.accountId) : undefined} toAccount={t.toAccountId ? lookups.account.get(t.toAccountId) : undefined} onClick={() => openTx({ type: t.type, editing: t })} />
              ))
            ) : (
              <p className="py-6 text-center text-sm text-fg-subtle">Sem movimentações nesta conta.</p>
            )}
          </CardBody>
        </Card>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-fg-muted">Arquivadas</h2>
          <div className="flex flex-wrap gap-2">
            {archived.map((a) => (
              <Badge key={a.id} className="gap-2 py-1 pr-1">
                {a.name}
                <button className="rounded-full px-2 py-0.5 text-primary hover:bg-primary-soft" onClick={() => upsert('accounts', { ...a, archived: false })}>
                  Restaurar
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <AccountModal open={modal.open} account={modal.account} onClose={() => setModal({ open: false })} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Excluir conta?"
        description={confirm && hasTxs(confirm.id) ? 'Esta conta possui transações. Recomendamos arquivar para preservar o histórico. Se excluir, as transações continuarão existindo, mas sem conta vinculada.' : 'Esta ação não pode ser desfeita.'}
        confirmLabel="Excluir conta"
        onConfirm={() => {
          if (confirm) remove('accounts', confirm.id);
          toast.success('Conta excluída');
        }}
      />
    </div>
  );
}
