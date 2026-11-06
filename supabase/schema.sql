-- GymDesk initial database schema
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.
-- Every business record belongs to the authenticated gym owner.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  joined_on date not null default current_date,
  status text not null default 'active' check (status in ('active','inactive','expired')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  duration_months integer not null check (duration_months > 0),
  price numeric(12,2) not null check (price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, name)
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  plan_id uuid references public.membership_plans(id) on delete set null,
  start_date date not null,
  end_date date not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'active' check (status in ('active','expired','cancelled','pending')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_date >= start_date)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  attendance_date date not null default current_date,
  check_in timestamptz not null default timezone('utc', now()),
  check_out timestamptz,
  source text not null default 'manual' check (source in ('manual','qr')),
  created_at timestamptz not null default timezone('utc', now()),
  check (check_out is null or check_out >= check_in)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  membership_id uuid references public.memberships(id) on delete set null,
  receipt_number text not null,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text not null default 'cash' check (method in ('cash','upi','card','bank_transfer')),
  status text not null default 'paid' check (status in ('paid','pending','failed','refunded')),
  reference text,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, receipt_number)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  amount numeric(12,2) not null check (amount > 0),
  spent_on date not null default current_date,
  method text not null default 'cash' check (method in ('cash','upi','card','bank_transfer')),
  reference text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  role text not null default 'trainer' check (role in ('manager','trainer','receptionist')),
  joined_on date not null default current_date,
  status text not null default 'active' check (status in ('active','inactive')),
  salary numeric(12,2) check (salary is null or salary >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.gym_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  gym_name text not null default 'My Gym',
  phone text,
  email text,
  address text,
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  date_format text not null default 'DD/MM/YYYY',
  attendance_grace_minutes integer not null default 10 check (attendance_grace_minutes >= 0),
  operating_hours jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists members_owner_name_idx on public.members(owner_id, full_name);
create index if not exists memberships_owner_member_idx on public.memberships(owner_id, member_id);
create index if not exists memberships_owner_end_date_idx on public.memberships(owner_id, end_date);
create index if not exists attendance_owner_date_idx on public.attendance(owner_id, attendance_date desc);
create index if not exists attendance_member_date_idx on public.attendance(member_id, attendance_date desc);
create index if not exists payments_owner_paid_on_idx on public.payments(owner_id, paid_on desc);
create index if not exists expenses_owner_spent_on_idx on public.expenses(owner_id, spent_on desc);
create index if not exists staff_owner_name_idx on public.staff(owner_id, full_name);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['members','membership_plans','memberships','attendance','payments','expenses','staff','gym_settings']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Owners can manage their own %I" on public.%I', table_name, table_name);
    execute format(
      'create policy "Owners can manage their own %I" on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      table_name, table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['members','membership_plans','memberships','expenses','staff','gym_settings']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;
