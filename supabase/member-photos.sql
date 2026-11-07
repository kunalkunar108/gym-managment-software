-- Member photo capture: private storage shared only with the member's gym owner and active trainers.
alter table public.members
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Gym users read member photos" on storage.objects;
drop policy if exists "Gym users upload member photos" on storage.objects;
drop policy if exists "Gym users update member photos" on storage.objects;
drop policy if exists "Gym users delete member photos" on storage.objects;

create policy "Gym users read member photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = public.current_gym_owner_id()::text
  and exists (
    select 1 from public.members m
    where m.id::text = split_part(name, '/', 2)
      and m.owner_id = public.current_gym_owner_id()
  )
);

create policy "Gym users upload member photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'member-photos'
  and public.current_gym_owner_id() is not null
  and split_part(name, '/', 1) = public.current_gym_owner_id()::text
  and exists (
    select 1 from public.members m
    where m.id::text = split_part(name, '/', 2)
      and m.owner_id = public.current_gym_owner_id()
  )
);

create policy "Gym users update member photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = public.current_gym_owner_id()::text
  and exists (
    select 1 from public.members m
    where m.id::text = split_part(name, '/', 2)
      and m.owner_id = public.current_gym_owner_id()
  )
)
with check (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = public.current_gym_owner_id()::text
  and exists (
    select 1 from public.members m
    where m.id::text = split_part(name, '/', 2)
      and m.owner_id = public.current_gym_owner_id()
  )
);

create policy "Gym users delete member photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = public.current_gym_owner_id()::text
  and exists (
    select 1 from public.members m
    where m.id::text = split_part(name, '/', 2)
      and m.owner_id = public.current_gym_owner_id()
  )
);

create or replace function public.trainer_set_member_photo_path(
  p_member_id uuid,
  p_photo_path text
)
returns void
language plpgsql
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
  if p_photo_path is null
     or split_part(p_photo_path, '/', 1) <> v_owner_id::text
     or split_part(p_photo_path, '/', 2) <> p_member_id::text
     or split_part(p_photo_path, '/', 3) = '' then
    raise exception 'Invalid member photo path.';
  end if;
  update public.members
  set photo_path = p_photo_path
  where id = p_member_id and owner_id = v_owner_id;
  if not found then
    raise exception 'Member was not found in your gym.';
  end if;
end;
$$;

revoke all on function public.trainer_set_member_photo_path(uuid,text) from public;
grant execute on function public.trainer_set_member_photo_path(uuid,text) to authenticated;
