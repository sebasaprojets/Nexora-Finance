import { memo } from 'react';
import { ArrowLeftRight, CreditCard, Landmark, Paperclip, Repeat } from 'lucide-react';
import type { Account, Category, CreditCard as Card, Transaction } from '@/types';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { cn } from '@/lib/cn';
import { formatRelativeDay } from '@/lib/dates';
import { useMoney } from '@/hooks/useMoney';

export const TransactionRow = memo(function TransactionRow({
  tx,
  category,
  account,
  card,
  toAccount,
  onClick,
}: {
  tx: Transaction;
  category?: Category;
  account?: Account;
  card?: Card;
  toAccount?: Account;
  onClick?: () => void;
}) {
  const money = useMoney();
  const isTransfer = tx.type === 'transfer';
  const source = card ? `${card.name}` : account?.name;
  const sub = isTransfer ? `${account?.name ?? '—'} → ${toAccount?.name ?? (tx.toCardId ? 'Fatura do cartão' : 'Investimentos')}` : `${category?.name ?? 'Sem categoria'} · ${source ?? '—'}`;
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2">
      {isTransfer ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--series-net)_16%,transparent)] text-[var(--series-net)]" aria-hidden>
          <ArrowLeftRight className="size-4" />
        </span>
      ) : (
        <CategoryIcon icon={category?.icon} color={category?.color} />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{tx.description}</span>
          {tx.installment && <span className="shrink-0 text-xs text-fg-subtle">{tx.installment.current}/{tx.installment.total}</span>}
          {tx.recurrence !== 'none' && <Repeat className="size-3 shrink-0 text-fg-subtle" aria-label="Recorrente" />}
          {tx.attachment && <Paperclip className="size-3 shrink-0 text-fg-subtle" aria-label="Com anexo" />}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-fg-subtle">
          {card ? <CreditCard className="size-3 shrink-0" aria-hidden /> : !isTransfer && <Landmark className="size-3 shrink-0" aria-hidden />}
          <span className="truncate">{sub}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('tabular text-sm font-semibold', tx.type === 'income' ? 'text-income' : tx.type === 'transfer' ? 'text-fg-muted' : 'text-fg')}>
          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
          {money(tx.amount)}
        </p>
        <p className="text-xs text-fg-subtle">{formatRelativeDay(tx.date)}{tx.status !== 'paid' && ` · ${tx.status === 'pending' ? 'pendente' : 'agendado'}`}</p>
      </div>
    </button>
  );
});
