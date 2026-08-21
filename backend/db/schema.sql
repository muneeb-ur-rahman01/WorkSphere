-- ============================================================
-- CampOS Database Schema (Postgres / Supabase)
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query)
-- ============================================================

create extension if not exists "pgcrypto";

-- ================================
-- Organizations (NGOs / Tenants)
-- ================================
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  sub_plan text not null default 'Basic Plan',
  status text not null default 'Pending', -- Pending | Active | Suspended
  created_at timestamptz not null default now()
);

-- ================================
-- Users (SuperAdmin, OrgAdmin, Employee, Intern, Volunteer, Membership, Executive Director)
-- ================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null, -- SuperAdmin | OrgAdmin | Employee | Intern | Volunteer | Membership | Executive Director
  org_id uuid references organizations(id) on delete cascade,
  status text not null default 'Pending', -- Pending | Active | Suspended | Rejected
  assigned_mentor text,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_org on users(org_id);

-- ================================
-- Password Reset (Forgot Password flow)
-- We store only a SHA-256 hash of the reset token (never the raw token),
-- so a leaked database can't be used to reset accounts. The raw token is
-- emailed to the user once and never persisted anywhere.
-- ================================
alter table users add column if not exists reset_token_hash text;
alter table users add column if not exists reset_token_expires timestamptz;

create index if not exists idx_users_reset_token_hash on users(reset_token_hash);

-- ================================
-- Camps / Events
-- ================================
create table if not exists camps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  location text not null,
  date date not null,
  description text,
  status text not null default 'Upcoming', -- Upcoming | Completed | Cancelled
  created_at timestamptz not null default now()
);

create index if not exists idx_camps_org on camps(org_id);

-- ================================
-- Events
-- Independent from Camps: general org events (trainings, fundraisers,
-- awareness drives, community outreach, etc.) that don't need the
-- staff-availability roster workflow that Camps use.
-- ================================
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  location text not null,
  date date not null,
  description text,
  event_type text not null default 'General', -- General | Training | Fundraiser | Awareness | Outreach
  status text not null default 'Upcoming', -- Upcoming | Completed | Cancelled
  created_at timestamptz not null default now()
);

create index if not exists idx_events_org on events(org_id);

-- ================================
-- Tasks
-- ================================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  assigned_to_id uuid references users(id) on delete set null,
  priority text not null default 'Medium', -- Low | Medium | High
  due_date date,
  status text not null default 'Pending', -- Pending | Accepted | In Progress | Completed
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_org on tasks(org_id);
create index if not exists idx_tasks_assignee on tasks(assigned_to_id);

-- Unread indicators for the comment thread below. Flips true for the "other
-- side" whenever someone posts, and is cleared for whichever side opens the
-- thread. Admin-side is shared across all OrgAdmins in the org (same model
-- notifications already use for org-wide visibility).
alter table tasks add column if not exists has_unread_for_admin boolean not null default false;
alter table tasks add column if not exists has_unread_for_assignee boolean not null default false;

-- ================================
-- Task Comments (discussion thread on a task)
-- Author name/role are denormalized at post-time so the thread still reads
-- correctly even if the author's account is later renamed or removed.
-- ================================
create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  author_name text not null,
  author_role text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_comments_task on task_comments(task_id, created_at);

-- ================================
-- Notifications
-- ================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade, -- null = system-wide broadcast
  title text not null,
  message text not null,
  type text not null default 'General',
  target_role text not null default 'All',
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_org on notifications(org_id);

-- ================================
-- Availability
-- ================================
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references camps(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'Available', -- Available | Not Available | Maybe
  updated_at timestamptz not null default now(),
  unique(camp_id, user_id)
);

create index if not exists idx_availability_camp on availability(camp_id);

-- ================================
-- Prescriptions (AI Voice-to-Text output)
-- ================================
create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  patient_name text,
  medicines jsonb not null default '[]'::jsonb,
  advice text,
  raw_transcript text,
  audio_mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_prescriptions_org on prescriptions(org_id);
create index if not exists idx_prescriptions_creator on prescriptions(created_by);

-- ================================
-- Subscription / Billing columns on organizations
-- (gateway-agnostic: works with JazzCash, PayFast, or any future adapter —
-- see backend/utils/paymentGateways/ and backend/config/plans.js)
-- ================================
alter table organizations add column if not exists billing_cycle text not null default 'Monthly'; -- Monthly | 6 Months | Yearly
alter table organizations add column if not exists plan_price numeric(10,2) not null default 0;
alter table organizations add column if not exists payment_status text not null default 'Unpaid'; -- Unpaid | Paid
alter table organizations add column if not exists subscription_start timestamptz;
alter table organizations add column if not exists subscription_end timestamptz;
alter table organizations add column if not exists last_expiry_notified_at timestamptz;

-- Subscription lifecycle state, independent of the SuperAdmin approval
-- `status` column above. See backend/middleware/subscriptionAccess.js for
-- the full state machine and the single canUseFeature()/requireOperational()
-- authorization path that reads it.
alter table organizations add column if not exists subscription_status text not null default 'TrialPending';
-- TrialPending | Active | PastDue | Suspended | Cancelled | Expired

-- 10-day payment period after registration (and, more generally, "when is
-- the next payment due" for the org's current billing cycle).
alter table organizations add column if not exists registration_date timestamptz not null default now();
alter table organizations add column if not exists payment_due_at timestamptz;
alter table organizations add column if not exists amount_due numeric(10,2) not null default 0;

create index if not exists idx_organizations_subscription_status on organizations(subscription_status);
create index if not exists idx_organizations_payment_due on organizations(payment_due_at);

-- ================================
-- Payments (gateway-agnostic)
-- ================================
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  plan text not null,
  amount numeric(10,2) not null,
  currency text not null default 'PKR',
  method text not null default 'JazzCash', -- kept for backward compatibility; see `gateway`
  status text not null default 'Pending', -- Pending | Completed | Failed | Cancelled | Refunded
  txn_ref_no text not null unique,
  jazzcash_txn_id text, -- legacy column name, kept for existing rows; see provider_txn_id for new gateways
  response_code text,
  response_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Gateway-agnostic columns. `provider_txn_id` is unique-but-nullable so a
-- gateway's own transaction id can be used as an idempotency key: a
-- duplicate callback for the same provider transaction updates the
-- existing row instead of creating a second payment record.
alter table payments add column if not exists gateway text not null default 'JazzCash'; -- JazzCash | PayFast | ...
alter table payments add column if not exists provider_txn_id text;
alter table payments add column if not exists provider_metadata jsonb not null default '{}'::jsonb; -- non-sensitive gateway response fields only, never card data
alter table payments add column if not exists org_snapshot_plan text; -- plan at time of payment, for audit history even if the plan later changes
alter table payments add column if not exists initiated_by uuid references users(id) on delete set null;
alter table payments add column if not exists refunded_at timestamptz;
alter table payments add column if not exists refund_reference text;

create index if not exists idx_payments_org on payments(org_id);
create index if not exists idx_payments_txnref on payments(txn_ref_no);
create unique index if not exists idx_payments_provider_txn_id on payments(provider_txn_id) where provider_txn_id is not null;

-- ================================
-- Billing / Audit Trail (immutable — insert-only, never updated or deleted
-- by application code). Every payment-related state transition is logged
-- here so Super Admin can reconstruct exactly what happened and when.
-- ================================
create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  event_type text not null, -- see BILLING_EVENTS in backend/utils/billingAudit.js
  amount numeric(10,2),
  currency text default 'PKR',
  txn_ref_no text,
  previous_status text,
  new_status text,
  gateway text,
  metadata jsonb not null default '{}'::jsonb, -- non-sensitive context only, never card data
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_events_org on billing_events(org_id, created_at desc);
create index if not exists idx_billing_events_type on billing_events(event_type);

-- ================================
-- Discussion Groups (org-internal department/group chat channels)
-- ================================
create table if not exists discussion_groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  is_open boolean not null default false, -- true = every active org member is auto-enrolled (e.g. "Open Discussion")
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists discussion_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references discussion_groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Author name/role are denormalized at post-time so the thread still reads
-- correctly even if the author's account is later renamed or removed.
create table if not exists discussion_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references discussion_groups(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  author_name text not null,
  author_role text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_discussion_groups_org on discussion_groups(org_id);
create index if not exists idx_discussion_members_group on discussion_group_members(group_id);
create index if not exists idx_discussion_members_user on discussion_group_members(user_id);
create index if not exists idx_discussion_messages_group on discussion_messages(group_id, created_at);

-- ================================
-- Staff Section Permissions ("Accessibility")
-- Lets an Organization Admin grant an individual staff member access to a
-- specific dashboard section beyond what their role would normally see
-- (e.g. give an HR Employee access to Registration Requests). Scalable:
-- new sections just need a new section_key - see ASSIGNABLE_SECTIONS in
-- backend/controllers/permissionController.js, the single source of truth
-- for which keys are valid.
-- ================================
create table if not exists staff_permissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  section_key text not null,
  granted_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, section_key)
);

create index if not exists idx_staff_permissions_org on staff_permissions(org_id);
create index if not exists idx_staff_permissions_user on staff_permissions(user_id);

-- Direct-to-user notifications (e.g. "you were granted access to X"),
-- additive to the existing org-wide / target_role broadcast model above.
-- A row can have target_user_id set (this specific user only) while still
-- keeping org_id for tenant scoping.
alter table notifications add column if not exists target_user_id uuid references users(id) on delete cascade;
create index if not exists idx_notifications_target_user on notifications(target_user_id);

-- ================================
-- Seed: default Super Admin (password: password)
-- Password hash below is bcrypt("password") - CHANGE THIS after first login in production.
-- ================================
insert into users (full_name, email, password_hash, role, org_id, status)
values (
  'Sara Khan (SaaS Owner)',
  'superadmin@campos.com',
  '$2b$10$5UUny.n1cfpf8ZEoji8PCe6Zj7Q9zg/bS0YqfJBVBvREdVAbxz.RS',
  'SuperAdmin',
  null,
  'Active'
)
on conflict (email) do nothing;
