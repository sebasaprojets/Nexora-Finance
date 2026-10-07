import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, ChevronLeft, ChevronRight, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useMoney } from '@/hooks/useMoney';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { monthEvents, EVENT_META, type CalendarEvent, type EventKind } from '@/lib/calendar';
import { addMonths, daysInMonth, formatDate, formatMonthLong, monthKey, today, WEEKDAYS_SHORT } from '@/lib/dates';
import { parseMoneyInput } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import { cn } from '@/lib/cn';
import { t } from '@/i18n';

export default function CalendarPage() {
  const data = useFinanceData();
  const upsert = useFinance((s) => s.upsert);
  const remove = useFinance((s) => s.remove);
  const money = useMoney();
  const [month, setMonth] = useState(monthKey(today()));
  const [day, setDay] = useState<string>(today());
  const [hidden, setHidden] = useState<Set<EventKind>>(new Set());
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [rem, setRem] = useState({ title: '', date: today(), amount: '' });

  const events = useMemo(() => monthEvents(data, month).filter((e) => !hidden.has(e.kind)), [data, month, hidden]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);
  const [y, mo] = month.split('-').map(Number);
  const total = daysInMonth(y, mo);
  const offset = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
  const ref = today();
  const dayEvents = byDay.get(day) ?? [];
  const pendingOut = events.filter((e) => !e.done && e.kind !== 'income' && e.kind !== 'goal' && e.date >= ref).reduce((s, e) => s + (e.amount ?? 0), 0);
  const pendingIn = events.filter((e) => !e.done && e.kind === 'income' && e.date >= ref).reduce((s, e) => s + (e.amount ?? 0), 0);

  const go = (delta: number) => {
    const next = monthKey(addMonths(`${month}-01`, delta));
    setMonth(next);
    setDay(next === monthKey(ref) ? ref : `${next}-01`);
  };

  const saveReminder = () => {
    if (!rem.title.trim()) return toast.error(t('Informe um título'));
    upsert('reminders', { id: uid('rem'), title: sanitizeText(rem.title, 80), date: rem.date, amount: rem.amount ? parseMoneyInput(rem.amount) : undefined, done: false });
    toast.success(t('Lembrete criado'), { description: t('Você será avisado perto de {data}.', { data: formatDate(rem.date) }) });
    setReminderOpen(false);
    setRem({ title: '', date: day, amount: '' });
  };

  return (
    <div>
      <PageHeader
        title={t('Calendário financeiro')}
        description={t('Contas, faturas, receitas, metas e lembretes em um só lugar.')}
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => { setRem({ title: '', date: day, amount: '' }); setReminderOpen(true); }}>{t('Novo lembrete')}</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label={t('Filtrar tipos de evento')}>
        {(Object.keys(EVENT_META) as EventKind[]).map((k) => {
          const off = hidden.has(k);
          return (
            <button
              key={k}
              aria-pressed={!off}
              onClick={() => setHidden((h) => { const n = new Set(h); if (off) n.delete(k); else n.add(k); return n; })}
              className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity', off ? 'border-border opacity-50' : 'border-border-strong')}
            >
              <span className="size-2 rounded-full" style={{ background: EVENT_META[k].color }} aria-hidden />
              {t(EVENT_META[k].label)}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="flex items-center justify-between p-4 sm:p-5">
            <Button variant="ghost" size="icon-sm" aria-label={t('Mês anterior')} onClick={() => go(-1)}><ChevronLeft className="size-4" /></Button>
            <div className="text-center">
              <h2 className="font-display text-lg font-semibold">{formatMonthLong(month)}</h2>
              <p className="text-xs text-fg-subtle">{t('A pagar:')} <span className="tabular font-medium text-fg">{money(pendingOut)}</span> · {t('A receber:')} <span className="tabular font-medium text-income">{money(pendingIn)}</span></p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={t('Próximo mês')} onClick={() => go(1)}><ChevronRight className="size-4" /></Button>
          </div>
          <div className="px-2 pb-4 sm:px-5">
            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-fg-subtle" aria-hidden>
              {WEEKDAYS_SHORT.map((d) => <span key={d} className="pb-2">{t(d)}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t('Calendário de {mes}', { mes: formatMonthLong(month) })}>
              {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} aria-hidden />)}
              {Array.from({ length: total }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, '0')}`;
                const evs = byDay.get(date) ?? [];
                const isToday = date === ref;
                return (
                  <button
                    key={date}
                    role="gridcell"
                    aria-selected={day === date}
                    aria-label={`${i + 1}: ${t(evs.length === 1 ? '{n} evento' : '{n} eventos', { n: evs.length })}`}
                    onClick={() => setDay(date)}
                    className={cn('flex min-h-16 flex-col items-stretch rounded-xl border p-1.5 text-left transition-colors sm:min-h-24', day === date ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-surface-2', date < ref && 'opacity-80')}
                  >
                    <span className={cn('grid size-6 place-items-center rounded-full text-xs font-medium', isToday && 'bg-primary text-primary-fg')}>{i + 1}</span>
                    <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                      {evs.slice(0, 3).map((e) => (
                        <span key={e.id} className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium', e.done && 'line-through opacity-60')} style={{ background: `color-mix(in oklab, ${EVENT_META[e.kind].color} 18%, transparent)` }}>
                          {e.title}
                        </span>
                      ))}
                      {evs.length > 3 && <span className="px-1 text-[10px] text-fg-subtle">+{evs.length - 3}</span>}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                      {evs.slice(0, 4).map((e) => <span key={e.id} className="size-1.5 rounded-full" style={{ background: EVENT_META[e.kind].color }} />)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title={formatDate(day)} description={t(dayEvents.length === 1 ? '{n} evento' : '{n} eventos', { n: dayEvents.length })} />
          <CardBody className="space-y-2 pt-3">
            {dayEvents.map((e) => (
              <button key={e.id} onClick={() => setEvent(e)} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-border-strong">
                <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: EVENT_META[e.kind].color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-medium', e.done && 'line-through opacity-70')}>{e.title}</p>
                  <p className="text-xs text-fg-subtle">{t(EVENT_META[e.kind].label)}{e.projected ? ` · ${t('previsto')}` : ''}{e.done ? ` · ${t('concluído')}` : ''}</p>
                </div>
                {e.amount !== undefined && <span className={cn('tabular text-sm font-semibold', e.kind === 'income' && 'text-income')}>{money(e.amount)}</span>}
              </button>
            ))}
            {!dayEvents.length && <p className="py-6 text-center text-sm text-fg-subtle">{t('Nada programado para este dia.')}</p>}
            <h3 className="pt-4 text-xs font-medium text-fg-subtle">{t('Próximos no mês')}</h3>
            {events.filter((e) => e.date > day && !e.done).slice(0, 6).map((e) => (
              <button key={e.id} onClick={() => { setDay(e.date); setEvent(e); }} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                <span className="flex min-w-0 items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ background: EVENT_META[e.kind].color }} aria-hidden /><span className="tabular text-xs text-fg-subtle">{e.date.slice(8)}</span><span className="truncate">{e.title}</span></span>
                {e.amount !== undefined && <span className="tabular shrink-0 text-xs font-medium">{money(e.amount)}</span>}
              </button>
            ))}
          </CardBody>
        </Card>
      </div>

      <Modal open={!!event} onClose={() => setEvent(null)} title={event?.title ?? ''} description={event ? `${t(EVENT_META[event.kind].label)} · ${formatDate(event.date)}` : undefined} size="sm">
        {event && (
          <div className="space-y-4">
            {event.amount !== undefined && <p className="tabular font-display text-3xl font-semibold">{money(event.amount)}</p>}
            <div className="flex flex-wrap gap-2">
              {event.done ? <Badge tone="success">{t('Concluído')}</Badge> : <Badge tone="warning">{t('Pendente')}</Badge>}
              {event.projected && <Badge>{t('Previsão baseada na recorrência')}</Badge>}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {event.kind === 'reminder' && event.refId && (
                <>
                  <Button size="sm" leftIcon={<Check className="size-3.5" />} onClick={() => { const r = data.reminders.find((x) => x.id === event.refId); if (r) upsert('reminders', { ...r, done: !r.done }); setEvent(null); toast.success(event.done ? t('Lembrete reaberto') : t('Lembrete concluído')); }}>
                    {event.done ? t('Reabrir') : t('Marcar como feito')}
                  </Button>
                  <Button size="sm" variant="danger" leftIcon={<Trash2 className="size-3.5" />} onClick={() => { remove('reminders', event.refId!); setEvent(null); toast.success(t('Lembrete removido')); }}>{t('Excluir')}</Button>
                </>
              )}
              {event.href && (
                <Link to={event.href} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-surface-2">
                  <ExternalLink className="size-3.5" /> {event.kind === 'invoice' ? t('Ver fatura / pagar') : t('Abrir')}
                </Link>
              )}
              {!event.done && event.kind !== 'reminder' && (
                <Button size="sm" variant="ghost" leftIcon={<Bell className="size-3.5" />} onClick={() => { upsert('reminders', { id: uid('rem'), title: event.title, date: event.date, amount: event.amount, done: false }); setEvent(null); toast.success(t('Lembrete criado')); }}>
                  {t('Lembrar-me')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={reminderOpen} onClose={() => setReminderOpen(false)} title={t('Novo lembrete')} size="sm" footer={<><Button variant="ghost" onClick={() => setReminderOpen(false)}>{t('Cancelar')}</Button><Button onClick={saveReminder}>{t('Salvar')}</Button></>}>
        <div className="space-y-4">
          <Field label={t('Título')}>{(p) => <Input {...p} value={rem.title} onChange={(e) => setRem({ ...rem, title: e.target.value })} placeholder={t('Ex.: Pagar IPVA')} data-autofocus />}</Field>
          <Field label={t('Data')}>{(p) => <Input {...p} type="date" value={rem.date} onChange={(e) => setRem({ ...rem, date: e.target.value })} />}</Field>
          <Field label={t('Valor (opcional)')}>{(p) => <Input {...p} value={rem.amount} onChange={(e) => setRem({ ...rem, amount: e.target.value })} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
        </div>
      </Modal>
    </div>
  );
}
