-- =============================================================================
-- Nexora Finance — configuração do Supabase (cole tudo no SQL Editor e rode uma vez)
-- Seguro para rodar de novo: usa "if not exists" / "or replace".
-- =============================================================================

-- Perfil público de cada usuário (1:1 com auth.users) -------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  avatar_url text,
  onboarded boolean not null default false,
  -- Plano: só o servidor (webhook de pagamento) altera. Ver trigger abaixo.
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  plan_status text,            -- authorized | paused | cancelled | pending (Mercado Pago)
  plan_renews_at timestamptz,
  billing_customer text,       -- id da assinatura no provedor de pagamento
  founder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "perfil: ler o próprio" on public.profiles;
create policy "perfil: ler o próprio" on public.profiles for select using (id = auth.uid());
drop policy if exists "perfil: editar o próprio" on public.profiles;
create policy "perfil: editar o próprio" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Impede que o próprio usuário se dê o plano Pro pelo navegador.
create or replace function public.protect_billing_columns() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.plan := old.plan;
    new.plan_status := old.plan_status;
    new.plan_renews_at := old.plan_renews_at;
    new.billing_customer := old.billing_customer;
    new.founder := old.founder;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_protect_billing on public.profiles;
create trigger profiles_protect_billing before update on public.profiles
  for each row execute function public.protect_billing_columns();

-- Cria o perfil automaticamente no cadastro.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dados financeiros do usuário (um documento JSON por usuário) -----------------
create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces enable row level security;
drop policy if exists "workspace: dono" on public.user_workspaces;
create policy "workspace: dono" on public.user_workspaces for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Excluir a própria conta (LGPD — direito de exclusão) ------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  delete from auth.users where id = auth.uid();  -- perfil e dados caem em cascata
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Lista de espera / beta de fundadores (formulário da página inicial) ---------
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  contact text not null check (char_length(contact) between 5 and 120),
  source text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
drop policy if exists "waitlist: qualquer um entra" on public.waitlist;
create policy "waitlist: qualquer um entra" on public.waitlist for insert to anon, authenticated with check (true);
-- (sem política de leitura: só você vê, pelo painel do Supabase)
