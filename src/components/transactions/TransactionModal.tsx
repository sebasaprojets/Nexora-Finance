import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Lightbulb, Paperclip, Repeat2, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react';
import { suggestCategory } from '@/lib/categorize';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { cn } from '@/lib/cn';
import { addDays, today } from '@/lib/dates';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { uid } from '@/lib/id';
import { useUI } from '@/store/ui';
import { useFinance } from '@/store/finance';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/toast';
import { notifyUser } from '@/services/notifications';
import type { Attachment, PaymentMethod, TransactionType } from '@/types';

const schema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    amount: z.string().refine((v) => parseMoneyInput(v) > 0, 'Informe um valor maior que zero'),
    description: z.string().max(120, 'Máximo de 120 caracteres'),
    categoryId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    source: z.string().min(1, 'Selecione a conta'),
    toAccountId: z.string().optional(),
    method: z.string(),
    status: z.enum(['paid', 'pending', 'scheduled']),
    recurrence: z.enum(['none', 'weekly', 'monthly', 'yearly']),
    installments: z.number().int().min(1).max(48),
    tags: z.string().max(200),
    notes: z.string().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.type !== 'transfer' && !v.categoryId) ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Escolha uma categoria' });
    if (v.type === 'transfer') {
      if (!v.toAccountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Escolha a conta de destino' });
      else if (`acc:${v.toAccountId}` === v.source) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Origem e destino devem ser diferentes' });
      if (v.source.startsWith('card:')) ctx.addIssue({ code: 'custom', path: ['source'], message: 'Transferências saem de uma conta' });
    }
  });

type FormValues = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: 'expense' as const, label: 'Despesa', icon: <TrendingDown /> },
  { value: 'income' as const, label: 'Receita', icon: <TrendingUp /> },
  { value: 'transfer' as const, label: 'Transferência', icon: <Repeat2 /> },
];

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'auto_debit', label: 'Débito automático' },
];

const MAX_ATTACHMENT = 1.5 * 1024 * 1024;

export function TransactionModal() {
  const draft = useUI((s) => s.txModal);
  const close = useUI((s) => s.closeTransaction);
  const { accounts, cards, categories, transactions, addTransaction, updateTransaction, deleteTransactions, upsert } = useFinance();
  const firstOfType = (t: TransactionType) => !transactions.some((x) => x.type === t);
  const currency = useSettings((s) => s.currency);
  const [more, setMore] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [autoCategory, setAutoCategory] = useState(false);
  const categoryTouched = useRef(false);
  const editing = draft?.editing;

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);

  const defaults = useMemo<FormValues>(() => {
    const t = editing ?? draft?.defaults;
    const type = (editing?.type ?? draft?.type ?? 'expense') as TransactionType;
    const source = t?.cardId ? `card:${t.cardId}` : t?.accountId ? `acc:${t.accountId}` : activeAccounts[0] ? `acc:${activeAccounts[0].id}` : '';
    return {
      type,
      amount: t?.amount ? formatMoney(t.amount, { currency }).replace(/[^\d,.]/g, '') : '',
      description: t?.description ?? '',
      categoryId: t?.categoryId,
      date: t?.date ?? today(),
      source,
      toAccountId: t?.toAccountId ?? activeAccounts.find((a) => `acc:${a.id}` !== source)?.id,
      method: t?.method ?? (source.startsWith('card:') ? 'credit' : 'pix'),
      status: t?.status ?? 'paid',
      recurrence: t?.recurrence ?? 'none',
      installments: 1,
      tags: t?.tags?.join(', ') ?? '',
      notes: t?.notes ?? '',
    };
  }, [draft, editing, activeAccounts, currency]);

  const { register, handleSubmit, control, watch, setValue, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (draft) {
      reset(defaults);
      setAutoCategory(false);
      categoryTouched.current = !!(editing ?? draft.defaults?.categoryId);
      setMore(!!editing && (editing.tags.length > 0 || !!editing.notes || editing.recurrence !== 'none'));
      setAttachment(editing?.attachment);
    }
  }, [draft, defaults, reset, editing]);

  const type = watch('type');
  const source = watch('source');
  const date = watch('date');
  const categoryId = watch('categoryId');
  const amountRaw = watch('amount');
  const description = watch('description');

  // Categoria sugerida pela descrição (histórico do usuário + palavras-chave), até o usuário escolher uma.
  useEffect(() => {
    if (!draft || categoryTouched.current || type === 'transfer') return;
    const s = suggestCategory(description ?? '', type === 'income' ? 'income' : 'expense', categories, transactions);
    if (s && s.id !== categoryId) {
      setValue('categoryId', s.id, { shouldValidate: formState.isSubmitted });
      setAutoCategory(true);
    }
  }, [description, type, draft, categories, transactions, categoryId, setValue, formState.isSubmitted]);
  const isCard = source?.startsWith('card:');
  const typeCategories = categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'));

  useEffect(() => {
    if (isCard) setValue('method', 'credit');
    else if (watch('method') === 'credit') setValue('method', 'pix');
  }, [isCard, setValue, watch]);

  useEffect(() => {
    if (type === 'income' && source?.startsWith('card:') && activeAccounts[0]) setValue('source', `acc:${activeAccounts[0].id}`);
    if (categoryId && !typeCategories.some((c) => c.id === categoryId)) setValue('categoryId', undefined);
  }, [type, source, activeAccounts, setValue, categoryId, typeCategories]);

  const onFile = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT) {
      toast.error('Arquivo muito grande', { description: 'O limite é 1,5 MB no modo local.' });
      return;
    }
    if (!/^(image\/|application\/pdf)/.test(file.type)) {
      toast.error('Formato não suportado', { description: 'Envie uma imagem ou PDF.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, size: file.size, type: file.type, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const onSubmit = (v: FormValues) => {
    const amount = parseMoneyInput(v.amount);
    const [kind, id] = v.source.split(':');
    const cat = categories.find((c) => c.id === v.categoryId);
    const base = {
      type: v.type,
      amount,
      description: v.description.trim() || cat?.name || (v.type === 'transfer' ? 'Transferência' : 'Sem descrição'),
      categoryId: v.type === 'transfer' ? undefined : v.categoryId,
      date: v.date,
      accountId: kind === 'acc' ? id : undefined,
      cardId: kind === 'card' && v.type === 'expense' ? id : undefined,
      toAccountId: v.type === 'transfer' ? v.toAccountId : undefined,
      method: v.method as PaymentMethod,
      status: v.status,
      recurrence: v.recurrence,
      tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: v.notes || undefined,
      attachment,
    };
    if (editing) {
      updateTransaction(editing.id, base);
      toast.success('Transação atualizada');
    } else {
      const created = addTransaction({ ...base, installments: kind === 'card' ? v.installments : 1 });
      toast.success(v.type === 'income' ? 'Receita adicionada' : v.type === 'expense' ? 'Despesa adicionada' : 'Transferência realizada', {
        description: `${formatMoney(amount, { currency })} · ${base.description}${created.length > 1 ? ` · ${created.length}x` : ''}`,
        action: { label: 'Desfazer', onClick: () => deleteTransactions(created.map((t) => t.id)) },
      });
      notifyUser({
        kind: 'new_transaction',
        title: v.type === 'income' ? 'Nova receita registrada' : v.type === 'expense' ? 'Nova despesa registrada' : 'Transferência registrada',
        body: `${base.description} · ${formatMoney(amount, { currency })}`,
        href: '/app/transacoes',
      });
    }
    close();
  };

  const createWallet = () =>
    upsert('accounts', { id: uid('acc'), name: 'Carteira', institution: 'Dinheiro físico', type: 'cash', initialBalance: 0, color: '#1baf7a', createdAt: new Date().toISOString() });

  const title = editing ? 'Editar transação' : type === 'income' ? 'Nova receita' : type === 'transfer' ? 'Nova transferência' : 'Nova despesa';
  const preview = parseMoneyInput(amountRaw ?? '');

  return (
    <Modal
      open={!!draft}
      onClose={close}
      title={title}
      size="md"
      footer={
        activeAccounts.length > 0 && (
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form="tx-form" className="min-w-28">
              Salvar
            </Button>
          </>
        )
      }
    >
      {activeAccounts.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-fg-muted">Para lançar transações, você precisa de ao menos uma conta.</p>
          <Button className="mt-4" onClick={createWallet}>
            Criar conta “Carteira”
          </Button>
        </div>
      ) : (
        <form id="tx-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {!editing && (
            <Controller
              control={control}
              name="type"
              render={({ field }) => <Segmented label="Tipo de transação" value={field.value} onChange={field.onChange} options={TYPE_OPTIONS} className="w-full [&>button]:flex-1 [&>button]:justify-center" />}
            />
          )}

          {!editing && type !== 'transfer' && firstOfType(type) && (
            <div role="note" className="flex gap-2.5 rounded-xl border border-primary/30 bg-primary-soft px-3.5 py-3 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p className="text-fg-muted">
                {type === 'income' ? (
                  <>
                    <strong className="text-fg">Sua primeira receita.</strong> Comece pelo salário: informe o valor, escolha “Salário”, a data do pagamento e a conta onde cai. Em <em>Mais detalhes</em>, marque “Mensal” para lembrar todo mês.
                  </>
                ) : (
                  <>
                    <strong className="text-fg">Sua primeira despesa.</strong> Comece pelas contas fixas (aluguel, luz, internet). Informe o valor, a categoria e de onde saiu o dinheiro — conta ou cartão.
                  </>
                )}
              </p>
            </div>
          )}

          <Field label="Valor" error={formState.errors.amount?.message} required>
            {(p) => (
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-xl text-fg-subtle">
                  {formatMoney(0, { currency }).replace(/[\d.,\s]/g, '')}
                </span>
                <input
                  {...p}
                  {...register('amount')}
                  data-autofocus
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  className={cn(
                    'tabular h-16 w-full rounded-2xl border border-border bg-surface-2/60 pr-4 pl-14 font-display text-3xl font-semibold outline-none focus:border-primary focus:shadow-[var(--ring)]',
                    type === 'income' ? 'text-income' : type === 'expense' ? 'text-fg' : 'text-net',
                  )}
                />
              </div>
            )}
          </Field>

          {type !== 'transfer' && (
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-fg-muted">
                Categoria<span className="ml-0.5 text-danger" aria-hidden>*</span>
                {autoCategory && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"><Sparkles className="size-3" aria-hidden /> Sugerida pela descrição</span>}
              </legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {typeCategories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    aria-pressed={categoryId === c.id}
                    onClick={() => {
                      categoryTouched.current = true;
                      setAutoCategory(false);
                      setValue('categoryId', c.id, { shouldValidate: true });
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all',
                      categoryId === c.id ? 'border-primary bg-primary-soft text-fg' : 'border-border text-fg-muted hover:border-border-strong hover:bg-surface-2',
                    )}
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <span className="w-full truncate">{c.name}</span>
                  </button>
                ))}
              </div>
              {formState.errors.categoryId && (
                <p role="alert" className="mt-1.5 text-xs text-danger">
                  {formState.errors.categoryId.message}
                </p>
              )}
            </fieldset>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium text-fg-muted">Data</p>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Hoje', value: today() },
                { label: 'Ontem', value: addDays(today(), -1) },
              ].map((d) => (
                <button
                  key={d.label}
                  type="button"
                  aria-pressed={date === d.value}
                  onClick={() => setValue('date', d.value)}
                  className={cn(
                    'h-9 rounded-lg border px-3.5 text-sm font-medium transition-colors',
                    date === d.value ? 'border-primary bg-primary-soft text-fg' : 'border-border text-fg-muted hover:bg-surface-2',
                  )}
                >
                  {d.label}
                </button>
              ))}
              <input type="date" aria-label="Escolher data" {...register('date')} className="h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm text-fg outline-none focus:border-primary" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={type === 'income' ? 'Recebido em' : type === 'transfer' ? 'De' : 'Pago com'} error={formState.errors.source?.message}>
              {(p) => (
                <Select {...p} {...register('source')}>
                  <optgroup label="Contas">
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={`acc:${a.id}`}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                  {type === 'expense' && cards.length > 0 && (
                    <optgroup label="Cartões de crédito">
                      {cards.map((c) => (
                        <option key={c.id} value={`card:${c.id}`}>
                          {c.name} •••• {c.last4}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              )}
            </Field>
            {type === 'transfer' ? (
              <Field label="Para" error={formState.errors.toAccountId?.message}>
                {(p) => (
                  <Select {...p} {...register('toAccountId')}>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : isCard && !editing ? (
              <Field label="Parcelas">
                {(p) => (
                  <Select {...p} {...register('installments', { valueAsNumber: true })}>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? 'À vista' : `${n}x de ${formatMoney((preview || 0) / n, { currency })}`}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : (
              <Field label="Método">
                {(p) => (
                  <Select {...p} {...register('method')}>
                    {METHODS.filter((m) => m.value !== 'credit').map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </div>

          <Field label="Descrição" error={formState.errors.description?.message}>
            {(p) => <Input {...p} {...register('description')} placeholder="Ex.: Mercado, Uber, Salário…" autoComplete="off" />}
          </Field>

          <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1.5 text-sm font-medium text-primary" aria-expanded={more}>
            <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} aria-hidden />
            {more ? 'Menos detalhes' : 'Mais detalhes'}
          </button>

          <AnimatePresence initial={false}>
            {more && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid gap-4 pt-1 sm:grid-cols-2">
                  <Field label="Recorrência">
                    {(p) => (
                      <Select {...p} {...register('recurrence')}>
                        <option value="none">Não se repete</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                        <option value="yearly">Anual</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="Status">
                    {(p) => (
                      <Select {...p} {...register('status')}>
                        <option value="paid">{type === 'income' ? 'Recebido' : 'Pago'}</option>
                        <option value="pending">Pendente</option>
                        <option value="scheduled">Agendado</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="Tags" hint="Separe por vírgula" className="sm:col-span-2">
                    {(p) => <Input {...p} {...register('tags')} placeholder="viagem, trabalho" />}
                  </Field>
                  <Field label="Observações" className="sm:col-span-2">
                    {(p) => <Textarea {...p} {...register('notes')} rows={2} />}
                  </Field>
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-[13px] font-medium text-fg-muted">Anexo (comprovante)</p>
                    {attachment ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-sm">
                        <Paperclip className="size-4 text-fg-subtle" aria-hidden />
                        <span className="flex-1 truncate">{attachment.name}</span>
                        <button type="button" onClick={() => setAttachment(undefined)} aria-label="Remover anexo" className="text-fg-subtle hover:text-danger">
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong px-3 py-4 text-sm text-fg-subtle hover:bg-surface-2">
                        <Paperclip className="size-4" aria-hidden /> Adicionar imagem ou PDF
                        <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                      </label>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      )}
    </Modal>
  );
}
