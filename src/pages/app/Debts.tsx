import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HandCoins, MoreHorizontal, Pencil, Plus, Route, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/EmptyState';
import { axisProps, ChartTooltipBox } from '@/components/charts/ChartTooltip';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { useMoney } from '@/hooks/useMoney';
import { debtTotals, payoffPlan } from '@/lib/finance';
import { formatMonthLong, formatMonthShort } from '@/lib/dates';
import { formatMoney, formatPercent, parseMoneyInput, round2 } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import type { Debt, DebtStatus } from '@/types';

const STATUS: Record<DebtStatus, { label: string; tone: Tone }> = {
  active: { label: 'Em dia', tone: 'primary' },
  late: { label: 'Atrasada', tone: 'danger' },
  negotiating: { label: 'Em negociação', tone: 'warning' },
  paid: { label: 'Quitada', tone: 'success' },
};

function DebtModal({ open, onClose, debt }: { open: boolean; onClose: () => void; debt?: Debt }) {
  const upsert = useFinance((s) => s.upsert);
  const blank = { name: '', creditor: '', total: '', remaining: '', rate: '', installments: '12', paid: '0', amount: '', dueDay: '10', status: 'active' as DebtStatus };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<Record<string, string>>({});
  const [key, setKey] = useState('');
  const k = `${open}-${debt?.id}`;
  if (open && key !== k) {
    setKey(k);
    setErr({});
    const m = (v: number) => formatMoney(v).replace(/[^\d,.]/g, '');
    setF(debt ? { name: debt.name, creditor: debt.creditor, total: m(debt.total), remaining: m(debt.remaining), rate: String(debt.interestRate).replace('.', ','), installments: String(debt.installments), paid: String(debt.installmentsPaid), amount: m(debt.installmentAmount), dueDay: String(debt.dueDay), status: debt.status } : blank);
  }
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = () => {
    const e: Record<string, string> = {};
    const total = parseMoneyInput(f.total);
    const remaining = f.remaining ? parseMoneyInput(f.remaining) : total;
    const n = parseInt(f.installments, 10);
    if (!f.name.trim()) e.name = 'Informe um nome';
    if (!(total > 0)) e.total = 'Informe o valor total';
    if (!(remaining >= 0) || remaining > total * 3) e.remaining = 'Valor restante inválido';
    if (!(n >= 1)) e.installments = 'Parcelas inválidas';
    setErr(e);
    if (Object.keys(e).length) return;
    const paid = Math.min(n, Math.max(0, parseInt(f.paid, 10) || 0));
    upsert('debts', {
      id: debt?.id ?? uid('debt'),
      name: sanitizeText(f.name, 50),
      creditor: sanitizeText(f.creditor, 50) || '—',
      total,
      remaining,
      interestRate: parseMoneyInput(f.rate) || 0,
      installments: n,
      installmentsPaid: paid,
      installmentAmount: f.amount ? parseMoneyInput(f.amount) : round2(remaining / Math.max(1, n - paid)),
      dueDay: Math.min(31, Math.max(1, parseInt(f.dueDay, 10) || 10)),
      status: remaining <= 0 ? 'paid' : f.status,
      createdAt: debt?.createdAt ?? new Date().toISOString(),
    });
    toast.success(debt ? 'Dívida atualizada' : 'Dívida adicionada');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={debt ? 'Editar dívida' : 'Nova dívida'} size="lg" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" error={err.name}>{(p) => <Input {...p} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Empréstimo pessoal" data-autofocus />}</Field>
        <Field label="Credor">{(p) => <Input {...p} value={f.creditor} onChange={(e) => set({ creditor: e.target.value })} placeholder="Banco ou loja" />}</Field>
        <Field label="Valor total" error={err.total}>{(p) => <Input {...p} value={f.total} onChange={(e) => set({ total: e.target.value })} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
        <Field label="Valor restante" error={err.remaining} hint="Saldo devedor atual">{(p) => <Input {...p} value={f.remaining} onChange={(e) => set({ remaining: e.target.value })} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
        <Field label="Juros ao mês (%)">{(p) => <Input {...p} value={f.rate} onChange={(e) => set({ rate: e.target.value })} inputMode="decimal" placeholder="0,0" />}</Field>
        <Field label="Dia do vencimento">{(p) => <Input {...p} type="number" min={1} max={31} value={f.dueDay} onChange={(e) => set({ dueDay: e.target.value })} />}</Field>
        <Field label="Total de parcelas" error={err.installments}>{(p) => <Input {...p} type="number" min={1} value={f.installments} onChange={(e) => set({ installments: e.target.value })} />}</Field>
        <Field label="Parcelas pagas">{(p) => <Input {...p} type="number" min={0} value={f.paid} onChange={(e) => set({ paid: e.target.value })} />}</Field>
        <Field label="Valor da parcela" hint="Em branco: calculado automaticamente">{(p) => <Input {...p} value={f.amount} onChange={(e) => set({ amount: e.target.value })} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
        <Field label="Status">
          {(p) => (
            <Select {...p} value={f.status} onChange={(e) => set({ status: e.target.value as DebtStatus })}>
              {Object.entries(STATUS).map(([k2, v]) => <option key={k2} value={k2}>{v.label}</option>)}
            </Select>
          )}
        </Field>
      </div>
    </Modal>
  );
}

export default function Debts() {
  const debts = useFinance((s) => s.debts);
  const accounts = useFinance((s) => s.accounts);
  const remove = useFinance((s) => s.remove);
  const payInstallment = useFinance((s) => s.payDebtInstallment);
  const money = useMoney();
  const [modal, setModal] = useState<{ open: boolean; debt?: Debt }>({ open: false });
  const [confirm, setConfirm] = useState<Debt | null>(null);
  const [pay, setPay] = useState<Debt | null>(null);
  const [payAccount, setPayAccount] = useState('');
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extra, setExtra] = useState('200');

  const totals = debtTotals(debts);
  const plan = useMemo(() => payoffPlan(debts, parseMoneyInput(extra) || 0, strategy), [debts, extra, strategy]);
  const base = useMemo(() => payoffPlan(debts, 0, strategy), [debts, strategy]);
  const names = new Map(debts.map((d) => [d.id, d.name]));

  return (
    <div>
      <PageHeader title="Dívidas" description="Controle saldos, juros, parcelas e monte um plano de quitação." actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => setModal({ open: true })}>Nova dívida</Button>} />

      {debts.length === 0 ? (
        <Card><EmptyState icon={<HandCoins />} title="Nenhuma dívida registrada" description="Ótimo! Se tiver empréstimos ou parcelamentos, registre aqui para planejar a quitação." action={<Button onClick={() => setModal({ open: true })}>+ Adicionar dívida</Button>} /></Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Saldo devedor', money(totals.remaining)],
              ['Valor original', money(totals.total)],
              ['Parcelas mensais', money(totals.monthly)],
              ['Dívidas ativas', String(totals.count)],
            ].map(([l, v]) => (
              <div key={l} className="card px-4 py-3">
                <p className="text-xs text-fg-subtle">{l}</p>
                <p className="tabular mt-0.5 truncate text-lg font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {debts.map((d) => {
              const pct = d.total ? ((d.total - d.remaining) / d.total) * 100 : 0;
              return (
                <Card key={d.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="text-xs text-fg-subtle">{d.creditor} · vence dia {d.dueDay}</p>
                    </div>
                    <Badge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Badge>
                    <Dropdown
                      label="Ações"
                      trigger={(p) => <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${d.name}`} {...p}><MoreHorizontal className="size-4" /></Button>}
                      items={[
                        { label: 'Editar', icon: <Pencil />, onSelect: () => setModal({ open: true, debt: d }) },
                        { label: 'Excluir', icon: <Trash2 />, danger: true, onSelect: () => setConfirm(d) },
                      ]}
                    />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="tabular text-xl font-semibold">{money(d.remaining)}</span>
                    <span className="text-xs text-fg-subtle">de {money(d.total)}</span>
                  </div>
                  <Progress value={pct} className="mt-2" color="var(--success)" label={`Quitação de ${d.name}`} />
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-surface-2/70 p-2.5"><dt className="text-fg-subtle">Juros</dt><dd className="mt-0.5 font-semibold">{formatPercent(d.interestRate)} a.m.</dd></div>
                    <div className="rounded-lg bg-surface-2/70 p-2.5"><dt className="text-fg-subtle">Parcelas</dt><dd className="mt-0.5 font-semibold">{d.installmentsPaid}/{d.installments}</dd></div>
                    <div className="rounded-lg bg-surface-2/70 p-2.5"><dt className="text-fg-subtle">Parcela</dt><dd className="tabular mt-0.5 font-semibold">{money(d.installmentAmount)}</dd></div>
                  </dl>
                  {d.status !== 'paid' && (
                    <Button variant="soft" className="mt-4 w-full" onClick={() => { setPay(d); setPayAccount(accounts[0]?.id ?? ''); }}>
                      Registrar pagamento de parcela
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          {totals.count > 0 && (
            <Card className="mt-6">
              <CardHeader
                title="Plano de pagamento"
                description="Simulação educativa: paga o mínimo de todas e direciona o extra para a prioritária."
                icon={<Route />}
                action={
                  <Segmented
                    size="sm"
                    label="Estratégia"
                    value={strategy}
                    onChange={setStrategy}
                    options={[
                      { value: 'avalanche', label: 'Avalanche' },
                      { value: 'snowball', label: 'Bola de neve' },
                    ]}
                  />
                }
              />
              <CardBody>
                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                  <div className="space-y-4">
                    <Field label="Valor extra por mês" hint="Quanto você pode pagar além das parcelas">
                      {(p) => <Input {...p} value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="decimal" />}
                    </Field>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between rounded-lg bg-surface-2/70 px-3 py-2"><span className="text-fg-subtle">Quitação em</span><strong>{plan.feasible ? `${plan.months} meses` : 'mais de 30 anos'}</strong></div>
                      <div className="flex justify-between rounded-lg bg-surface-2/70 px-3 py-2"><span className="text-fg-subtle">Juros totais</span><strong className="tabular">{money(plan.totalInterest)}</strong></div>
                      {base.feasible && plan.months < base.months && (
                        <p className="rounded-lg bg-success-soft px-3 py-2 text-xs text-success">
                          Com o extra você quita {base.months - plan.months} meses antes e economiza {money(base.totalInterest - plan.totalInterest)} em juros.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-fg-subtle">Ordem de prioridade</p>
                      <ol className="space-y-1 text-sm">
                        {plan.order.map((id, i) => (
                          <li key={id} className="flex gap-2"><span className="tabular text-fg-subtle">{i + 1}.</span>{names.get(id)}</li>
                        ))}
                      </ol>
                      <p className="mt-2 text-xs text-fg-subtle">{strategy === 'avalanche' ? 'Avalanche: maior juros primeiro — paga menos juros.' : 'Bola de neve: menor saldo primeiro — vitórias rápidas.'}</p>
                    </div>
                  </div>
                  <div className="h-72" role="img" aria-label="Saldo devedor projetado ao longo dos meses">
                    <ResponsiveContainer>
                      <AreaChart data={plan.schedule.map((s) => ({ ...s, label: formatMonthShort(s.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="debt-g" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--series-2)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--series-2)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" {...axisProps} minTickGap={20} />
                        <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatMoney(v, { abbreviate: true, compact: true }).replace('R$ ', '')} />
                        <Tooltip content={({ active, payload }) => (active && payload?.length ? <ChartTooltipBox title={formatMonthLong((payload[0].payload as { month: string }).month)} rows={[{ label: 'Saldo devedor', value: money(Number(payload[0].value)), color: 'var(--series-2)' }]} /> : null)} />
                        <Area type="monotone" dataKey="remainingTotal" stroke="var(--series-2)" strokeWidth={2} fill="url(#debt-g)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <DebtModal open={modal.open} debt={modal.debt} onClose={() => setModal({ open: false })} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title="Excluir dívida?" description="Esta ação não pode ser desfeita." confirmLabel="Excluir" onConfirm={() => { if (confirm) remove('debts', confirm.id); toast.success('Dívida excluída'); }} />
      <Modal
        open={!!pay}
        onClose={() => setPay(null)}
        title="Pagar parcela"
        description={pay ? `${pay.name} · ${formatMoney(Math.min(pay.remaining, pay.installmentAmount))}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPay(null)}>Cancelar</Button>
            <Button onClick={() => { if (pay) { payInstallment(pay.id, payAccount || undefined); toast.success('Parcela registrada'); } setPay(null); }}>Confirmar</Button>
          </>
        }
      >
        <Field label="Debitar da conta" hint="Uma despesa será registrada para manter seus saldos corretos.">
          {(p) => (
            <Select {...p} value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
              <option value="">Não registrar transação</option>
              {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          )}
        </Field>
      </Modal>
    </div>
  );
}
