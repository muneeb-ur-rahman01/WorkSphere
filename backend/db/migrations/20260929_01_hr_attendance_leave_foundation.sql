-- ============================================================
-- WorkSphere Phase 1 migration (2026-09-29)
-- HR core + Attendance + Leave + Notification read-receipts
--
-- Run once in Supabase -> SQL Editor. Fully idempotent.
-- Non-destructive: only CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- Depends only on existing tables: organizations, users, notifications.
--
-- SECURITY MODEL (read this):
-- WorkSphere authenticates with its own JWT (signed with JWT_SECRET) and the
-- Express backend talks to Postgres with the service-role key. Supabase's
-- auth.uid() is therefore never populated for app users, so per-user RLS
-- policies based on auth.uid() would match nothing. Instead every new table:
--   * has RLS ENABLED with NO policies  -> anon/authenticated roles are denied
--   * has all privileges REVOKED from anon and authenticated
-- so the tables cannot be read through the public Supabase REST API even if
-- the anon key leaks. The service role (Express) bypasses RLS; tenant and
-- role checks live in the Express controllers (org_id scoping).
-- Integrity that must hold even against a buggy controller (timestamps,
-- one open session, no overlapping leave) is enforced in the database below.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ------------------------------------------------------------
-- Shared: updated_at trigger function
-- ------------------------------------------------------------
create or replace function ws_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ------------------------------------------------------------
-- 1. Departments & Designations
-- ------------------------------------------------------------
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_departments_org_name on departments(org_id, lower(name));

create table if not exists designations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  department_id uuid references departments(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_designations_org_title on designations(org_id, lower(title));
create index if not exists idx_designations_dept on designations(department_id);

-- ------------------------------------------------------------
-- 2. Employees (HR record linked 1:1 to an existing login account)
-- Does NOT duplicate users: user_id is unique and references users.
-- Login role/permissions stay in users.role / staff_permissions.
-- ------------------------------------------------------------
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  employee_code text not null,
  full_name text not null,
  personal_email text,
  phone text,
  address text,
  date_of_birth date,
  gender text,
  national_id text,
  emergency_contact_name text,
  emergency_contact_phone text,
  department_id uuid references departments(id) on delete set null,
  designation_id uuid references designations(id) on delete set null,
  joining_date date,
  employment_type text not null default 'Full-time'
    check (employment_type in ('Full-time','Part-time','Contract','Intern','Volunteer')),
  employment_status text not null default 'Active'
    check (employment_status in ('Active','On Leave','Probation','Suspended','Resigned','Terminated')),
  profile_photo_path text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_employees_user unique (user_id)
);
create unique index if not exists uq_employees_org_code on employees(org_id, lower(employee_code));
create index if not exists idx_employees_org on employees(org_id);
create index if not exists idx_employees_dept on employees(department_id);

-- A linked user must belong to the same organization as the employee row.
create or replace function ws_employees_same_org() returns trigger
language plpgsql as $$
declare u_org uuid;
begin
  select org_id into u_org from users where id = new.user_id;
  if u_org is distinct from new.org_id then
    raise exception 'employee.org_id must match the linked user''s org_id';
  end if;
  return new;
end $$;

drop trigger if exists trg_employees_same_org on employees;
create trigger trg_employees_same_org before insert or update of user_id, org_id
  on employees for each row execute function ws_employees_same_org();

-- ------------------------------------------------------------
-- 3. Attendance
-- One session per user per work day (attendance policy). Timestamps are set
-- by the database clock, never by the client.
-- ------------------------------------------------------------
create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  work_date date not null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'Present'
    check (status in ('Present','Late','Half Day','Absent','Incomplete')),
  is_corrected boolean not null default false,
  correction_note text,
  corrected_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_attendance_user_day unique (user_id, work_date),
  constraint chk_attendance_out_after_in check (check_out_at is null or check_out_at >= check_in_at)
);
create index if not exists idx_attendance_org_date on attendance_sessions(org_id, work_date);
create index if not exists idx_attendance_user_date on attendance_sessions(user_id, work_date desc);
-- Extra guard: at most one OPEN session per user at any time.
create unique index if not exists uq_attendance_one_open on attendance_sessions(user_id) where check_out_at is null;

-- Org-level attendance policy (defaults apply when no row exists).
create table if not exists attendance_settings (
  org_id uuid primary key references organizations(id) on delete cascade,
  timezone text not null default 'Asia/Karachi',
  work_start time not null default '09:00',
  late_after_minutes integer not null default 15 check (late_after_minutes >= 0),
  half_day_hours numeric(4,2) not null default 4 check (half_day_hours >= 0),
  auto_close_after_hours integer not null default 16 check (auto_close_after_hours > 0),
  weekend_days integer[] not null default '{0,6}', -- 0=Sunday .. 6=Saturday
  updated_at timestamptz not null default now()
);

-- Effective settings with defaults
create or replace function ws_attendance_policy(p_org uuid)
returns attendance_settings language sql stable as $$
  select coalesce(
    (select s from attendance_settings s where s.org_id = p_org),
    row(p_org,'Asia/Karachi','09:00'::time,15,4,16,'{0,6}'::int[],now())::attendance_settings
  );
$$;

-- Immutability: check_in_at / user / org / date never change through normal
-- updates; check_out_at may be set once. Admin corrections must set
--   set local app.attendance_correction = 'on';
-- inside the same transaction (done by ws_attendance_admin_correct below).
create or replace function ws_attendance_guard() returns trigger
language plpgsql as $$
declare corr boolean := coalesce(current_setting('app.attendance_correction', true),'') = 'on';
begin
  if not corr then
    if new.user_id <> old.user_id or new.org_id <> old.org_id
       or new.work_date <> old.work_date or new.check_in_at <> old.check_in_at then
      raise exception 'attendance identity/check-in fields are immutable';
    end if;
    if old.check_out_at is not null and new.check_out_at is distinct from old.check_out_at then
      raise exception 'attendance check-out already recorded';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_attendance_guard on attendance_sessions;
create trigger trg_attendance_guard before update on attendance_sessions
  for each row execute function ws_attendance_guard();
drop trigger if exists trg_attendance_updated on attendance_sessions;
create trigger trg_attendance_updated before update on attendance_sessions
  for each row execute function ws_set_updated_at();

-- Check in. Idempotent: a repeated call returns the existing session.
create or replace function ws_attendance_check_in(p_user uuid, p_org uuid)
returns attendance_sessions language plpgsql as $$
declare
  pol attendance_settings;
  local_now timestamp;
  today date;
  sess attendance_sessions;
  st text := 'Present';
begin
  if not exists (select 1 from users where id = p_user and org_id = p_org and status = 'Active') then
    raise exception 'user not active in organization';
  end if;

  pol := ws_attendance_policy(p_org);
  local_now := now() at time zone pol.timezone;
  today := local_now::date;

  -- Close any stale open session from a previous day so the partial unique
  -- index cannot block today's check-in.
  update attendance_sessions
     set check_out_at = least(now(), check_in_at + make_interval(hours => pol.auto_close_after_hours)),
         duration_seconds = extract(epoch from
           least(now(), check_in_at + make_interval(hours => pol.auto_close_after_hours)) - check_in_at)::int,
         status = 'Incomplete'
   where user_id = p_user and check_out_at is null and work_date < today;

  select * into sess from attendance_sessions where user_id = p_user and work_date = today;
  if found then return sess; end if;

  if local_now::time > pol.work_start + make_interval(mins => pol.late_after_minutes) then
    st := 'Late';
  end if;

  insert into attendance_sessions(org_id, user_id, work_date, check_in_at, status)
  values (p_org, p_user, today, now(), st)
  on conflict (user_id, work_date) do nothing
  returning * into sess;

  if sess.id is null then
    select * into sess from attendance_sessions where user_id = p_user and work_date = today;
  end if;
  return sess;
end $$;

-- Check out. Idempotent: already-closed session is returned unchanged.
create or replace function ws_attendance_check_out(p_user uuid, p_org uuid)
returns attendance_sessions language plpgsql as $$
declare
  pol attendance_settings;
  sess attendance_sessions;
  secs int;
begin
  select * into sess from attendance_sessions
   where user_id = p_user and org_id = p_org
   order by check_in_at desc limit 1 for update;
  if not found then raise exception 'no attendance session to check out of'; end if;
  if sess.check_out_at is not null then return sess; end if;

  pol := ws_attendance_policy(p_org);
  secs := extract(epoch from (now() - sess.check_in_at))::int;

  update attendance_sessions
     set check_out_at = now(),
         duration_seconds = secs,
         status = case
                    when status = 'Late' then 'Late'
                    when secs < pol.half_day_hours * 3600 then 'Half Day'
                    else status end
   where id = sess.id
  returning * into sess;
  return sess;
end $$;

-- Admin correction with audit trail.
create table if not exists attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  corrected_by uuid references users(id) on delete set null,
  old_check_in timestamptz,
  old_check_out timestamptz,
  new_check_in timestamptz,
  new_check_out timestamptz,
  reason text not null check (length(trim(reason)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_att_corr_session on attendance_corrections(session_id);

create or replace function ws_attendance_admin_correct(
  p_session uuid, p_org uuid, p_admin uuid,
  p_check_in timestamptz, p_check_out timestamptz, p_status text, p_reason text)
returns attendance_sessions language plpgsql as $$
declare old attendance_sessions; sess attendance_sessions;
begin
  select * into old from attendance_sessions where id = p_session and org_id = p_org for update;
  if not found then raise exception 'attendance session not found'; end if;
  perform set_config('app.attendance_correction','on', true);
  update attendance_sessions set
      check_in_at = coalesce(p_check_in, check_in_at),
      check_out_at = coalesce(p_check_out, check_out_at),
      status = coalesce(p_status, status),
      duration_seconds = case when coalesce(p_check_out, check_out_at) is not null
        then extract(epoch from (coalesce(p_check_out, check_out_at) - coalesce(p_check_in, check_in_at)))::int end,
      is_corrected = true, correction_note = p_reason, corrected_by = p_admin
   where id = p_session returning * into sess;
  insert into attendance_corrections(org_id, session_id, corrected_by, old_check_in, old_check_out,
                                     new_check_in, new_check_out, reason)
  values (p_org, p_session, p_admin, old.check_in_at, old.check_out_at, sess.check_in_at, sess.check_out_at, p_reason);
  return sess;
end $$;

-- ------------------------------------------------------------
-- 4. Leave
-- ------------------------------------------------------------
create table if not exists leave_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  is_paid boolean not null default true,
  annual_quota_days integer check (annual_quota_days is null or annual_quota_days >= 0),
  requires_document boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_leave_cat_org_name on leave_categories(org_id, lower(name));

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references leave_categories(id),
  start_date date not null,
  end_date date not null,
  total_days integer generated always as (end_date - start_date + 1) stored,
  reason text not null check (length(trim(reason)) > 0),
  attachment_path text, -- private storage object path, never a public URL
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected','Cancelled')),
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  admin_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_leave_dates check (end_date >= start_date),
  constraint chk_leave_span check (end_date - start_date <= 365),
  -- Prevent duplicate / overlapping active requests for the same person.
  constraint ex_leave_no_overlap exclude using gist (
    user_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('Pending','Approved'))
);
create index if not exists idx_leave_org_status on leave_requests(org_id, status, created_at desc);
create index if not exists idx_leave_user on leave_requests(user_id, start_date desc);

-- Decision fields are write-once: a reviewed request cannot be flipped later,
-- and only Pending requests may be reviewed.
create or replace function ws_leave_guard() returns trigger
language plpgsql as $$
begin
  if new.user_id <> old.user_id or new.org_id <> old.org_id or new.category_id <> old.category_id
     or new.start_date <> old.start_date or new.end_date <> old.end_date then
    if old.status <> 'Pending' then
      raise exception 'only pending leave requests can be edited';
    end if;
  end if;
  if new.status is distinct from old.status then
    if old.status <> 'Pending' then
      raise exception 'leave request already %', old.status;
    end if;
    if new.status in ('Approved','Rejected') and new.reviewed_by is null then
      raise exception 'reviewer required';
    end if;
    if new.status in ('Approved','Rejected') then new.reviewed_at := now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_leave_guard on leave_requests;
create trigger trg_leave_guard before update on leave_requests
  for each row execute function ws_leave_guard();
drop trigger if exists trg_leave_updated on leave_requests;
create trigger trg_leave_updated before update on leave_requests
  for each row execute function ws_set_updated_at();

-- The reviewer must belong to the same org as the request.
create or replace function ws_leave_reviewer_org() returns trigger
language plpgsql as $$
begin
  if new.reviewed_by is not null and not exists
     (select 1 from users where id = new.reviewed_by and org_id = new.org_id) then
    raise exception 'reviewer must belong to the same organization';
  end if;
  return new;
end $$;
drop trigger if exists trg_leave_reviewer_org on leave_requests;
create trigger trg_leave_reviewer_org before insert or update of reviewed_by on leave_requests
  for each row execute function ws_leave_reviewer_org();

-- Default leave categories for every organization, now and in future.
create or replace function ws_seed_leave_categories(p_org uuid) returns void
language sql as $$
  insert into leave_categories(org_id, name, is_paid, annual_quota_days, requires_document) values
    (p_org,'Casual Leave',true,10,false),
    (p_org,'Annual Leave',true,14,false),
    (p_org,'Sick Leave',true,8,false),
    (p_org,'Other / Unpaid Leave',false,null,false)
  on conflict (org_id, lower(name)) do nothing;
$$;

select ws_seed_leave_categories(id) from organizations;

create or replace function ws_org_after_insert() returns trigger
language plpgsql as $$
begin
  perform ws_seed_leave_categories(new.id);
  return new;
end $$;
drop trigger if exists trg_org_seed_leave on organizations;
create trigger trg_org_seed_leave after insert on organizations
  for each row execute function ws_org_after_insert();

-- Per-day view used by the attendance chart: present / late / half-day come
-- from sessions, approved leave is its own state and never counts as absent.
create or replace function ws_month_attendance(p_user uuid, p_org uuid, p_month date)
returns table(day date, state text, worked_seconds integer)
language sql stable as $$
  with pol as (select * from ws_attendance_policy(p_org)),
  days as (
    select d::date as day
    from generate_series(date_trunc('month', p_month)::date,
                         (date_trunc('month', p_month) + interval '1 month - 1 day')::date,
                         interval '1 day') d
  )
  select d.day,
    case
      when lv.id is not null then 'Leave'
      when s.id is not null then case s.status when 'Late' then 'Late'
                                               when 'Half Day' then 'Half Day'
                                               when 'Incomplete' then 'Incomplete'
                                               else 'Present' end
      when (select weekend_days from pol) @> array[extract(dow from d.day)::int] then 'Weekend'
      when d.day > (now() at time zone (select timezone from pol))::date then 'Upcoming'
      else 'Absent'
    end,
    s.duration_seconds
  from days d
  left join attendance_sessions s on s.user_id = p_user and s.work_date = d.day
  left join leave_requests lv on lv.user_id = p_user and lv.status = 'Approved'
       and d.day between lv.start_date and lv.end_date;
$$;

-- ------------------------------------------------------------
-- 5. Notifications: per-user read receipts + de-duplication
-- Existing notifications stay as-is (org_id / target_role / target_user_id).
-- ------------------------------------------------------------
-- target_user_id is used by the app but missing from db/schema.sql; harmless if it already exists.
alter table notifications add column if not exists target_user_id uuid references users(id) on delete cascade;
alter table notifications add column if not exists dedupe_key text;
alter table notifications add column if not exists link text;
alter table notifications add column if not exists entity_type text;
alter table notifications add column if not exists entity_id uuid;
create unique index if not exists uq_notifications_dedupe
  on notifications(dedupe_key) where dedupe_key is not null;

create table if not exists notification_reads (
  notification_id uuid not null references notifications(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);
create index if not exists idx_notification_reads_user on notification_reads(user_id);

-- ------------------------------------------------------------
-- 6. Lock down every new table: RLS on, no policies, no anon/authenticated grants
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'departments','designations','employees','attendance_sessions','attendance_settings',
    'attendance_corrections','leave_categories','leave_requests','notification_reads'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- Functions: callable by the backend (service role) only.
revoke all on function ws_attendance_check_in(uuid,uuid) from public, anon, authenticated;
revoke all on function ws_attendance_check_out(uuid,uuid) from public, anon, authenticated;
revoke all on function ws_attendance_admin_correct(uuid,uuid,uuid,timestamptz,timestamptz,text,text) from public, anon, authenticated;
revoke all on function ws_month_attendance(uuid,uuid,date) from public, anon, authenticated;
