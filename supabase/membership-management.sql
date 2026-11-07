-- Membership Management: safe, non-financial membership data for active trainers.
-- Expiration is calculated from end_date in the UI; old rows are not hidden
-- just because their stored status still says 'active'.

create or replace function public.trainer_list_membership_management()
returns table(
  id uuid,
  member_id uuid,
  member_name text,
  member_phone text,
  plan_name text,
  start_date date,
  end_date date,
  status text
)
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
    select 1
    from public.staff s
    where s.user_id = auth.uid()
      and s.owner_id = v_owner_id
      and s.status = 'active'
  ) then
    raise exception 'Your trainer account is inactive.';
  end if;

  return query
    select
      ms.id,
      ms.member_id,
      mb.full_name,
      mb.phone,
      coalesce(mp.name, 'Custom plan')::text,
      ms.start_date,
      ms.end_date,
      ms.status
    from public.memberships ms
    join public.members mb
      on mb.id = ms.member_id
     and mb.owner_id = v_owner_id
    left join public.membership_plans mp
      on mp.id = ms.plan_id
     and mp.owner_id = v_owner_id
    where ms.owner_id = v_owner_id
    order by ms.end_date asc, mb.full_name asc;
end;
$$;

revoke all on function public.trainer_list_membership_management() from public;
grant execute on function public.trainer_list_membership_management() to authenticated;

create index if not exists memberships_owner_end_date_status_idx
  on public.memberships(owner_id, end_date, status);
