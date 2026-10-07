import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/store/settings';
import { BankPicker } from '@/components/common/BankPicker';
import { bankBySlug, findBank } from '@/lib/banks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, CreditCard as CardIcon, MoreHorizontal, Pencil, Plus, Receipt, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { CreditCardVisual, CARD_THEMES } from '@/components/common/CreditCardVisual';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Segmented } from '@/components/ui/Segmented';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFinance } from '@/store/finance';
import { TourButton, usePageTour } from '@/components/tour/Tour';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';
import { useMoney } from '@/hooks/useMoney';
import { useQueryAction } from '@/hooks/useQueryAction';
import { useLookups } from '@/hooks/useLookups';
import { cardSummary, type CardSummary } from '@/lib/finance';
import { formatDate, formatMonthLong, today } from '@/lib/dates';
import { formatMoney, parseMoneyInput, round2 } from '@/lib/format';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import { cn } from '@/lib/cn';
import type { CreditCard, Invoice, InvoiceStatus } from '@/types';

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: Tone; emoji: string }> = {
  paid: { label: 'Paga', tone: 'success', emoji: '🟢' },
  open: { label: 'Aberta', tone: 'warning', emoji: '🟡' },
  closed: { label: 'Fechada', tone: 'info', emoji: '🔵' },
  overdue: { label: 'Atrasada', tone: 'danger', emoji: '🔴' },
  future: { label: 'Futura', tone: 'neutral', emoji: '⚪' },
};

const schema = z
  .object({
    name: z.string().trim().min(1, 'Informe um nome').max(40),
    institution: z.string().trim().min(1, 'Informe o banco').max(40),
    brand: z.enum(['visa', 'mastercard', 'elo', 'amex', 'hipercard']),
    last4: z.string().regex(/^\d{4}$/, 'Informe os 4 últimos dígitos'),
    limit: z.string().refine((v) => parseMoneyInput(v) > 0, 'Informe o limite'),
    closingDay: z.number().int().min(1).max(31),
    dueDay: z.number().int().min(1).max(31),
    paymentAccountId: z.string().optional(),
    theme: z.enum(['violet', 'graphite', 'ocean', 'emerald', 'sunset', 'gold']),
    bank: z.string(),
  })
  .refine((v) => v.closingDay !== v.dueDay, { path: ['dueDay'], message: 'Vencimento deve ser diferente do fechamento' });
type Values = z.infer<typeof schema>;

function CardModal({ open, onClose, card }: { open: boolean; onClose: () => void; card?: CreditCard }) {
  const upsert = useFinance((s) => s.upsert);
  const accounts = useFinance((s) => s.accounts);
  const { register, handleSubmit, formState, watch, setValue } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: card?.name ?? '',
      institution: card?.institution ?? '',
      brand: card?.brand ?? 'mastercard',
      last4: card?.last4 ?? '',
      limit: card ? formatMoney(card.limit).replace(/[^\d,.]/g, '') : '',
      closingDay: card?.closingDay ?? 1,
      dueDay: card?.dueDay ?? 10,
      paymentAccountId: card?.paymentAccountId ?? accounts[0]?.id,
      theme: card?.theme ?? 'violet',
      bank: card?.bank ?? findBank(card?.institution, card?.name)?.slug ?? '',
    },
  });
  const preview: CreditCard = {
    id: 'preview',
    name: watch('name') || 'Meu cartão',
    institution: watch('institution') || 'Banco',
    bank: watch('bank') || undefined,
    brand: watch('brand'),
    last4: watch('last4') || '0000',
    limit: 0,
    closingDay: 1,
    dueDay: 10,
    theme: watch('theme'),
    createdAt: '',
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={card ? 'Editar cartão' : 'Novo cartão'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="card-form">Salvar</Button>
        </>
      }
    >
      <form
        id="card-form"
        noValidate
        className="grid gap-5 md:grid-cols-[260px_1fr]"
        onSubmit={handleSubmit((v) => {
          upsert('cards', {
            id: card?.id ?? uid('card'),
            name: sanitizeText(v.name, 40),
            institution: sanitizeText(v.institution, 40),
            bank: v.bank || undefined,
            brand: v.brand,
            last4: v.last4,
            limit: parseMoneyInput(v.limit),
            closingDay: v.closingDay,
            dueDay: v.dueDay,
            paymentAccountId: v.paymentAccountId,
            theme: v.theme,
            createdAt: card?.createdAt ?? new Date().toISOString(),
          });
          toast.success(card ? 'Cartão atualizado' : 'Cartão adicionado');
          onClose();
        })}
      >
        <div className="space-y-3">
          <CreditCardVisual card={preview} compact />
          <p className="text-xs text-fg-subtle">Nunca armazenamos o número completo, CVV ou senha do cartão.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <BankPicker
              label="Banco emissor"
              value={watch('bank')}
              onChange={(b) => {
                const prev = bankBySlug(watch('bank'));
                setValue('bank', b?.slug ?? '');
                if (!b) return;
                setValue('institution', b.name, { shouldValidate: formState.isSubmitted });
                if (!watch('name') || watch('name') === prev?.name) setValue('name', b.name);
              }}
            />
          </div>
          <Field label="Nome do cartão" error={formState.errors.name?.message}>{(p) => <Input {...p} {...register('name')} placeholder="Ex.: Nubank Ultravioleta" data-autofocus />}</Field>
          <Field label="Banco" error={formState.errors.institution?.message}>{(p) => <Input {...p} {...register('institution')} placeholder="Ex.: Nubank" />}</Field>
          <Field label="Bandeira">
            {(p) => (
              <Select {...p} {...register('brand')}>
                <option value="mastercard">Mastercard</option>
                <option value="visa">Visa</option>
                <option value="elo">Elo</option>
                <option value="amex">American Express</option>
                <option value="hipercard">Hipercard</option>
              </Select>
            )}
          </Field>
          <Field label="Últimos 4 dígitos" error={formState.errors.last4?.message}>{(p) => <Input {...p} {...register('last4')} inputMode="numeric" maxLength={4} placeholder="0000" />}</Field>
          <Field label="Limite" error={formState.errors.limit?.message}>{(p) => <Input {...p} {...register('limit')} inputMode="decimal" placeholder="R$ 0,00" />}</Field>
          <Field label="Conta para pagamento">
            {(p) => (
              <Select {...p} {...register('paymentAccountId')}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Dia do fechamento">{(p) => <Input {...p} type="number" min={1} max={31} {...register('closingDay', { valueAsNumber: true })} />}</Field>
          <Field label="Dia do vencimento" error={formState.errors.dueDay?.message}>{(p) => <Input {...p} type="number" min={1} max={31} {...register('dueDay', { valueAsNumber: true })} />}</Field>
          <Field label="Visual" className="sm:col-span-2">
            {(p) => (
              <Select {...p} {...register('theme')}>
                {Object.entries(CARD_THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </form>
    </Modal>
  );
}

function PayInvoiceModal({ summary, invoice, onClose }: { summary: CardSummary | null; invoice: Invoice | null; onClose: () => void }) {
  const accounts = useFinance((s) => s.accounts);
  const payInvoice = useFinance((s) => s.payInvoice);
  const remaining = invoice ? round2(invoice.total - invoice.paid) : 0;
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const open = !!summary && !!invoice;
  const value = amount ? parseMoneyInput(amount) : remaining;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pagar fatura"
      description={invoice && summary ? `${summary.card.name} · vencimento ${formatDate(invoice.dueDate)}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!(value > 0) || value > remaining + 0.01}
            onClick={() => {
              if (!summary || !invoice) return;
              payInvoice({ invoiceId: invoice.id, cardId: summary.card.id, accountId: account || summary.card.paymentAccountId || accounts[0]?.id, amount: value });
              toast.success('Pagamento registrado', { description: `${formatMoney(value)} debitados da conta.` });
              setAmount('');
              onClose();
            }}
          >
            Confirmar pagamento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-surface-2 p-4 text-center">
          <p className="text-xs text-fg-subtle">Valor em aberto</p>
          <p className="tabular font-display text-2xl font-semibold">{formatMoney(remaining)}</p>
        </div>
        <Field label="Pagar com">
          {(p) => (
            <Select {...p} value={account || summary?.card.paymentAccountId || ''} onChange={(e) => setAccount(e.target.value)}>
              {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Valor" hint="Deixe em branco para pagar o total. Pagamentos parciais são permitidos.">
          {(p) => <Input {...p} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={formatMoney(remaining).replace('R$ ', '')} />}
        </Field>
      </div>
    </Modal>
  );
}

export default function Cards() {
  const cards = useFinance((s) => s.cards);
  const transactions = useFinance((s) => s.transactions);
  const remove = useFinance((s) => s.remove);
  const openTx = useUI((s) => s.openTransaction);
  const navigate = useNavigate();
  const skipCardStep = useSettings((s) => s.setStepSkipped);
  const money = useMoney();
  const lookups = useLookups();
  const [modal, setModal] = useState<{ open: boolean; card?: CreditCard }>({ open: false });
  useQueryAction('novo', useCallback(() => setModal({ open: true }), []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'previous' | 'current' | 'next'>('current');
  const [pay, setPay] = useState<{ summary: CardSummary; invoice: Invoice } | null>(null);
  const [confirm, setConfirm] = useState<CreditCard | null>(null);

  const tourId = cards.length > 0 ? 'cards' : 'cards-empty';
  usePageTour(tourId);
  const summaries = useMemo(() => cards.map((c) => cardSummary(c, transactions)), [cards, transactions]);
  const selected = summaries.find((s) => s.card.id === (selectedId ?? summaries[0]?.card.id));
  const totalLimit = summaries.reduce((s, c) => s + c.card.limit, 0);
  const totalUsed = summaries.reduce((s, c) => s + c.used, 0);
  const viewed = selected ? (view === 'previous' ? selected.previous : view === 'next' ? selected.next : selected.current) : undefined;
  const pending = selected?.pending;

  return (
    <div>
      <PageHeader title="Cartões" description="Limites, faturas, vencimentos e compras." actions={<><TourButton id={tourId} /><Button data-tour="card-new" leftIcon={<Plus className="size-4" />} onClick={() => setModal({ open: true })}>Novo cartão</Button></>} />

      {cards.length === 0 ? (
        <Card>
          <EmptyState icon={<CardIcon />} title="Nenhum cartão cadastrado" description="Adicione seus cartões de crédito para acompanhar faturas e limites." action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setModal({ open: true })}>+ Adicionar cartão</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    skipCardStep('card', true);
                    toast.info('Tudo bem! Você pode adicionar um cartão quando quiser.');
                    navigate('/app');
                  }}
                >
                  Não tenho / agora não
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Limite total', value: totalLimit },
              { label: 'Utilizado', value: totalUsed },
              { label: 'Disponível', value: totalLimit - totalUsed },
            ].map((k) => (
              <div key={k.label} className="card px-4 py-3">
                <p className="text-xs text-fg-subtle">{k.label}</p>
                <p className="tabular mt-0.5 truncate font-semibold sm:text-lg">{money(k.value)}</p>
              </div>
            ))}
          </div>

          <div data-tour="cards-list" className="no-scrollbar -mx-4 mb-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
            {summaries.map((s) => (
              <button
                key={s.card.id}
                onClick={() => setSelectedId(s.card.id)}
                aria-pressed={selected?.card.id === s.card.id}
                className={cn('w-[85%] shrink-0 snap-center rounded-[20px] p-1 text-left transition-colors sm:w-auto', selected?.card.id === s.card.id ? 'bg-primary-soft ring-1 ring-primary' : 'hover:bg-surface-2')}
              >
                <CreditCardVisual card={s.card} />
                <div className="px-2 pt-3 pb-1">
                  <div className="flex justify-between text-xs text-fg-subtle">
                    <span>Usado {money(s.used, { compact: true })}</span>
                    <span>Disponível {money(s.available, { compact: true })}</span>
                  </div>
                  <Progress value={s.usagePct} size="sm" className="mt-1.5" color={s.usagePct > 80 ? 'var(--danger)' : 'var(--primary)'} label={`Limite utilizado de ${s.card.name}`} />
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader
                  title={selected.card.name}
                  description={`${selected.card.brand.toUpperCase()} •••• ${selected.card.last4}`}
                  action={
                    <Dropdown
                      label="Ações do cartão"
                      trigger={(p) => <Button variant="ghost" size="icon-sm" aria-label="Ações do cartão" {...p}><MoreHorizontal className="size-4" /></Button>}
                      items={[
                        { label: 'Editar cartão', icon: <Pencil />, onSelect: () => setModal({ open: true, card: selected.card }) },
                        { label: 'Excluir cartão', icon: <Trash2 />, danger: true, onSelect: () => setConfirm(selected.card) },
                      ]}
                    />
                  }
                />
                <CardBody>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['Limite', money(selected.card.limit)],
                      ['Disponível', money(selected.available)],
                      ['Fatura atual', money(selected.current?.total ?? 0)],
                      ['Fechamento', `Dia ${selected.card.closingDay}`],
                      ['Vencimento', `Dia ${selected.card.dueDay}`],
                      ['Melhor dia de compra', `Dia ${selected.card.closingDay}`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-surface-2/70 p-3">
                        <dt className="text-xs text-fg-subtle">{k}</dt>
                        <dd className="tabular mt-0.5 font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {pending && (
                    <div className={cn('mt-4 rounded-xl border p-3 text-sm', pending.status === 'overdue' ? 'border-danger/30 bg-danger-soft' : 'border-border bg-surface-2/70')}>
                      <p className="flex items-center gap-2 font-medium">
                        <CalendarClock className="size-4" aria-hidden />
                        Fatura de {formatMonthLong(pending.month).toLowerCase()} {pending.status === 'overdue' ? 'atrasada' : 'fechada'}
                      </p>
                      <p className="mt-1 text-fg-muted">
                        {money(pending.total - pending.paid)} · vence em {formatDate(pending.dueDate)}
                      </p>
                    </div>
                  )}
                  <div data-tour="card-actions" className="mt-4 grid grid-cols-2 gap-2">
                    <Button variant="secondary" leftIcon={<ShoppingCart className="size-4" />} onClick={() => openTx({ type: 'expense', defaults: { cardId: selected.card.id, method: 'credit' } })}>
                      Adicionar compra
                    </Button>
                    <Button
                      leftIcon={<Wallet className="size-4" />}
                      disabled={!pending && !(selected.current && selected.current.total - selected.current.paid > 0)}
                      onClick={() => {
                        const inv = pending ?? selected.current;
                        if (inv) setPay({ summary: selected, invoice: inv });
                      }}
                    >
                      Pagar fatura
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card data-tour="invoice" className="lg:col-span-2">
                <CardHeader
                  title="Fatura"
                  icon={<Receipt />}
                  description={viewed ? `${formatDate(viewed.periodStart)} a ${formatDate(viewed.periodEnd)} · vence ${formatDate(viewed.dueDate)}` : 'Sem fatura neste período'}
                  action={
                    <Segmented
                      size="sm"
                      label="Fatura"
                      value={view}
                      onChange={setView}
                      options={[
                        { value: 'previous', label: 'Anterior' },
                        { value: 'current', label: 'Atual' },
                        { value: 'next', label: 'Próxima' },
                      ]}
                    />
                  }
                />
                <CardBody>
                  {viewed ? (
                    <>
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <p className="tabular font-display text-3xl font-semibold tracking-tight">{money(viewed.total)}</p>
                        <Badge tone={INVOICE_STATUS[viewed.status].tone}>
                          <span aria-hidden>{INVOICE_STATUS[viewed.status].emoji}</span> {INVOICE_STATUS[viewed.status].label}
                        </Badge>
                        {viewed.paid > 0 && <span className="text-xs text-fg-subtle">Pago: {money(viewed.paid)}</span>}
                      </div>
                      {viewed.transactions.length ? (
                        <ul className="divide-y divide-border">
                          {viewed.transactions.map((t) => {
                            const cat = t.categoryId ? lookups.category.get(t.categoryId) : undefined;
                            return (
                              <li key={t.id}>
                                <button className="flex w-full items-center gap-3 py-2.5 text-left" onClick={() => openTx({ type: t.type, editing: t })}>
                                  <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                      {t.description}
                                      {t.installment && <span className="ml-1.5 text-xs text-fg-subtle">{t.installment.current}/{t.installment.total}</span>}
                                    </p>
                                    <p className="text-xs text-fg-subtle">{formatDate(t.date)} · {cat?.name}</p>
                                  </div>
                                  <span className="tabular text-sm font-semibold">{money(t.amount)}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="py-8 text-center text-sm text-fg-subtle">Nenhuma compra nesta fatura.</p>
                      )}
                    </>
                  ) : (
                    <p className="py-8 text-center text-sm text-fg-subtle">Não há fatura {view === 'previous' ? 'anterior' : 'futura'} registrada.</p>
                  )}
                </CardBody>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader title="Histórico de faturas" />
                <CardBody className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-fg-subtle">
                        <th className="pb-2 font-medium">Mês</th>
                        <th className="pb-2 font-medium">Fechamento</th>
                        <th className="pb-2 font-medium">Vencimento</th>
                        <th className="pb-2 text-right font-medium">Total</th>
                        <th className="pb-2 text-right font-medium">Pago</th>
                        <th className="pb-2 pl-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...selected.invoices].reverse().filter((i) => i.dueDate <= today() || i.status !== 'future').slice(0, 12).map((i) => (
                        <tr key={i.id}>
                          <td className="py-2.5 font-medium">{formatMonthLong(i.month)}</td>
                          <td className="py-2.5 text-fg-muted">{formatDate(i.periodEnd)}</td>
                          <td className="py-2.5 text-fg-muted">{formatDate(i.dueDate)}</td>
                          <td className="tabular py-2.5 text-right font-semibold">{money(i.total)}</td>
                          <td className="tabular py-2.5 text-right text-fg-muted">{money(i.paid)}</td>
                          <td className="py-2.5 pl-4"><Badge tone={INVOICE_STATUS[i.status].tone}><span aria-hidden>{INVOICE_STATUS[i.status].emoji}</span> {INVOICE_STATUS[i.status].label}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </div>
          )}
        </>
      )}

      <CardModal open={modal.open} card={modal.card} onClose={() => setModal({ open: false })} />
      <PayInvoiceModal summary={pay?.summary ?? null} invoice={pay?.invoice ?? null} onClose={() => setPay(null)} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Excluir cartão?"
        description="As compras registradas continuarão no histórico, mas sem cartão vinculado."
        confirmLabel="Excluir"
        onConfirm={() => {
          if (confirm) remove('cards', confirm.id);
          setSelectedId(null);
          toast.success('Cartão excluído');
        }}
      />
    </div>
  );
}
