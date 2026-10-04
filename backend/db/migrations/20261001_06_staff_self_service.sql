-- ============================================================
-- WorkSphere migration 06 (2026-10-01), run AFTER _05
-- Goals: status/progress are driven by the employee. Training: employee
-- "interested" votes. Idempotent. Same deny-all RLS model as earlier migrations.
-- ============================================================

create or replace function ws_goal_normalize() returns trigger
language plpgsql as $$
begin
  if new.status = 'Cancelled' then return new; end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- status was chosen explicitly: it decides the progress
    if new.status = 'Completed' then new.progress := 100;
    elsif new.status = 'Not Started' then new.progress := 0;
    elsif new.progress >= 100 then new.progress := 99;
    end if;
  else
    -- progress was changed (or the row is new): it decides the status
    if new.progress >= 100 then new.status := 'Completed'; new.progress := 100;
    elsif new.progress > 0 then new.status := 'In Progress';
    elsif new.status = 'Completed' then new.status := 'In Progress';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_goal_normalize on performance_goals;
create trigger trg_goal_normalize before insert or update on performance_goals
  for each row execute function ws_goal_normalize();

create table if not exists training_interests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  program_id uuid not null references training_programs(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_training_interest unique (program_id, employee_id)
);
create index if not exists idx_training_interests_org on training_interests(org_id, program_id);

do $$
declare r record;
begin
  for r in select * from (values ('program_id','training_programs'), ('employee_id','employees')) as t(col, ref) loop
    execute format('drop trigger if exists %I on training_interests', 'trg_org_training_interests_' || r.col);
    execute format('create trigger %I before insert or update on training_interests for each row execute function ws_assert_same_org(%L, %L)',
                   'trg_org_training_interests_' || r.col, r.col, r.ref);
  end loop;
end $$;

alter table training_interests enable row level security;
revoke all on training_interests from anon, authenticated;
