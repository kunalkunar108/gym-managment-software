-- Face verification consent and protected biometric profile foundation.
-- Face templates are stored encrypted by the face service; clients receive no direct table access.

create table if not exists public.member_face_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  consent_status text not null default 'not_consented'
    check (consent_status in ('not_consented', 'consented', 'withdrawn')),
  consent_version text,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  encrypted_template bytea,
  encryption_key_version text,
  template_model text,
  registered_at timestamptz,
  registered_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (owner_id, member_id),
  check (
    (consent_status = 'consented' and consented_at is not null)
    or consent_status <> 'consented'
  )
);

create table if not exists public.member_face_consent_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  action text not null check (action in ('granted', 'withdrawn')),
  consent_version text not null,
  method text not null default 'in_person'
    check (method in ('in_person')),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now()
);

create index if not exists member_face_profiles_owner_member_idx
  on public.member_face_profiles(owner_id, member_id);
create index if not exists member_face_consent_events_owner_member_idx
  on public.member_face_consent_events(owner_id, member_id, recorded_at desc);

alter table public.member_face_profiles enable row level security;
alter table public.member_face_consent_events enable row level security;

drop policy if exists "Gym users view face consent events" on public.member_face_consent_events;
create policy "Gym users view face consent events"
  on public.member_face_consent_events
  for select to authenticated
  using (
    owner_id = (select public.current_gym_owner_id())
    and (
      (select public.is_gym_owner())
      or exists (
        select 1 from public.staff s
        where s.user_id = auth.uid()
          and s.owner_id = owner_id
          and s.status = 'active'
      )
    )
  );

-- No client-facing SELECT/INSERT/UPDATE/DELETE policies are created for biometric templates.
-- Only trusted server-side service-role code can access member_face_profiles.

create or replace function public.record_member_face_consent(
  p_member_id uuid,
  p_action text,
  p_consent_version text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid := public.current_gym_owner_id();
  v_is_owner boolean := public.is_gym_owner();
begin
  if auth.uid() is null or v_owner_id is null then
    raise exception 'An authenticated gym account is required.';
  end if;

  if not v_is_owner and not exists (
    select 1 from public.staff s
    where s.user_id = auth.uid()
      and s.owner_id = v_owner_id
      and s.status = 'active'
  ) then
    raise exception 'An active trainer account is required.';
  end if;

  if p_action not in ('granted', 'withdrawn') then
    raise exception 'Invalid consent action.';
  end if;

  if p_consent_version is null or length(trim(p_consent_version)) = 0 then
    raise exception 'Consent text version is required.';
  end if;

  if not exists (
    select 1 from public.members m
    where m.id = p_member_id and m.owner_id = v_owner_id
  ) then
    raise exception 'Member was not found in your gym.';
  end if;

  insert into public.member_face_profiles (
    owner_id, member_id, consent_status, consent_version,
    consented_at, withdrawn_at, encrypted_template, encryption_key_version,
    template_model, registered_at, registered_by, updated_at
  )
  values (
    v_owner_id, p_member_id,
    case when p_action = 'granted' then 'consented' else 'withdrawn' end,
    p_consent_version,
    case when p_action = 'granted' then now() else null end,
    case when p_action = 'withdrawn' then now() else null end,
    null, null, null, null, null, now()
  )
  on conflict (owner_id, member_id) do update
  set consent_status = excluded.consent_status,
      consent_version = excluded.consent_version,
      consented_at = case when p_action = 'granted' then now() else member_face_profiles.consented_at end,
      withdrawn_at = case when p_action = 'withdrawn' then now() else null end,
      encrypted_template = case when p_action = 'withdrawn' then null else member_face_profiles.encrypted_template end,
      encryption_key_version = case when p_action = 'withdrawn' then null else member_face_profiles.encryption_key_version end,
      template_model = case when p_action = 'withdrawn' then null else member_face_profiles.template_model end,
      registered_at = case when p_action = 'withdrawn' then null else member_face_profiles.registered_at end,
      registered_by = case when p_action = 'withdrawn' then null else member_face_profiles.registered_by end,
      updated_at = now();

  insert into public.member_face_consent_events (
    owner_id, member_id, action, consent_version, method, recorded_by
  ) values (
    v_owner_id, p_member_id, p_action, p_consent_version, 'in_person', auth.uid()
  );

  return p_action;
end;
$$;

revoke all on function public.record_member_face_consent(uuid,text,text) from public;
grant execute on function public.record_member_face_consent(uuid,text,text) to authenticated;
