-- ============================================================
-- WorkSphere Phase 5a migration (2026-09-30), run AFTER 20260929_01..03
-- Recruitment & onboarding, performance, training, benefits, employee
-- documents, payroll (salary history, components, runs, records).
-- Idempotent. Same security model as migration 01: RLS on, no policies,
-- anon/authenticated revoked; the Express backend (service role) is the
-- only access path and scopes every query by org_id.
-- ============================================================

-- Generic cross-tenant guard: a referenced row must belong to the same org.
-- usage: trigger ... execute function ws_assert_same_org('<fk_col>','<ref_table>')
create or replace function ws_assert_same_org() returns trigger
language plpgsql as $$
declare ref_id uuid; ref_org uuid;
begin
  ref_id := nullif(to_jsonb(new) ->> tg_argv[0], '')::uuid;
  if ref_id is null then return new; end if;
  execute format('select org_id from %I where id = $1', tg_argv[1]) into ref_org using ref_id;
  if ref_org is distinct from new.org_id then
    raise exception '% must belong to the same organization', tg_argv[0];
  end if;
  return new;
end $$;

-- ------------------------------------------------------------ recruitment
create table if not exists job_openings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  department_id uuid references departments(id) on delete set null,
  designation_id uuid references designations(id) on delete set null,
  description text,
  positions integer not null default 1 check (positions between 1 and 1000),
  status text not null default 'Draft' check (status in ('Draft','Open','Closed')),
  closing_date date,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_job_openings_org on job_openings(org_id, status);

create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  job_id uuid not null references job_openings(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  source text,
  notes text,
  status text not null default 'Applied' check (status in ('Applied','Screening','Interview','Offered','Hired','Rejected')),
  converted_employee_id uuid references employees(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_applicants_job_email on applicants(job_id, lower(email));
create index if not exists idx_applicants_org on applicants(org_id, status);

create table if not exists onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'Pending' check (status in ('Pending','Completed')),
  completed_at timestamptz,
  completed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_onboarding_emp on onboarding_tasks(employee_id, status);

-- ------------------------------------------------------------ performance
create table if not exists performance_reviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  reviewer_id uuid references users(id) on delete set null,
  period_label text not null,
  rating integer check (rating between 1 and 5),
  strengths text,
  improvements text,
  status text not null default 'Draft' check (status in ('Draft','Submitted','Acknowledged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_perf_reviews_emp on performance_reviews(org_id, employee_id);

create table if not exists performance_goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  status text not null default 'Not Started' check (status in ('Not Started','In Progress','Completed','Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_perf_goals_emp on performance_goals(org_id, employee_id);

create table if not exists performance_feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  given_by uuid references users(id) on delete set null,
  message text not null check (length(trim(message)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_perf_fb_emp on performance_feedback(org_id, employee_id);

-- ------------------------------------------------------------ training
create table if not exists training_programs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  provider text,
  start_date date,
  end_date date,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'Planned' check (status in ('Planned','Ongoing','Completed','Cancelled')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_training_dates check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists idx_training_programs_org on training_programs(org_id, status);

create table if not exists training_enrollments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  program_id uuid not null references training_programs(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  status text not null default 'Enrolled' check (status in ('Enrolled','In Progress','Completed','Dropped')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_training_enrollment unique (program_id, employee_id)
);

-- ------------------------------------------------------------ benefits
create table if not exists benefit_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'Benefit' check (kind in ('Benefit','Allowance')),
  description text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  min_service_months integer not null default 0 check (min_service_months >= 0),
  employment_types text[] not null default '{Full-time,Part-time,Contract,Intern,Volunteer}',
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_benefit_plans_name on benefit_plans(org_id, lower(name));

create table if not exists employee_benefits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid not null references benefit_plans(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'Active' check (status in ('Active','Ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_benefit_dates check (end_date is null or end_date >= start_date)
);
create unique index if not exists uq_employee_benefit_active on employee_benefits(plan_id, employee_id) where status = 'Active';

-- ------------------------------------------------------------ documents
create table if not exists employee_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  doc_type text not null default 'Other',
  file_path text not null,          -- private storage path, never a public URL
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  expiry_date date,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_employee_documents_emp on employee_documents(org_id, employee_id);

-- ------------------------------------------------------------ payroll
create table if not exists employee_salaries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  basic_salary numeric(12,2) not null check (basic_salary >= 0),
  effective_from date not null,
  note text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_salary_effective unique (employee_id, effective_from)
);

create table if not exists salary_components (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  kind text not null check (kind in ('Allowance','Deduction')),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_salary_components_emp on salary_components(org_id, employee_id);

create table if not exists payroll_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  status text not null default 'Draft' check (status in ('Draft','Processed','Paid')),
  total_gross numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  total_net numeric(14,2) not null default 0,
  processed_by uuid references users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_payroll_period unique (org_id, year, month)
);

create table if not exists payroll_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid not null references payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,
  -- snapshot so history and CSV exports stay stable if the employee later moves department
  employee_code text not null,
  employee_name text not null,
  department_name text,
  designation_title text,
  basic_salary numeric(12,2) not null check (basic_salary >= 0),
  allowances numeric(12,2) not null default 0 check (allowances >= 0),
  deductions numeric(12,2) not null default 0 check (deductions >= 0),
  gross_salary numeric(12,2) generated always as (basic_salary + allowances) stored,
  net_salary numeric(12,2) generated always as (basic_salary + allowances - deductions) stored,
  payroll_month integer not null check (payroll_month between 1 and 12),
  payroll_year integer not null,
  payment_status text not null default 'Pending' check (payment_status in ('Pending','Paid','Failed')),
  payment_date date,
  transaction_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_payroll_run_employee unique (run_id, employee_id),
  constraint chk_net_not_negative check (basic_salary + allowances - deductions >= 0)
);
alter table payroll_records add column if not exists department_id uuid references departments(id) on delete set null;
create index if not exists idx_payroll_records_org_period on payroll_records(org_id, payroll_year, payroll_month);
create index if not exists idx_payroll_records_emp on payroll_records(org_id, employee_id);

-- A paid payroll line is frozen (money already moved).
create or replace function ws_payroll_record_guard() returns trigger
language plpgsql as $$
begin
  if old.payment_status = 'Paid' and (
       new.basic_salary <> old.basic_salary or new.allowances <> old.allowances or new.deductions <> old.deductions
       or new.payment_status <> 'Paid' or new.employee_id <> old.employee_id) then
    raise exception 'paid payroll records cannot be modified';
  end if;
  return new;
end $$;
drop trigger if exists trg_payroll_record_guard on payroll_records;
create trigger trg_payroll_record_guard before update on payroll_records
  for each row execute function ws_payroll_record_guard();

create or replace function ws_payroll_record_no_delete() returns trigger
language plpgsql as $$
begin
  if old.payment_status = 'Paid' then raise exception 'paid payroll records cannot be deleted'; end if;
  return old;
end $$;
drop trigger if exists trg_payroll_record_no_delete on payroll_records;
create trigger trg_payroll_record_no_delete before delete on payroll_records
  for each row execute function ws_payroll_record_no_delete();

-- ------------------------------------------------------------ tenant guards + updated_at
do $$
declare r record;
begin
  for r in select * from (values
    ('job_openings','department_id','departments'), ('job_openings','designation_id','designations'),
    ('applicants','job_id','job_openings'), ('applicants','converted_employee_id','employees'),
    ('onboarding_tasks','employee_id','employees'),
    ('performance_reviews','employee_id','employees'), ('performance_goals','employee_id','employees'), ('performance_feedback','employee_id','employees'),
    ('training_enrollments','program_id','training_programs'), ('training_enrollments','employee_id','employees'),
    ('employee_benefits','plan_id','benefit_plans'), ('employee_benefits','employee_id','employees'),
    ('employee_documents','employee_id','employees'),
    ('employee_salaries','employee_id','employees'), ('salary_components','employee_id','employees'),
    ('payroll_records','run_id','payroll_runs'), ('payroll_records','employee_id','employees')
  ) as t(tbl, col, ref) loop
    execute format('drop trigger if exists %I on %I', 'trg_org_' || r.tbl || '_' || r.col, r.tbl);
    execute format('create trigger %I before insert or update on %I for each row execute function ws_assert_same_org(%L, %L)',
                   'trg_org_' || r.tbl || '_' || r.col, r.tbl, r.col, r.ref);
  end loop;

  for r in select unnest(array['job_openings','applicants','onboarding_tasks','performance_reviews','performance_goals',
      'performance_feedback','training_programs','training_enrollments','benefit_plans','employee_benefits',
      'employee_documents','employee_salaries','salary_components','payroll_runs','payroll_records']) as tbl loop
    execute format('drop trigger if exists %I on %I', 'trg_upd_' || r.tbl, r.tbl);
    execute format('create trigger %I before update on %I for each row execute function ws_set_updated_at()', 'trg_upd_' || r.tbl, r.tbl);
    execute format('alter table %I enable row level security', r.tbl);
    execute format('revoke all on %I from anon, authenticated', r.tbl);
  end loop;
end $$;

-- ------------------------------------------------------------ storage bucket
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('employee-documents', 'employee-documents', false, 10485760,
            array['application/pdf','image/jpeg','image/png'])
    on conflict (id) do update set public = false, file_size_limit = 10485760,
            allowed_mime_types = array['application/pdf','image/jpeg','image/png'];
  end if;
end $$;
