-- Allow active trainers to see only the non-financial membership expiry details
-- used by the Overview dashboard. Memberships remain otherwise owner-only.

create or replace function public.trainer_list_expiring_memberships()
returns table(
  id uuid,
  member_id uuid,
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
    select m.id, m.member_id, m.end_date, m.status
    from public.memberships m
    where m.owner_id = v_owner_id
      and m.status = 'active'
      and m.end_date >= current_date
      and m.end_date <= current_date + 7
    order by m.end_date asc;
end;
$$;

revoke all on function public.trainer_list_expiring_memberships() from public;
grant execute on function public.trainer_list_expiring_memberships() to authenticated;
