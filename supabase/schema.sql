-- Run this script in Supabase SQL Editor

create extension if not exists pgcrypto;

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

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  password_hash text not null,
  role text not null default 'operador',
  permissions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz null
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  user_id uuid null references public.users(id) on update cascade on delete set null,
  device_name text not null,
  first_access_at timestamptz not null default now(),
  last_access_at timestamptz not null default now(),
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_username on public.users(username);
create index if not exists idx_devices_user_id on public.devices(user_id);
create index if not exists idx_devices_device_id on public.devices(device_id);

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

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists devices_set_updated_at on public.devices;
create trigger devices_set_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.customers enable row level security;
alter table public.payment_methods enable row level security;
alter table public.expenses enable row level security;
alter table public.users enable row level security;
alter table public.devices enable row level security;

alter table public.products force row level security;
alter table public.sales force row level security;
alter table public.customers force row level security;
alter table public.payment_methods force row level security;
alter table public.expenses force row level security;
alter table public.users force row level security;
alter table public.devices force row level security;

drop policy if exists allow_anon_all_products on public.products;
drop policy if exists allow_anon_all_sales on public.sales;
drop policy if exists allow_anon_all_customers on public.customers;
drop policy if exists allow_anon_all_payment_methods on public.payment_methods;
drop policy if exists allow_anon_all_expenses on public.expenses;

drop policy if exists deny_all_products on public.products;
create policy deny_all_products on public.products
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_all_sales on public.sales;
create policy deny_all_sales on public.sales
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_all_customers on public.customers;
create policy deny_all_customers on public.customers
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_all_payment_methods on public.payment_methods;
create policy deny_all_payment_methods on public.payment_methods
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_all_expenses on public.expenses;
create policy deny_all_expenses on public.expenses
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_all_users on public.users;
create policy deny_all_users on public.users
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_all_devices on public.devices;
create policy deny_all_devices on public.devices
for all to anon, authenticated
using (false)
with check (false);

grant usage on schema public to anon, authenticated;
revoke select, insert, update, delete on public.products from anon, authenticated;
revoke select, insert, update, delete on public.sales from anon, authenticated;
revoke select, insert, update, delete on public.customers from anon, authenticated;
revoke select, insert, update, delete on public.payment_methods from anon, authenticated;
revoke select, insert, update, delete on public.expenses from anon, authenticated;
revoke select, insert, update, delete on public.users from anon, authenticated;
revoke select, insert, update, delete on public.devices from anon, authenticated;

insert into public.payment_methods (id, data)
values
  ('pm_dinheiro', '{"name":"Dinheiro","value":"dinheiro","active":true,"order":1}'::jsonb),
  ('pm_pix', '{"name":"PIX","value":"pix","active":true,"order":2}'::jsonb),
  ('pm_cartao_debito', '{"name":"Cartao Debito","value":"cartao_debito","active":true,"order":3}'::jsonb),
  ('pm_cartao_credito', '{"name":"Cartao Credito","value":"cartao_credito","active":true,"order":4}'::jsonb),
  ('pm_transferencia', '{"name":"Transferencia","value":"transferencia","active":true,"order":5}'::jsonb),
  ('pm_boleto', '{"name":"Boleto","value":"boleto","active":true,"order":6}'::jsonb)
on conflict (id) do nothing;
