import { useMemo, useState } from 'react';
import { UsageBadge } from '@/components/billing/UsageBadge';
import { usePlan } from '@/hooks/usePlan';
import { CalendarClock, MoreHorizontal, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarList } from '@/components/charts/BarList';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { useMoney } from '@/hooks/useMoney';
import { nextCharge, subscriptionMonthly, subscriptionsSummary } from '@/lib/finance';
import { diffDays, formatDate, formatDayMonth, monthName, today } from '@/lib/dates';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import { cn } from '@/lib/cn';
import type { BillingCycle, Subscription } from '@/types';
import { t } from '@/i18n';

const PRESETS = [
  { name: 'Netflix', color: '#e34948' },
  { name: 'Spotify', color: '#1baf7a' },
  { name: 'Amazon Prime', color: '#2a78d6' },
  { name: 'Adobe', color: '#eb6834' },
  { name: 'Academia', color: '#eda100' },
  { name: 'YouTube Premium', color: '#e34948' },
  { name: 'Disney+', color: '#4a3aa7' },
  { name: 'iCloud', color: '#0891b2' },
];

function SubModal({ open, onClose, sub }: { open: boolean; onClose: () => void; sub?: Subscription }) {
  const { upsert, cards, accounts } = useFinance();
  const blank = { name: '', amount: '', cycle: 'monthly' as BillingCycle, day: '10', month: '1', pay: '', color: '#7b6dff' };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<Record<string, string>>({});
  const [key, setKey] = useState('');
  const k = `${open}-${sub?.id}`;
  if (open && key !== k) {
    setKey(k);
    setErr({});
    setF(sub ? { name: sub.name, amount: formatMoney(sub.amount).replace(/[^\d,.]/g, ''), cycle: sub.cycle, day: String(sub.billingDay), month: String(sub.billingMonth ?? 1), pay: sub.cardId ? `card:${sub.cardId}` : sub.accountId ? `acc:${sub.accountId}` : '', color: sub.color } : blank);
  }
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Informe o serviço';
    if (!(parseMoneyInput(f.amount) > 0)) e.amount = 'Informe o valor';
    setErr(e);
    if (Object.keys(e).length) return;
    const [kind, id] = f.pay.split(':');
    upsert('subscriptions', {
      id: sub?.id ?? uid('sub'),
      name: sanitizeText(f.name, 40),
      amount: parseMoneyInput(f.amount),
      cycle: f.cycle,
      billingDay: Math.min(31, Math.max(1, parseInt(f.day, 10) || 1)),
      billingMonth: f.cycle === 'yearly' ? parseInt(f.month, 10) : undefined,
      categoryId: 'cat_subs',
      cardId: kind === 'card' ? id : undefined,
      accountId: kind === 'acc' ? id : undefined,
      color: f.color,
      active: sub?.active ?? true,
      createdAt: sub?.createdAt ?? new Date().toISOString(),
    });
    toast.success(sub ? t('Assinatura atualizada') : t('Assinatura adicionada'));
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={sub ? t('Editar assinatura') : t('Nova assinatura')} footer={<><Button variant="ghost" onClick={onClose}>{t('Cancelar')}</Button><Button onClick={save}>{t('Salvar')}</Button></>}>
      <div className="space-y-4">
        {!sub && (
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.name} type="button" onClick={() => set({ name: t(p.name), color: p.color })} className={cn('rounded-full border px-3 py-1 text-xs', f.name === t(p.name) ? 'border-primary bg-primary-soft' : 'border-border text-fg-muted hover:bg-surface-2')}>
                {t(p.name)}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Serviço')} error={err.name}>{(p) => <Input {...p} value={f.name} onChange={(e) => set({ name: e.target.value })} data-autofocus />}</Field>
          <Field label={t('Valor')} error={err.amount}>{(p) => <Input {...p} value={f.amount} onChange={(e) => set({ amount: e.target.value })} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
          <Field label={t('Ciclo')}>
            {(p) => (
              <Select {...p} value={f.cycle} onChange={(e) => set({ cycle: e.target.value as BillingCycle })}>
                <option value="monthly">{t('Mensal')}</option>
                <option value="yearly">{t('Anual')}</option>
              </Select>
            )}
          </Field>
          <Field label={t('Dia da cobrança')}>{(p) => <Input {...p} type="number" min={1} max={31} value={f.day} onChange={(e) => set({ day: e.target.value })} />}</Field>
          {f.cycle === 'yearly' && (
            <Field label={t('Mês da cobrança')}>
              {(p) => (
                <Select {...p} value={f.month} onChange={(e) => set({ month: e.target.value })}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthName(`2000-${String(i + 1).padStart(2, '0')}`)}</option>)}
                </Select>
              )}
            </Field>
          )}
          <Field label={t('Pago com')}>
            {(p) => (
              <Select {...p} value={f.pay} onChange={(e) => set({ pay: e.target.value })}>
                <option value="">{t('Não informado')}</option>
                {cards.map((c) => <option key={c.id} value={`card:${c.id}`}>{c.name}</option>)}
                {accounts.map((a) => <option key={a.id} value={`acc:${a.id}`}>{a.name}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default function Subscriptions() {
  const { subscriptions, cards, accounts, upsert, remove } = useFinance();
  const money = useMoney();
  const [modal, setModal] = useState<{ open: boolean; sub?: Subscription }>({ open: false });
  const { canCreate } = usePlan();
  const openNew = () => canCreate('subscriptions') && setModal({ open: true });
  const [confirm, setConfirm] = useState<Subscription | null>(null);
  const summary = useMemo(() => subscriptionsSummary(subscriptions), [subscriptions]);
  const payName = (s: Subscription) => (s.cardId ? cards.find((c) => c.id === s.cardId)?.name : accounts.find((a) => a.id === s.accountId)?.name) ?? '—';
  const sorted = [...subscriptions].sort((a, b) => Number(b.active) - Number(a.active) || subscriptionMonthly(b) - subscriptionMonthly(a));

  return (
    <div>
      <PageHeader title={t('Assinaturas')} description={t('Serviços recorrentes, próximas cobranças e custo anual.')} actions={<><UsageBadge resource="subscriptions" /><Button leftIcon={<Plus className="size-4" />} onClick={openNew}>{t('Nova assinatura')}</Button></>} />

      {subscriptions.length === 0 ? (
        <Card><EmptyState icon={<Repeat />} title={t('Nenhuma assinatura')} description={t('Registre Netflix, Spotify, academia e outros para saber quanto custam por mês e por ano.')} action={<Button onClick={() => setModal({ open: true })}>{t('+ Adicionar assinatura')}</Button>} /></Card>
      ) : (
        <>
          <Card className="holo mb-6 p-5 sm:p-6">
            <p className="text-sm text-fg-muted">{t('Custo mensal com assinaturas')}</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {t('Você gasta')} <span className="tabular text-primary">{t('{valor}/mês', { valor: money(summary.monthly) })}</span> {t('com assinaturas.')}
            </p>
            <p className="mt-1 text-sm text-fg-subtle">{t(summary.count === 1 ? '{n} ativa' : '{n} ativas', { n: summary.count })} · {t('{valor} por ano', { valor: money(summary.yearly) })}</p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title={t('Suas assinaturas')} />
              <CardBody className="divide-y divide-border pt-2">
                {sorted.map((s) => {
                  const next = nextCharge(s);
                  const days = diffDays(today(), next);
                  return (
                    <div key={s.id} className={cn('flex items-center gap-3 py-3', !s.active && 'opacity-50')}>
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl font-display text-sm font-bold text-white" style={{ background: s.color }} aria-hidden>
                        {s.name[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-fg-subtle">
                          {s.cycle === 'monthly' ? t('Mensal') : t('Anual')} · {payName(s)} · {s.active ? t('próxima {quando}', { quando: days === 0 ? t('hoje') : days === 1 ? t('amanhã') : formatDate(next) }) : t('pausada')}
                        </p>
                      </div>
                      <span className="tabular text-right text-sm font-semibold">
                        {money(s.amount)}
                        {s.cycle === 'yearly' && <span className="block text-xs font-normal text-fg-subtle">{t('{valor}/mês', { valor: money(subscriptionMonthly(s)) })}</span>}
                      </span>
                      <Switch checked={s.active} onChange={(v) => { upsert('subscriptions', { ...s, active: v }); toast.success(v ? t('Assinatura reativada') : t('Assinatura pausada')); }} label={s.active ? t('Pausar {name}', { name: s.name }) : t('Ativar {name}', { name: s.name })} />
                      <Dropdown
                        label={t('Ações')}
                        trigger={(p) => <Button variant="ghost" size="icon-sm" aria-label={t('Ações para {name}', { name: s.name })} {...p}><MoreHorizontal className="size-4" /></Button>}
                        items={[
                          { label: t('Editar'), icon: <Pencil />, onSelect: () => setModal({ open: true, sub: s }) },
                          { label: t('Excluir'), icon: <Trash2 />, danger: true, onSelect: () => setConfirm(s) },
                        ]}
                      />
                    </div>
                  );
                })}
              </CardBody>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader title={t('Próximas cobranças')} icon={<CalendarClock />} />
                <CardBody className="space-y-2 pt-3">
                  {summary.upcoming.slice(0, 5).map((u) => (
                    <div key={u.sub.id} className="flex items-center justify-between rounded-lg bg-surface-2/70 px-3 py-2 text-sm">
                      <span><span className="tabular mr-2 text-xs text-fg-subtle">{formatDayMonth(u.date)}</span>{u.sub.name}</span>
                      <span className="tabular font-medium">{money(u.sub.amount)}</span>
                    </div>
                  ))}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={t('Peso no orçamento')} description={t('Custo mensal por serviço')} />
                <CardBody>
                  <BarList items={subscriptions.filter((s) => s.active).map((s) => ({ id: s.id, label: s.name, value: subscriptionMonthly(s), pct: summary.monthly ? (subscriptionMonthly(s) / summary.monthly) * 100 : 0, color: 'var(--series-3)' })).sort((a, b) => b.value - a.value)} />
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}
      <SubModal open={modal.open} sub={modal.sub} onClose={() => setModal({ open: false })} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title={t('Excluir assinatura?')} description={t('As cobranças já lançadas continuam no histórico.')} confirmLabel={t('Excluir')} onConfirm={() => { if (confirm) remove('subscriptions', confirm.id); toast.success(t('Assinatura excluída')); }} />
    </div>
  );
}
