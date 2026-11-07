-- Allow trainers to submit proposed admission pricing without recording payments.
alter table public.memberships
  add column if not exists suggested_payment_method text;

alter table public.memberships
  drop constraint if exists memberships_suggested_payment_method_check;

alter table public.memberships
  add constraint memberships_suggested_payment_method_check
  check (suggested_payment_method is null or suggested_payment_method in ('cash','upi','card','bank_transfer'));

drop function if exists public.trainer_list_membership_plans();

create function public.trainer_list_membership_plans()
returns table(id uuid, name text, duration_months integer, price numeric)
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
    select p.id, p.name, p.duration_months, p.price
    from public.membership_plans p
    where p.owner_id = v_owner_id and p.is_active = true
    order by p.name;
end;
$$;

drop function if exists public.trainer_complete_admission(text,uuid,text,text,text,text,text,uuid,date,date);

create function public.trainer_complete_admission(
  p_admission_type text,
  p_member_id uuid,
  p_full_name text,
  p_phone text,
  p_gender text,
  p_address text,
  p_secondary_phone text,
  p_plan_id uuid,
  p_start_date date,
  p_end_date date,
  p_discount_percent numeric,
  p_admission_fee numeric,
  p_suggested_payment_method text
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
  v_discounted_amount numeric(12,2);
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
  if p_discount_percent is null or p_discount_percent < 0 or p_discount_percent >= 100 then raise exception 'Discount must be between 0 and 99.99%.'; end if;
  if p_admission_fee is null or p_admission_fee < 0 then raise exception 'Admission fee cannot be negative.'; end if;
  if p_suggested_payment_method not in ('cash','upi','card','bank_transfer') then raise exception 'Select a valid suggested payment method.'; end if;

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

  v_discounted_amount := round(v_plan_price * (1 - p_discount_percent / 100), 2);
  insert into public.memberships(owner_id, member_id, plan_id, start_date, end_date,
    amount, original_amount, discount_percent, admission_fee, status, suggested_payment_method)
  values (v_owner_id, v_member_id, p_plan_id, p_start_date, p_end_date,
    v_discounted_amount, v_plan_price, p_discount_percent, p_admission_fee, 'active', p_suggested_payment_method)
  returning id into v_membership_id;

  return jsonb_build_object('member_id', v_member_id, 'membership_id', v_membership_id);
end;
$$;

revoke all on function public.trainer_list_membership_plans() from public;
revoke all on function public.trainer_complete_admission(text,uuid,text,text,text,text,text,uuid,date,date,numeric,numeric,text) from public;
grant execute on function public.trainer_list_membership_plans() to authenticated;
grant execute on function public.trainer_complete_admission(text,uuid,text,text,text,text,text,uuid,date,date,numeric,numeric,text) to authenticated;
