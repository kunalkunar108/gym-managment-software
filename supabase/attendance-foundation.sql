-- Attendance foundation for GymDesk
-- Keep existing attendance records and legacy source values intact.

alter table public.attendance
  add column if not exists marked_by uuid references auth.users(id) on delete set null;

alter table public.attendance
  drop constraint if exists attendance_source_check;

alter table public.attendance
  add constraint attendance_source_check
  check (source = any (array['manual', 'qr', 'face', 'phone', 'nfc']::text[]));

-- A member can have only one check-in per gym-local attendance date.
create unique index if not exists attendance_one_per_member_per_day_idx
  on public.attendance (owner_id, member_id, attendance_date);

-- Trainers may view attendance for their own gym, but cannot directly alter records.
drop policy if exists "Active trainers view gym attendance" on public.attendance;

create policy "Active trainers view gym attendance"
  on public.attendance
  for select
  to authenticated
  using (
    owner_id = (select public.current_gym_owner_id())
    and not (select public.is_gym_owner())
  );
