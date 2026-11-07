-- GymDesk owner + trainer account foundation.
-- Run in Supabase SQL Editor after the existing schema and admissions migration.

-- Link a staff record to its Supabase Auth login. One login can belong to one gym.
alter table public.staff
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

-- This product supports exactly two account types: owner and trainer.
update public.staff set role = 'trainer' where role <> 'trainer';
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff
  add constraint staff_role_check check (role = 'trainer');

-- Resolve the gym owner for the current authenticated account.
-- An active or inactive linked staff record is always treated as staff, never as an owner.
create or replace function public.current_gym_owner_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_is_staff boolean;
begin
  if v_user_id is null then
    return null;
  end if;

  select s.owner_id, true
    into v_owner_id, v_is_staff
  from public.staff s
  where s.user_id = v_user_id
  limit 1;

  if coalesce(v_is_staff, false) then
    if exists (
      select 1 from public.staff s
      where s.user_id = v_user_id and s.status = 'active'
    ) then
      return v_owner_id;
    end if;
    return null;
  end if;

  -- Accounts not linked to a staff record are gym owners.
  return v_user_id;
end;
$$;

create or replace function public.is_gym_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and public.current_gym_owner_id() = auth.uid()
     and not exists (
       select 1 from public.staff s where s.user_id = auth.uid()
     );
$$;

revoke all on function public.current_gym_owner_id() from public;
revoke all on function public.is_gym_owner() from public;
grant execute on function public.current_gym_owner_id() to authenticated;
grant execute on function public.is_gym_owner() to authenticated;

-- Replace the original owner_id = auth.uid() policies with owner-aware policies.
do $$
declare
  t text;
begin
  foreach t in array array['members','membership_plans','memberships','attendance','payments','expenses','staff','gym_settings']
  loop
    execute format('drop policy if exists %I on public.%I', 'Owners can manage their own ' || t, t);
    execute format('drop policy if exists "Gym owners manage ' || t || '" on public.%I', t);
    execute format('drop policy if exists "Trainers read ' || t || '" on public.%I', t);
  end loop;
end $$;

-- Owner-only tables: full CRUD for owner; no trainer access.
create policy "Gym owners manage membership_plans" on public.membership_plans
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

create policy "Gym owners manage payments" on public.payments
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

create policy "Gym owners manage expenses" on public.expenses
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

create policy "Gym owners manage staff" on public.staff
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

create policy "Gym owners manage gym_settings" on public.gym_settings
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

-- Members: trainers can see all member profiles, but only owners can change them.
create policy "Gym owners manage members" on public.members
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

create policy "Trainers read members" on public.members
for select to authenticated
using (
  not public.is_gym_owner()
  and owner_id = public.current_gym_owner_id()
);

-- Membership information is visible to trainers to support safe attendance checks.
create policy "Gym owners manage memberships" on public.memberships
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

create policy "Trainers read memberships" on public.memberships
for select to authenticated
using (
  not public.is_gym_owner()
  and owner_id = public.current_gym_owner_id()
);

-- Trainers may view and record attendance for any member of their gym.
create policy "Gym owners manage attendance" on public.attendance
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

create policy "Trainers read attendance" on public.attendance
for select to authenticated
using (
  not public.is_gym_owner()
  and owner_id = public.current_gym_owner_id()
);

create policy "Trainers record attendance" on public.attendance
for insert to authenticated
with check (
  not public.is_gym_owner()
  and owner_id = public.current_gym_owner_id()
  and exists (
    select 1 from public.members m
    where m.id = member_id and m.owner_id = public.current_gym_owner_id()
  )
);

create policy "Trainers update attendance" on public.attendance
for update to authenticated
using (
  not public.is_gym_owner()
  and owner_id = public.current_gym_owner_id()
  and exists (
    select 1 from public.members m
    where m.id = member_id and m.owner_id = public.current_gym_owner_id()
  )
)
with check (
  not public.is_gym_owner()
  and owner_id = public.current_gym_owner_id()
  and exists (
    select 1 from public.members m
    where m.id = member_id and m.owner_id = public.current_gym_owner_id()
  )
);

-- Keep owner-only admission RPC restricted to the owner. Trainers cannot create
-- admissions, memberships or payments through the existing complete_admission function.
