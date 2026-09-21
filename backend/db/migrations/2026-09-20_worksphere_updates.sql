-- ============================================================
-- WorkSphere update migration  (2026-09-20)
-- Run once in Supabase -> SQL Editor -> New query.
-- Fully idempotent: safe to run again.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Discussion: replies + @mentions
-- ------------------------------------------------------------
alter table discussion_messages
  add column if not exists reply_to_id uuid
    references discussion_messages(id) on delete set null;

alter table discussion_messages
  add column if not exists mentions jsonb not null default '[]'::jsonb;

create index if not exists idx_discussion_messages_reply
  on discussion_messages(reply_to_id);

-- ------------------------------------------------------------
-- 2. Discussion: SuperAdmin <-> Organization Admin channels
--    (one channel per organization, named after the organization;
--     created automatically by the backend)
-- ------------------------------------------------------------
alter table discussion_groups
  add column if not exists is_platform boolean not null default false;

create index if not exists idx_discussion_groups_platform
  on discussion_groups(is_platform, org_id);

-- ------------------------------------------------------------
-- 3. Queries: address a query to one organization's admin.
--    org_id NULL = general platform query (answered by SuperAdmin).
-- ------------------------------------------------------------
alter table queries
  add column if not exists org_id uuid
    references organizations(id) on delete cascade;

create index if not exists idx_queries_org on queries(org_id);

-- ------------------------------------------------------------
-- 4. Home page "Upcoming Events & Camps"
--    Organizations that already have approved camps/events but whose
--    public switch was never turned on (this is why approved items
--    did not appear on the Home page). New approvals now switch it on
--    automatically; this backfills the existing ones.
-- ------------------------------------------------------------
update organizations
set public_events_enabled = true
where id in (
  select org_id from camps   where visibility_status = 'Approved'
  union
  select org_id from events  where visibility_status = 'Approved'
);
