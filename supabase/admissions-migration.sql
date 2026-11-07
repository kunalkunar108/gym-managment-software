-- GymDesk admissions workflow: member, membership and payment are saved atomically.
alter table public.members
  add column if not exists gender text,
  add column if not exists address text,
  add column if not exists secondary_phone text;

alter table public.memberships
  add column if not exists discount_percent numeric(5,2) not null default 0
    check (discount_percent >= 0 and discount_percent < 100),
  add column if not exists original_amount numeric(12,2),
  add column if not exists admission_fee numeric(12,2) not null default 0
    check (admission_fee >= 0);

-- Remove the previous RPC signature before creating the updated one.
drop function if exists public.complete_admission(text,uuid,text,text,text,text,text,uuid,date,date,numeric,numeric,text,text);

create or replace function public.complete_admission(
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
  p_total_amount numeric,
  p_payment_method text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_member_id uuid;
  v_membership_id uuid;
  v_receipt text;
  v_plan_price numeric(12,2);
  v_plan_months integer;
  v_membership_amount numeric(12,2);
  v_expected_amount numeric(12,2);
  v_payment_id uuid;
begin
  if v_owner is null then raise exception 'You must be signed in.'; end if;
  if p_admission_type not in ('new','re') then raise exception 'Invalid admission type.'; end if;
  if nullif(trim(p_full_name), '') is null or nullif(trim(p_phone), '') is null then
    raise exception 'Full name and mobile number are required.';
  end if;
  if p_gender not in ('male','female','other','prefer_not_to_say') then raise exception 'Select a valid gender.'; end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then raise exception 'Invalid membership dates.'; end if;
  if p_discount_percent is null or p_discount_percent < 0 or p_discount_percent >= 100 then
    raise exception 'Discount must be between 0 and 99.99 percent.';
  end if;
  if p_admission_fee is null or p_admission_fee < 0 then raise exception 'Admission fee cannot be negative.'; end if;
  if p_total_amount is null or p_total_amount < 0 then raise exception 'Total amount cannot be negative.'; end if;
  if p_payment_method not in ('cash','upi','card','bank_transfer') then raise exception 'Select a valid payment method.'; end if;

  select price, duration_months into v_plan_price, v_plan_months
  from public.membership_plans
  where id = p_plan_id and owner_id = v_owner and is_active = true;
  if not found then raise exception 'Selected plan is unavailable. Refresh plans and try again.'; end if;

  v_membership_amount := round(v_plan_price * (1 - p_discount_percent / 100), 2);
  v_expected_amount := v_membership_amount + round(p_admission_fee, 2);
  if p_total_amount <> v_expected_amount then
    raise exception 'Total amount does not match the plan discount and admission fee.';
  end if;

  if p_admission_type = 'new' then
    if p_member_id is not null then raise exception 'New admission cannot use an existing member.'; end if;
    insert into public.members(owner_id, full_name, phone, secondary_phone, gender, address, joined_on, status)
    values (v_owner, trim(p_full_name), trim(p_phone), nullif(trim(p_secondary_phone), ''),
            p_gender, nullif(trim(p_address), ''), p_start_date, 'active')
    returning id into v_member_id;
  else
    if p_member_id is null then raise exception 'Choose an existing member for re-admission.'; end if;
    update public.members
    set full_name = trim(p_full_name),
        phone = trim(p_phone),
        secondary_phone = nullif(trim(p_secondary_phone), ''),
        gender = p_gender,
        address = nullif(trim(p_address), ''),
        status = 'active'
    where id = p_member_id and owner_id = v_owner
    returning id into v_member_id;
    if v_member_id is null then raise exception 'Existing member was not found.'; end if;
  end if;

  insert into public.memberships(owner_id, member_id, plan_id, start_date, end_date, amount, original_amount, discount_percent, admission_fee, status)
  values (v_owner, v_member_id, p_plan_id, p_start_date, p_end_date, v_membership_amount,
          v_plan_price, p_discount_percent, round(p_admission_fee, 2), 'active')
  returning id into v_membership_id;

  if p_total_amount > 0 then
    v_receipt := 'GD-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into public.payments(owner_id, member_id, membership_id, receipt_number, amount, paid_on, method, status, note)
    values (v_owner, v_member_id, v_membership_id, v_receipt, p_total_amount, current_date, p_payment_method, 'paid',
            case when p_admission_type = 're' then 'Re-admission payment' else 'New admission payment' end)
    returning id into v_payment_id;
  end if;

  return jsonb_build_object('member_id', v_member_id, 'membership_id', v_membership_id,
                            'payment_id', v_payment_id, 'receipt_number', v_receipt);
end;
$$;

revoke all on function public.complete_admission(text,uuid,text,text,text,text,text,uuid,date,date,numeric,numeric,numeric,text) from public;
grant execute on function public.complete_admission(text,uuid,text,text,text,text,text,uuid,date,date,numeric,numeric,numeric,text) to authenticated;
