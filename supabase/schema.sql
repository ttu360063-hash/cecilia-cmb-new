-- Run this script in Supabase SQL Editor

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists payment_methods_set_updated_at on public.payment_methods;
create trigger payment_methods_set_updated_at
before update on public.payment_methods
for each row execute function public.set_updated_at();

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.customers enable row level security;
alter table public.payment_methods enable row level security;
alter table public.expenses enable row level security;

drop policy if exists allow_anon_all_products on public.products;
create policy allow_anon_all_products on public.products
for all to anon, authenticated
using (true) with check (true);

drop policy if exists allow_anon_all_sales on public.sales;
create policy allow_anon_all_sales on public.sales
for all to anon, authenticated
using (true) with check (true);

drop policy if exists allow_anon_all_customers on public.customers;
create policy allow_anon_all_customers on public.customers
for all to anon, authenticated
using (true) with check (true);

drop policy if exists allow_anon_all_payment_methods on public.payment_methods;
create policy allow_anon_all_payment_methods on public.payment_methods
for all to anon, authenticated
using (true) with check (true);

drop policy if exists allow_anon_all_expenses on public.expenses;
create policy allow_anon_all_expenses on public.expenses
for all to anon, authenticated
using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.sales to anon, authenticated;
grant select, insert, update, delete on public.customers to anon, authenticated;
grant select, insert, update, delete on public.payment_methods to anon, authenticated;
grant select, insert, update, delete on public.expenses to anon, authenticated;

insert into public.payment_methods (id, data)
values
  ('pm_dinheiro', '{"name":"Dinheiro","value":"dinheiro","active":true,"order":1}'::jsonb),
  ('pm_pix', '{"name":"PIX","value":"pix","active":true,"order":2}'::jsonb),
  ('pm_cartao_debito', '{"name":"Cartao Debito","value":"cartao_debito","active":true,"order":3}'::jsonb),
  ('pm_cartao_credito', '{"name":"Cartao Credito","value":"cartao_credito","active":true,"order":4}'::jsonb),
  ('pm_transferencia', '{"name":"Transferencia","value":"transferencia","active":true,"order":5}'::jsonb),
  ('pm_boleto', '{"name":"Boleto","value":"boleto","active":true,"order":6}'::jsonb)
on conflict (id) do nothing;
