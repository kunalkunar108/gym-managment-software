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

-- Memberships and their financial amounts remain owner-only.
create policy "Gym owners manage memberships" on public.memberships
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

-- Attendance/check-in is no longer part of the active product workflow.
create policy "Gym owners manage attendance" on public.attendance
for all to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());
drop policy if exists "Trainers read attendance" on public.attendance;
drop policy if exists "Trainers record attendance" on public.attendance;
drop policy if exists "Trainers update attendance" on public.attendance;

drop function if exists public.trainer_qr_check_in(uuid);
drop function if exists public.trainer_manual_check_in(uuid);

-- The trainer reception workflow below creates member profiles and memberships
-- without accepting or recording any payment. The owner-only complete_admission
-- RPC remains unchanged and is the only workflow that creates payment records.

-- Remove legacy trainer check-in functions. No trainer attendance actions are supported.
drop function if exists public.trainer_qr_check_in(uuid);
drop function if exists public.trainer_manual_check_in(uuid);

-- Reception workflow for trainers: they can create/update member profiles and
-- create memberships, but they cannot read financial plan prices, membership
-- amounts, payments, or record collections. All financial values are handled
-- by this SECURITY DEFINER workflow and remain visible only to owners.

create or replace function public.trainer_list_membership_plans()
returns table(id uuid, name text, duration_months integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := public.current_gym_owner_id();
begin
  if auth.uid() is null or v_owner_id is null or public.is_gym_owner() then
    raise exception 'An active trainer account is required.';
  end if;
  if not exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.owner_id = v_owner_id and s.status = 'active'
  ) then
    raise exception 'Your trainer account is inactive.';
  end if;
  return query
    select p.id, p.name, p.duration_months
    from public.membership_plans p
    where p.owner_id = v_owner_id and p.is_active = true
    order by p.name;
end;
$$;

create or replace function public.trainer_complete_admission(
  p_admission_type text,
  p_member_id uuid,
  p_full_name text,
  p_phone text,
  p_gender text,
  p_address text,
  p_secondary_phone text,
  p_plan_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := public.current_gym_owner_id();
  v_member_id uuid;
  v_membership_id uuid;
  v_plan_price numeric(12,2);
  v_plan_months integer;
begin
  if auth.uid() is null or v_owner_id is null or public.is_gym_owner() then
    raise exception 'An active trainer account is required.';
  end if;
  if not exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.owner_id = v_owner_id and s.status = 'active'
  ) then
    raise exception 'Your trainer account is inactive.';
  end if;
  if p_admission_type not in ('new','re') then raise exception 'Invalid admission type.'; end if;
  if nullif(trim(p_full_name), '') is null or nullif(trim(p_phone), '') is null then
    raise exception 'Full name and mobile number are required.';
  end if;
  if p_gender not in ('male','female','other','prefer_not_to_say') then raise exception 'Select a valid gender.'; end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then raise exception 'Invalid membership dates.'; end if;

  select p.price, p.duration_months into v_plan_price, v_plan_months
  from public.membership_plans p
  where p.id = p_plan_id and p.owner_id = v_owner_id and p.is_active = true;
  if not found then raise exception 'Selected plan is unavailable. Refresh plans and try again.'; end if;
  if p_end_date > (p_start_date + make_interval(months => v_plan_months))::date then
    raise exception 'End date exceeds the selected plan duration.';
  end if;

  if p_admission_type = 'new' then
    if p_member_id is not null then raise exception 'New admission cannot use an existing member.'; end if;
    insert into public.members(owner_id, full_name, phone, secondary_phone, gender, address, joined_on, status)
    values (v_owner_id, trim(p_full_name), trim(p_phone), nullif(trim(p_secondary_phone), ''),
            p_gender, nullif(trim(p_address), ''), p_start_date, 'active')
    returning id into v_member_id;
  else
    if p_member_id is null then raise exception 'Choose an existing member for re-admission.'; end if;
    update public.members
    set full_name = trim(p_full_name), phone = trim(p_phone),
        secondary_phone = nullif(trim(p_secondary_phone), ''), gender = p_gender,
        address = nullif(trim(p_address), ''), status = 'active'
    where id = p_member_id and owner_id = v_owner_id
    returning id into v_member_id;
    if v_member_id is null then raise exception 'Existing member was not found.'; end if;
  end if;

  -- The plan's standard amount is stored for owner-side accounting. Trainers
  -- receive no price, discount, admission-fee, or payment details in response.
  insert into public.memberships(owner_id, member_id, plan_id, start_date, end_date,
    amount, original_amount, discount_percent, admission_fee, status)
  values (v_owner_id, v_member_id, p_plan_id, p_start_date, p_end_date,
    v_plan_price, v_plan_price, 0, 0, 'active')
  returning id into v_membership_id;

  return jsonb_build_object('member_id', v_member_id, 'membership_id', v_membership_id);
end;
$$;

revoke all on function public.trainer_list_membership_plans() from public;
revoke all on function public.trainer_complete_admission(text,uuid,text,text,text,text,text,uuid,date,date) from public;
grant execute on function public.trainer_list_membership_plans() to authenticated;
grant execute on function public.trainer_complete_admission(text,uuid,text,text,text,text,text,uuid,date,date) to authenticated;
