create or replace function public.get_member_face_consent_status(p_member_id uuid)
returns table(consent_status text, consent_version text, consented_at timestamptz, withdrawn_at timestamptz, has_template boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid := public.current_gym_owner_id();
begin
  if auth.uid() is null or v_owner_id is null then
    raise exception 'An authenticated gym account is required.';
  end if;
  if not (select public.is_gym_owner()) and not exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.owner_id = v_owner_id and s.status = 'active'
  ) then
    raise exception 'An active trainer account is required.';
  end if;
  if not exists (select 1 from public.members m where m.id = p_member_id and m.owner_id = v_owner_id) then
    raise exception 'Member was not found in your gym.';
  end if;
  return query
  select coalesce(p.consent_status, 'not_consented'),
         p.consent_version, p.consented_at, p.withdrawn_at,
         (p.encrypted_template is not null)
  from (select 1) seed
  left join public.member_face_profiles p
    on p.owner_id = v_owner_id and p.member_id = p_member_id;
end;
$$;
revoke all on function public.get_member_face_consent_status(uuid) from public;
grant execute on function public.get_member_face_consent_status(uuid) to authenticated;