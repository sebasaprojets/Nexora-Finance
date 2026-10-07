import { useCallback, useMemo, useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, MoreHorizontal, Pencil, PiggyBank, Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { axisProps, ChartTooltipBox } from '@/components/charts/ChartTooltip';
import { useFinance } from '@/store/finance';
import { TourButton, usePageTour } from '@/components/tour/Tour';
import { toast } from '@/store/toast';
import { useMoney } from '@/hooks/useMoney';
import { useQueryAction } from '@/hooks/useQueryAction';
import { goalProgress } from '@/lib/finance';
import { addMonths, formatDate, formatMonthLong, formatMonthShort, monthKey, today } from '@/lib/dates';
import { formatMoney, parseMoneyInput, formatAxis } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import { cn } from '@/lib/cn';
import { notifyUser } from '@/services/notifications';
import type { Goal } from '@/types';
import { t } from '@/i18n';

const GOAL_ICONS = ['target', 'car', 'plane', 'house', 'shield', 'graduation-cap', 'phone', 'gift', 'baby', 'paw', 'trending-up', 'laptop'];
const COLORS = ['#2a78d6', '#1baf7a', '#e87ba4', '#eda100', '#4a3aa7', '#eb6834', '#0891b2'];

function GoalModal({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: Goal }) {
  const upsert = useFinance((s) => s.upsert);
  const [form, setForm] = useState({ name: '', target: '', initial: '', deadline: '', icon: 'target', color: COLORS[0] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [key, setKey] = useState('');
  const k = `${open}-${goal?.id}`;
  if (open && k !== key) {
    setKey(k);
    setErrors({});
    setForm({
      name: goal?.name ?? '',
      target: goal ? formatMoney(goal.target).replace(/[^\d,.]/g, '') : '',
      initial: goal ? formatMoney(goal.initialAmount).replace(/[^\d,.]/g, '') : '',
      deadline: goal?.deadline ?? addMonths(today(), 12),
      icon: goal?.icon ?? 'target',
      color: goal?.color ?? COLORS[0],
    });
  }
  const save = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t('Informe um nome');
    if (!(parseMoneyInput(form.target) > 0)) e.target = t('Informe o valor da meta');
    if (form.deadline && form.deadline <= today()) e.deadline = t('O prazo deve ser uma data futura');
    setErrors(e);
    if (Object.keys(e).length) return;
    upsert('goals', {
      id: goal?.id ?? uid('goal'),
      name: sanitizeText(form.name, 50),
      target: parseMoneyInput(form.target),
      initialAmount: parseMoneyInput(form.initial) || 0,
      deadline: form.deadline || undefined,
      icon: form.icon,
      color: form.color,
      contributions: goal?.contributions ?? [],
      createdAt: goal?.createdAt ?? new Date().toISOString(),
    });
    toast.success(goal ? t('Meta atualizada') : t('Meta criada'));
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={goal ? t('Editar meta') : t('Nova meta')} footer={<><Button variant="ghost" onClick={onClose}>{t('Cancelar')}</Button><Button onClick={save}>{t('Salvar')}</Button></>}>
      <div className="space-y-4">
        <Field label={t('Nome da meta')} error={errors.name}>{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('Ex.: Comprar carro')} data-autofocus />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Valor da meta')} error={errors.target}>{(p) => <Input {...p} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} inputMode="decimal" placeholder={formatMoney(0)} />}</Field>
          <Field label={t('Já tenho guardado')}>{(p) => <Input {...p} value={form.initial} onChange={(e) => setForm({ ...form, initial: e.target.value })} inputMode="decimal" placeholder={formatMoney(0)} />}</Field>
        </div>
        <Field label={t('Prazo')} error={errors.deadline}>{(p) => <Input {...p} type="date" value={form.deadline} min={today()} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />}</Field>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg-muted">{t('Ícone e cor')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_ICONS.map((i) => (
              <button key={i} type="button" aria-label={i} aria-pressed={form.icon === i} onClick={() => setForm({ ...form, icon: i })} className={cn('rounded-xl p-0.5', form.icon === i && 'ring-2 ring-primary')}>
                <CategoryIcon icon={i} color={form.color} size="sm" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={t('Cor {cor}', { cor: c })} aria-pressed={form.color === c} onClick={() => setForm({ ...form, color: c })} className={cn('size-7 rounded-full', form.color === c && 'ring-2 ring-fg ring-offset-2 ring-offset-bg-elevated')} style={{ background: c }} />
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

function ContributeModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const contribute = useFinance((s) => s.contributeGoal);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'in' | 'out'>('in');
  const save = () => {
    const v = parseMoneyInput(amount);
    if (!goal || !(v > 0)) return;
    const before = goalProgress(goal);
    contribute(goal.id, mode === 'in' ? v : -v);
    const after = goalProgress(useFinance.getState().goals.find((g) => g.id === goal.id)!);
    toast.success(mode === 'in' ? t('Aporte registrado') : t('Resgate registrado'), { description: `${formatMoney(v)} · ${goal.name}` });
    if (!before.reached && after.reached) notifyUser({ kind: 'goal_reached', title: t('Meta atingida: {meta} 🎉', { meta: goal.name }), body: t('Você chegou a {valor}. Parabéns!', { valor: formatMoney(after.current) }), href: '/app/metas', dedupeKey: `goal:${goal.id}` });
    setAmount('');
    onClose();
  };
  return (
    <Modal open={!!goal} onClose={onClose} title={goal ? t('Movimentar “{meta}”', { meta: goal.name }) : ''} size="sm" footer={<><Button variant="ghost" onClick={onClose}>{t('Cancelar')}</Button><Button onClick={save}>{t('Confirmar')}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['in', 'out'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn('h-10 rounded-xl border text-sm font-medium', mode === m ? 'border-primary bg-primary-soft' : 'border-border text-fg-muted')}>
              {m === 'in' ? t('Guardar') : t('Resgatar')}
            </button>
          ))}
        </div>
        <Field label={t('Valor')}>{(p) => <Input {...p} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={formatMoney(0)} data-autofocus />}</Field>
      </div>
    </Modal>
  );
}

export default function Goals() {
  const goals = useFinance((s) => s.goals);
  const remove = useFinance((s) => s.remove);
  const money = useMoney();
  const [modal, setModal] = useState<{ open: boolean; goal?: Goal }>({ open: false });
  const [contribute, setContribute] = useState<Goal | null>(null);
  const [confirm, setConfirm] = useState<Goal | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const tourId = goals.length > 0 ? 'goals' : 'goals-empty';
  usePageTour(tourId);
  const { canCreate } = usePlan();
  const openNew = useCallback(() => canCreate('goals') && setModal({ open: true }), [canCreate]);
  useQueryAction('nova', openNew);
  const progress = useMemo(() => goals.map((g) => goalProgress(g)), [goals]);
  const total = progress.reduce((s, p) => ({ current: s.current + p.current, target: s.target + p.goal.target }), { current: 0, target: 0 });
  const sel = progress.find((p) => p.goal.id === (selected ?? progress[0]?.goal.id));

  const history = useMemo(() => {
    if (!sel) return [];
    const byMonth = new Map<string, number>();
    for (const c of sel.goal.contributions) byMonth.set(monthKey(c.date), (byMonth.get(monthKey(c.date)) ?? 0) + c.amount);
    const months = [...byMonth.keys()].sort();
    let acc = sel.goal.initialAmount;
    const out = months.map((m) => {
      acc += byMonth.get(m)!;
      return { month: m, label: formatMonthShort(m), value: Math.round(acc * 100) / 100, projected: false };
    });
    // Projeção no ritmo atual até a meta (máx. 24 meses).
    if (sel.avgMonthly > 0 && !sel.reached) {
      let v = sel.current;
      for (let i = 1; i <= Math.min(24, sel.monthsToGoal ?? 0); i++) {
        v = Math.min(sel.goal.target, v + sel.avgMonthly);
        const m = monthKey(addMonths(today(), i));
        out.push({ month: m, label: formatMonthShort(m), value: Math.round(v * 100) / 100, projected: true });
      }
    }
    return out;
  }, [sel]);

  return (
    <div>
      <PageHeader title={t('Metas Financeiras')} description={t('Acompanhe progresso, prazo e quanto guardar por mês.')} actions={<><TourButton id={tourId} /><Button data-tour="goal-new" leftIcon={<Plus className="size-4" />} onClick={openNew}>{t('Nova meta')}</Button></>} />

      {goals.length === 0 ? (
        <Card>
          <EmptyState icon={<Target />} title={t('Nenhuma meta criada')} description={t('Defina um objetivo — viagem, carro, reserva — e a Nexora calcula quanto guardar por mês.')} action={<Button onClick={() => setModal({ open: true })}>{t('+ Criar meta')}</Button>} />
        </Card>
      ) : (
        <>
          <Card className="holo mb-6 p-5">
            <p className="text-sm text-fg-muted">{t('Total acumulado em metas')}</p>
            <p className="tabular font-display text-3xl font-semibold tracking-tight">
              {money(total.current)} <span className="text-base font-normal text-fg-subtle">{t('de {valor}', { valor: money(total.target) })}</span>
            </p>
            <Progress value={total.target ? (total.current / total.target) * 100 : 0} className="mt-3" label={t('Progresso total das metas')} />
          </Card>

          <div data-tour="goal-list" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {progress.map((p) => (
              <Card key={p.goal.id} className={cn('cursor-pointer p-5 transition-colors hover:border-border-strong', sel?.goal.id === p.goal.id && 'border-primary')} onClick={() => setSelected(p.goal.id)}>
                <div className="flex items-start gap-3">
                  <CategoryIcon icon={p.goal.icon} color={p.goal.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.goal.name}</p>
                    <p className="text-xs text-fg-subtle">{p.goal.deadline ? t('Prazo: {data}', { data: formatDate(p.goal.deadline) }) : t('Sem prazo')}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      label={t('Ações da meta')}
                      trigger={(pp) => <Button variant="ghost" size="icon-sm" aria-label={t('Ações para {nome}', { nome: p.goal.name })} {...pp}><MoreHorizontal className="size-4" /></Button>}
                      items={[
                        { label: t('Editar'), icon: <Pencil />, onSelect: () => setModal({ open: true, goal: p.goal }) },
                        { label: t('Excluir'), icon: <Trash2 />, danger: true, onSelect: () => setConfirm(p.goal) },
                      ]}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="tabular text-xl font-semibold">{money(p.current)}</span>
                  <span className="tabular font-display text-lg font-semibold" style={{ color: p.goal.color }}>{p.pct.toFixed(0)}%</span>
                </div>
                <p className="text-xs text-fg-subtle">{t('Meta: {valor}', { valor: money(p.goal.target) })}</p>
                <Progress value={p.pct} color={p.goal.color} className="mt-2" label={t('Progresso de {nome}', { nome: p.goal.name })} />
                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-surface-2/70 p-2.5">
                    <dt className="text-fg-subtle">{t('Recomendado/mês')}</dt>
                    <dd className="tabular mt-0.5 font-semibold">{p.monthlyNeeded !== null ? money(p.monthlyNeeded) : '—'}</dd>
                  </div>
                  <div className="rounded-lg bg-surface-2/70 p-2.5">
                    <dt className="text-fg-subtle">{t('Projeção')}</dt>
                    <dd className="mt-0.5 font-semibold">{p.reached ? t('Concluída') : p.projectedDate ? formatMonthLong(monthKey(p.projectedDate)) : t('Sem aportes')}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {p.reached ? <Badge tone="success">{t('Meta atingida 🎉')}</Badge> : p.onTrack === null ? <Badge>{t('Sem previsão')}</Badge> : p.onTrack ? <Badge tone="success">{t('No ritmo')}</Badge> : <Badge tone="warning">{t('Abaixo do ritmo')}</Badge>}
                  <Button size="sm" variant="soft" leftIcon={<PiggyBank className="size-3.5" />} onClick={(e) => { e.stopPropagation(); setContribute(p.goal); }}>
                    {t('Guardar')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {sel && (
            <Card className="mt-6">
              <CardHeader title={t('Evolução — {meta}', { meta: sel.goal.name })} description={t('Acumulado mensal e projeção no ritmo atual (tracejado)')} icon={<TrendingUp />} />
              <CardBody>
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  <div className="h-64" role="img" aria-label={t('Gráfico de evolução da meta')}>
                    {history.length > 1 ? (
                      <ResponsiveContainer>
                        <AreaChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="goal-g" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor={sel.goal.color} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={sel.goal.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="label" {...axisProps} />
                          <YAxis {...axisProps} width={56} domain={[0, sel.goal.target]} tickFormatter={formatAxis} />
                          <Tooltip content={({ active, payload }) => (active && payload?.length ? <ChartTooltipBox title={formatMonthLong((payload[0].payload as { month: string }).month)} rows={[{ label: (payload[0].payload as { projected: boolean }).projected ? t('Projeção') : t('Acumulado'), value: money(Number(payload[0].value)), color: sel.goal.color }]} /> : null)} />
                          <Area type="monotone" dataKey={(d: { projected: boolean; value: number }) => (d.projected ? null : d.value)} name={t('Acumulado')} stroke={sel.goal.color} strokeWidth={2} fill="url(#goal-g)" connectNulls={false} />
                          <Area type="monotone" dataKey={(d: { projected: boolean; value: number; month: string }) => (d.projected || d.month === monthKey(today()) ? d.value : null)} name={t('Projeção')} stroke={sel.goal.color} strokeDasharray="5 4" strokeWidth={2} fill="none" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="grid h-full place-items-center text-sm text-fg-subtle">{t('Faça aportes para ver a evolução.')}</p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><CalendarDays className="size-4 text-fg-subtle" /> {t('Histórico de aportes')}</h3>
                    <ul className="scrollbar-thin max-h-56 space-y-1 overflow-y-auto pr-1">
                      {[...sel.goal.contributions].reverse().map((c) => (
                        <li key={c.id} className="flex justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                          <span className="text-fg-muted">{formatDate(c.date)}</span>
                          <span className={cn('tabular font-medium', c.amount < 0 && 'text-danger')}>{c.amount > 0 ? '+' : ''}{money(c.amount)}</span>
                        </li>
                      ))}
                      {!sel.goal.contributions.length && <li className="text-sm text-fg-subtle">{t('Nenhum aporte ainda.')}</li>}
                    </ul>
                    <p className="mt-3 text-xs text-fg-subtle">{t('Média dos últimos 6 meses:')} <strong className="text-fg">{t('{valor}/mês', { valor: money(sel.avgMonthly) })}</strong></p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <GoalModal open={modal.open} goal={modal.goal} onClose={() => setModal({ open: false })} />
      <ContributeModal goal={contribute} onClose={() => setContribute(null)} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title={t('Excluir meta?')} description={t('O histórico de aportes desta meta será removido.')} confirmLabel={t('Excluir')} onConfirm={() => { if (confirm) remove('goals', confirm.id); toast.success(t('Meta excluída')); }} />
    </div>
  );
}
