-- ============================================================
-- WorkSphere Phase 4 migration (2026-09-29), run AFTER _01 and _02
--  * ws_next_employee_code(org): next EMP-0001 style code per organization
--  * private Storage bucket for employee profile photos
-- Idempotent.
-- ============================================================

create or replace function ws_next_employee_code(p_org uuid) returns text
language sql stable as $$
  select 'EMP-' || lpad((coalesce(max((substring(employee_code from '^EMP-(\d+)$'))::int), 0) + 1)::text, 4, '0')
  from employees where org_id = p_org;
$$;
revoke all on function ws_next_employee_code(uuid) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('employee-photos', 'employee-photos', false, 2097152, array['image/jpeg','image/png'])
    on conflict (id) do update
      set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png'];
    -- No storage.objects policies on purpose (deny-all for anon/authenticated);
    -- the backend hands out short-lived signed URLs after authorization checks.
  end if;
end $$;
