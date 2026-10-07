/**
 * Modelo de domínio da Nexora.
 * Espelha as tabelas descritas em `supabase/schema.sql` — os nomes em camelCase
 * aqui correspondem às colunas snake_case do banco.
 */

export type ID = string;
/** Data ISO `YYYY-MM-DD` (sem fuso — datas financeiras são locais). */
export type ISODate = string;
/** Timestamp ISO completo. */
export type ISODateTime = string;

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP';
export type ThemeMode = 'dark' | 'light' | 'system';
export type Language = 'pt-BR' | 'en-US' | 'es-ES';

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: 'free' | 'pro' | 'business';
  createdAt: ISODateTime;
  onboarded: boolean;
  provider: 'password' | 'google' | 'apple' | 'demo';
}

export type AccountType = 'checking' | 'savings' | 'wallet' | 'digital' | 'investment' | 'cash';

export interface Account {
  id: ID;
  name: string;
  institution: string;
  type: AccountType;
  initialBalance: number;
  color: string;
  archived?: boolean;
  createdAt: ISODateTime;
}

export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: ID;
  name: string;
  /** Nome do ícone Lucide (ver `lib/icons.ts`). */
  icon: string;
  color: string;
  kind: CategoryKind;
  monthlyLimit?: number;
  /** Natureza do gasto — usada na DRE (custos fixos × despesas variáveis). */
  nature?: 'fixed' | 'variable';
  system?: boolean;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'paid' | 'pending' | 'scheduled';
export type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash' | 'boleto' | 'transfer' | 'auto_debit';
export type Recurrence = 'none' | 'weekly' | 'monthly' | 'yearly';

export interface Attachment {
  name: string;
  size: number;
  type: string;
  /** data URL (modo local). No backend, seria um caminho no storage. */
  dataUrl?: string;
}

export interface Transaction {
  id: ID;
  type: TransactionType;
  amount: number; // sempre positivo
  description: string;
  categoryId?: ID; // ausente em transferências
  date: ISODate;
  /** Conta de origem (despesa/transferência) ou destino (receita). Ausente em compras no cartão. */
  accountId?: ID;
  /** Compra no cartão de crédito. */
  cardId?: ID;
  /** Transferência: conta de destino. */
  toAccountId?: ID;
  /** Transferência: pagamento de fatura deste cartão. */
  toCardId?: ID;
  method: PaymentMethod;
  status: TransactionStatus;
  tags: string[];
  recurrence: Recurrence;
  installment?: { current: number; total: number; groupId: string };
  /** Pagamento de fatura: id da fatura (`cardId:YYYY-MM`). */
  invoiceId?: string;
  notes?: string;
  attachment?: Attachment;
  createdAt: ISODateTime;
}

export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard';

export interface CreditCard {
  id: ID;
  name: string;
  institution: string;
  brand: CardBrand;
  last4: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  /** Conta padrão para pagamento da fatura. */
  paymentAccountId?: ID;
  /** Gradiente visual do cartão. */
  theme: 'violet' | 'graphite' | 'ocean' | 'emerald' | 'sunset' | 'gold';
  createdAt: ISODateTime;
}

export type InvoiceStatus = 'paid' | 'open' | 'closed' | 'overdue' | 'future';

/** Fatura derivada das compras do cartão (não é persistida no modo local). */
export interface Invoice {
  id: string; // `${cardId}:${YYYY-MM}`
  cardId: ID;
  /** Mês de referência do vencimento `YYYY-MM`. */
  month: string;
  periodStart: ISODate;
  periodEnd: ISODate; // data de fechamento
  dueDate: ISODate;
  total: number;
  paid: number;
  status: InvoiceStatus;
  transactions: Transaction[];
}

export interface Budget {
  id: ID;
  categoryId: ID;
  amount: number;
  /** `YYYY-MM` ou `recurring` para todos os meses. */
  period: 'recurring' | string;
}

export interface GoalContribution {
  id: ID;
  date: ISODate;
  amount: number;
}

export interface Goal {
  id: ID;
  name: string;
  target: number;
  deadline?: ISODate;
  icon: string;
  color: string;
  contributions: GoalContribution[];
  initialAmount: number;
  createdAt: ISODateTime;
}

export type DebtStatus = 'active' | 'paid' | 'late' | 'negotiating';

export interface Debt {
  id: ID;
  name: string;
  creditor: string;
  total: number;
  remaining: number;
  /** Juros ao mês, em %. */
  interestRate: number;
  installments: number;
  installmentsPaid: number;
  installmentAmount: number;
  dueDay: number;
  status: DebtStatus;
  createdAt: ISODateTime;
}

export type InvestmentType = 'fixed_income' | 'stocks' | 'reits' | 'etfs' | 'crypto' | 'funds' | 'pension';

export interface Investment {
  id: ID;
  name: string;
  ticker?: string;
  type: InvestmentType;
  institution: string;
  invested: number;
  currentValue: number;
  /** Proventos/dividendos recebidos (acumulado). */
  dividends: number;
  /** Histórico mensal do valor de mercado (`YYYY-MM` → valor). */
  history: { month: string; value: number }[];
  createdAt: ISODateTime;
}

export type BillingCycle = 'monthly' | 'yearly';

export interface Subscription {
  id: ID;
  name: string;
  amount: number;
  cycle: BillingCycle;
  billingDay: number;
  /** Mês da cobrança anual (1-12). */
  billingMonth?: number;
  categoryId?: ID;
  cardId?: ID;
  accountId?: ID;
  color: string;
  active: boolean;
  createdAt: ISODateTime;
}

export type NotificationKind =
  | 'bill_due'
  | 'invoice_due'
  | 'invoice_overdue'
  | 'goal_reached'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'new_transaction'
  | 'new_login'
  | 'security'
  | 'system';

export interface AppNotification {
  id: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: ISODateTime;
  read: boolean;
  href?: string;
  /** Chave de deduplicação para alertas gerados por regras. */
  dedupeKey?: string;
}

export interface Reminder {
  id: ID;
  title: string;
  date: ISODate;
  amount?: number;
  done: boolean;
}

export interface DeviceSession {
  id: ID;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: ISODateTime;
  current: boolean;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  billDue: boolean;
  invoices: boolean;
  goals: boolean;
  budgets: boolean;
  transactions: boolean;
  security: boolean;
}

export interface Settings {
  theme: ThemeMode;
  currency: CurrencyCode;
  language: Language;
  hideValues: boolean;
  notifications: NotificationPreferences;
  reducedMotion: 'system' | 'on' | 'off';
}

export type FinancialObjective =
  | 'organize'
  | 'save'
  | 'debt_free'
  | 'invest'
  | 'emergency_fund'
  | 'purchase'
  | 'business';

export interface OnboardingProfile {
  objective: FinancialObjective;
  monthlyIncome: number;
  monthlyExpenses: number;
  accountsCount: number;
  cardsCount: number;
  goals: string[];
  completedAt: ISODateTime;
}

export interface FinanceData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  cards: CreditCard[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  investments: Investment[];
  subscriptions: Subscription[];
  reminders: Reminder[];
}
