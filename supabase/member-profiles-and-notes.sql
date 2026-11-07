-- Member profiles and shared internal notes for owners and active trainers.

create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  member_id uuid not null references public.members(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  author_role text not null check (author_role in ('owner','trainer')),
  author_name text not null,
  note text not null check (char_length(trim(note)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists member_notes_member_created_idx
  on public.member_notes (owner_id, member_id, created_at desc);

create or replace function public.set_member_note_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := public.current_gym_owner_id();
  v_name text;
begin
  if auth.uid() is null or v_owner_id is null then
    raise exception 'A valid gym account is required.';
  end if;
  if public.is_gym_owner() then
    new.author_role := 'owner';
    new.author_name := 'Gym owner';
  else
    select s.full_name into v_name
    from public.staff s
    where s.user_id = auth.uid()
      and s.owner_id = v_owner_id
      and s.status = 'active'
    limit 1;
    if v_name is null then
      raise exception 'An active trainer account is required.';
    end if;
    new.author_role := 'trainer';
    new.author_name := v_name;
  end if;
  new.owner_id := v_owner_id;
  new.author_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists member_notes_set_author on public.member_notes;
create trigger member_notes_set_author
before insert on public.member_notes
for each row execute function public.set_member_note_author();

alter table public.member_notes enable row level security;

drop policy if exists "Gym users read member notes" on public.member_notes;
create policy "Gym users read member notes"
on public.member_notes for select to authenticated
using (
  owner_id = public.current_gym_owner_id()
  and exists (
    select 1 from public.members m
    where m.id = member_notes.member_id and m.owner_id = member_notes.owner_id
  )
);

drop policy if exists "Gym users add member notes" on public.member_notes;
create policy "Gym users add member notes"
on public.member_notes for insert to authenticated
with check (
  owner_id = public.current_gym_owner_id()
  and author_id = auth.uid()
  and exists (
    select 1 from public.members m
    where m.id = member_notes.member_id and m.owner_id = member_notes.owner_id
  )
  and (
    public.is_gym_owner()
    or exists (
      select 1 from public.staff s
      where s.user_id = auth.uid()
        and s.owner_id = member_notes.owner_id
        and s.status = 'active'
    )
  )
);

drop policy if exists "Gym owners edit member notes" on public.member_notes;
create policy "Gym owners edit member notes"
on public.member_notes for update to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id())
with check (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

drop policy if exists "Gym owners delete member notes" on public.member_notes;
create policy "Gym owners delete member notes"
on public.member_notes for delete to authenticated
using (public.is_gym_owner() and owner_id = public.current_gym_owner_id());

grant select, insert, update, delete on public.member_notes to authenticated;

create or replace function public.trainer_list_member_memberships(p_member_id uuid)
returns table (
  id uuid,
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
    select 1 from public.staff s
    where s.user_id = auth.uid()
      and s.owner_id = v_owner_id
      and s.status = 'active'
  ) then
    raise exception 'Your trainer account is inactive.';
  end if;
  if not exists (
    select 1 from public.members m
    where m.id = p_member_id and m.owner_id = v_owner_id
  ) then
    raise exception 'Member was not found in your gym.';
  end if;
  return query
    select ms.id, mp.name, ms.start_date, ms.end_date, ms.status
    from public.memberships ms
    left join public.membership_plans mp on mp.id = ms.plan_id
    where ms.member_id = p_member_id and ms.owner_id = v_owner_id
    order by ms.start_date desc;
end;
$$;

revoke all on function public.trainer_list_member_memberships(uuid) from public;
grant execute on function public.trainer_list_member_memberships(uuid) to authenticated;
