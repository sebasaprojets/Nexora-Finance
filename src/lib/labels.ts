import type { PaymentMethod, TransactionStatus, TransactionType } from '@/types';

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  debit: 'Débito',
  credit: 'Crédito',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  transfer: 'Transferência',
  auto_debit: 'Débito automático',
};

export const STATUS_LABELS: Record<TransactionStatus, string> = { paid: 'Efetivada', pending: 'Pendente', scheduled: 'Agendada' };

export const TYPE_LABELS: Record<TransactionType, string> = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' };
