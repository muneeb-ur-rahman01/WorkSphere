-- ============================================================
-- WorkSphere Phase 3 migration (2026-09-29), run AFTER 20260929_01
--  * ws_now(): database clock, so the UI's live timer offset uses the same
--    clock that stamps attendance rows (not the API server's clock).
--  * private Storage bucket for leave attachments.
-- Idempotent. Storage part only runs on Supabase (schema "storage" exists).
-- ============================================================

create or replace function ws_now() returns timestamptz
language sql stable as $$ select now() $$;
revoke all on function ws_now() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('leave-attachments', 'leave-attachments', false, 5242880,
            array['application/pdf','image/jpeg','image/png'])
    on conflict (id) do update
      set public = false,
          file_size_limit = 5242880,
          allowed_mime_types = array['application/pdf','image/jpeg','image/png'];
    -- No storage.objects policies are created on purpose: with RLS on and no
    -- policies, anon/authenticated cannot read or write the bucket. Only the
    -- backend (service role) touches it and hands out short-lived signed URLs
    -- after checking owner / same-org OrgAdmin.
  end if;
end $$;
