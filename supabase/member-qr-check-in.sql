create or replace function public.member_qr_check_in(p_owner_id uuid, p_phone text)
returns text language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text;
  v_timezone text;
  v_today date;
  v_member_id uuid;
  v_match_count integer;
  v_inserted_id uuid;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if length(v_phone) < 10 or length(v_phone) > 15 then return 'not_eligible'; end if;
  select coalesce(gs.timezone, 'Asia/Kolkata') into v_timezone
  from public.gym_settings gs where gs.owner_id = p_owner_id limit 1;
  if not found then return 'not_eligible'; end if;
  v_today := (now() at time zone v_timezone)::date;
  select count(distinct m.id), min(m.id) into v_match_count, v_member_id
  from public.members m
  join public.memberships ms on ms.member_id = m.id and ms.owner_id = m.owner_id
  where m.owner_id = p_owner_id
    and regexp_replace(coalesce(m.phone, ''), '[^0-9]', '', 'g') = v_phone
    and ms.status = 'active' and ms.start_date <= v_today and ms.end_date >= v_today;
  if coalesce(v_match_count, 0) <> 1 or v_member_id is null then return 'not_eligible'; end if;
  insert into public.attendance (owner_id, member_id, attendance_date, check_in, source, marked_by)
  values (p_owner_id, v_member_id, v_today, now(), 'phone', null)
  on conflict (owner_id, member_id, attendance_date) do nothing
  returning id into v_inserted_id;
  if v_inserted_id is null then return 'already_checked_in'; end if;
  return 'checked_in';
end;
$$;
revoke all on function public.member_qr_check_in(uuid, text) from public;
grant execute on function public.member_qr_check_in(uuid, text) to anon, authenticated;