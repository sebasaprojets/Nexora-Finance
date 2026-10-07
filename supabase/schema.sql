-- =====================================================================
-- NEXORA FINANCE — Esquema do banco (PostgreSQL / Supabase)
-- Valores monetários em numeric(14,2). Todas as tabelas têm RLS:
-- cada usuário só acessa as próprias linhas (auth.uid()).
-- =====================================================================

create extension if not exists "pgcrypto";

-- Usuários (perfil complementar a auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  email text not null unique,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free','pro','business')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  currency char(3) not null default 'BRL' check (currency in ('BRL','USD','EUR','GBP')),
  language text not null default 'pt-BR',
  hide_values boolean not null default false,
  notifications jsonb not null default '{}'::jsonb,
  onboarding jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  institution text,
  type text not null check (type in ('checking','savings','wallet','digital','investment','cash')),
  initial_balance numeric(14,2) not null default 0,
  color text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  icon text not null default 'circle-help',
  color text not null,
  kind text not null check (kind in ('income','expense')),
  nature text check (nature in ('fixed','variable')),
  monthly_limit numeric(14,2) check (monthly_limit >= 0),
  is_system boolean not null default false
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  institution text not null,
  brand text not null check (brand in ('visa','mastercard','elo','amex','hipercard')),
  last4 char(4) not null check (last4 ~ '^[0-9]{4}$'), -- nunca o número completo
  credit_limit numeric(14,2) not null check (credit_limit >= 0),
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  payment_account_id uuid references public.accounts(id) on delete set null,
  theme text not null default 'violet',
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null check (amount > 0),
  description text not null check (char_length(description) <= 120),
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  account_id uuid references public.accounts(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  to_card_id uuid references public.cards(id) on delete set null,
  invoice_id text, -- '<card_id>:YYYY-MM' para pagamentos de fatura
  method text not null,
  status text not null default 'paid' check (status in ('paid','pending','scheduled')),
  tags text[] not null default '{}',
  recurrence text not null default 'none' check (recurrence in ('none','weekly','monthly','yearly')),
  installment_group uuid,
  installment_current smallint,
  installment_total smallint,
  notes text,
  attachment_path text, -- caminho no Storage (bucket privado "attachments")
  created_at timestamptz not null default now(),
  constraint transfer_has_destination check (type <> 'transfer' or to_account_id is not null or to_card_id is not null or 'investimento' = any(tags))
);
create index if not exists transactions_user_date on public.transactions(user_id, date desc);
create index if not exists transactions_user_category on public.transactions(user_id, category_id);
create index if not exists transactions_card on public.transactions(card_id) where card_id is not null;

-- Faturas: derivadas das compras (ver lib/finance.ts → cardInvoices). Materializadas
-- aqui para relatórios e notificações agendadas no servidor.
create table if not exists public.invoices (
  id text primary key, -- '<card_id>:YYYY-MM'
  user_id uuid not null references public.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  month char(7) not null,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  status text not null check (status in ('paid','open','closed','overdue','future'))
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  period text not null default 'recurring' -- 'recurring' ou 'YYYY-MM'
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  target numeric(14,2) not null check (target > 0),
  initial_amount numeric(14,2) not null default 0,
  deadline date,
  icon text, color text,
  created_at timestamptz not null default now()
);
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  amount numeric(14,2) not null
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null, creditor text,
  total numeric(14,2) not null, remaining numeric(14,2) not null,
  interest_rate numeric(6,3) not null default 0, -- % ao mês
  installments smallint not null, installments_paid smallint not null default 0,
  installment_amount numeric(14,2) not null,
  due_day smallint not null check (due_day between 1 and 31),
  status text not null default 'active' check (status in ('active','paid','late','negotiating')),
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null, ticker text,
  type text not null check (type in ('fixed_income','stocks','reits','etfs','crypto','funds','pension')),
  institution text,
  invested numeric(14,2) not null, current_value numeric(14,2) not null,
  dividends numeric(14,2) not null default 0,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null, amount numeric(14,2) not null,
  cycle text not null check (cycle in ('monthly','yearly')),
  billing_day smallint not null, billing_month smallint,
  category_id uuid references public.categories(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  color text, active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null, title text not null, body text not null,
  href text, dedupe_key text, read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null,
  user_agent text, created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  device text, browser text, os text, location text, ip inet,
  last_active timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.financial_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null, period_from date not null, period_to date not null,
  format text not null check (format in ('pdf','xlsx','csv')),
  file_path text, created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security: cada usuário vê e altera apenas os próprios dados
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['settings','accounts','categories','cards','transactions','invoices','budgets','goals',
    'goal_contributions','debts','investments','subscriptions','notifications','push_subscriptions','sessions','financial_reports']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table public.users enable row level security;
drop policy if exists self on public.users;
create policy self on public.users for all using (id = auth.uid()) with check (id = auth.uid());
