-- ============================================================
-- WorkSphere Phase 5b migration (2026-09-30), run AFTER _04
-- Chart of accounts, ledger, invoices/AR, bills/AP, payroll->ledger sync,
-- staff donations. Idempotent. Same deny-all RLS model as earlier migrations.
-- ============================================================

create table if not exists chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  code text not null check (code ~ '^[A-Za-z0-9.-]{1,12}$'),
  name text not null,
  category text not null check (category in ('Asset','Liability','Equity','Income','Expense')),
  description text,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_coa_org_code unique (org_id, code)
);

create or replace function ws_seed_chart_of_accounts(p_org uuid) returns void
language sql as $$
  insert into chart_of_accounts(org_id, code, name, category, is_system, description) values
    (p_org,'1000','Cash & Bank','Asset',true,'Operating cash and bank balances'),
    (p_org,'1200','Accounts Receivable','Asset',true,'Amounts owed to the organization'),
    (p_org,'2100','Accounts Payable','Liability',true,'Amounts the organization owes'),
    (p_org,'3000','Net Assets','Equity',true,null),
    (p_org,'4000','Donations','Income',true,'Donations and fundraising'),
    (p_org,'4100','Grants','Income',true,null),
    (p_org,'4900','Other Income','Income',true,null),
    (p_org,'5100','Salaries & Wages','Expense',true,'Payroll expense (synced from payroll)'),
    (p_org,'5900','Operating Expenses','Expense',true,null)
  on conflict (org_id, code) do nothing;
$$;
select ws_seed_chart_of_accounts(id) from organizations;

create or replace function ws_org_after_insert() returns trigger
language plpgsql as $$
begin
  perform ws_seed_leave_categories(new.id);
  perform ws_seed_chart_of_accounts(new.id);
  return new;
end $$;

-- ------------------------------------------------------------ ledger
create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  txn_date date not null default current_date,
  type text not null check (type in ('Income','Expense')),
  account_id uuid not null references chart_of_accounts(id),
  category text not null default 'Other',
  amount numeric(14,2) not null check (amount > 0),
  payment_method text,
  reference text,
  description text,
  donor_id uuid,                       -- soft link to donors (FK added below when possible)
  source_type text,                    -- payroll_run | invoice_payment | bill_payment | staff_donation | staff_donation_refund
  source_id uuid,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fin_txn_org_date on finance_transactions(org_id, txn_date desc);
-- Prevents duplicate postings when a payroll run / payment / donation is synced twice.
create unique index if not exists uq_fin_txn_source on finance_transactions(org_id, source_type, source_id) where source_type is not null;

do $$ begin
  if to_regclass('public.donors') is not null
     and not exists (select 1 from pg_constraint where conname = 'fk_fin_txn_donor') then
    begin
      alter table finance_transactions add constraint fk_fin_txn_donor foreign key (donor_id) references donors(id) on delete set null;
    exception when others then null; -- donors.id type differs: keep as soft link
    end;
  end if;
end $$;

-- System-generated rows can only be changed by the sync functions below.
create or replace function ws_fin_txn_guard() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.finance_sync', true), '') <> 'on' then
    if tg_op = 'DELETE' and old.source_type is not null then
      raise exception 'system-generated transactions cannot be deleted';
    end if;
    if tg_op = 'UPDATE' and old.source_type is not null then
      raise exception 'system-generated transactions cannot be edited';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_fin_txn_guard on finance_transactions;
create trigger trg_fin_txn_guard before update or delete on finance_transactions
  for each row execute function ws_fin_txn_guard();

-- ------------------------------------------------------------ invoices (AR)
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_number text not null,
  party_name text not null,
  party_email text,
  donor_id uuid,
  issue_date date not null default current_date,
  due_date date not null,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  account_id uuid references chart_of_accounts(id),
  status text not null default 'Draft' check (status in ('Draft','Sent','Partially Paid','Paid','Void')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_invoice_dates check (due_date >= issue_date),
  constraint chk_invoice_paid check (amount_paid <= amount)
);
create unique index if not exists uq_invoice_number on invoices(org_id, lower(invoice_number));
create index if not exists idx_invoices_org_status on invoices(org_id, status, due_date);

create table if not exists invoice_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  reference text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_invoice_payments_inv on invoice_payments(invoice_id);

-- ------------------------------------------------------------ bills (AP)
create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  bill_number text not null,
  vendor_name text not null,
  bill_date date not null default current_date,
  due_date date not null,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  account_id uuid references chart_of_accounts(id),
  status text not null default 'Unpaid' check (status in ('Unpaid','Partially Paid','Paid','Void')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_bill_dates check (due_date >= bill_date),
  constraint chk_bill_paid check (amount_paid <= amount)
);
create unique index if not exists uq_bill_number on bills(org_id, lower(vendor_name), lower(bill_number));
create index if not exists idx_bills_org_status on bills(org_id, status, due_date);

create table if not exists bill_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  reference text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_bill_payments_bill on bill_payments(bill_id);

-- Payments: validate against outstanding balance, update the document and post to the ledger atomically.
create or replace function ws_account_id(p_org uuid, p_code text) returns uuid
language sql stable as $$ select id from chart_of_accounts where org_id = p_org and code = p_code $$;

create or replace function ws_invoice_payment_apply() returns trigger
language plpgsql as $$
declare inv invoices; new_paid numeric;
begin
  select * into inv from invoices where id = new.invoice_id for update;
  if inv.org_id <> new.org_id then raise exception 'invoice must belong to the same organization'; end if;
  if inv.status not in ('Sent','Partially Paid') then raise exception 'payments can only be recorded against sent, unpaid invoices'; end if;
  new_paid := inv.amount_paid + new.amount;
  if new_paid > inv.amount then raise exception 'payment exceeds the outstanding balance'; end if;
  update invoices set amount_paid = new_paid, status = case when new_paid = amount then 'Paid' else 'Partially Paid' end where id = inv.id;
  perform set_config('app.finance_sync', 'on', true);
  insert into finance_transactions(org_id, txn_date, type, account_id, category, amount, payment_method, reference, description, donor_id, source_type, source_id, created_by)
  values (new.org_id, new.paid_on, 'Income', coalesce(inv.account_id, ws_account_id(new.org_id,'4900')), 'Invoice Payment', new.amount,
          new.method, coalesce(new.reference, inv.invoice_number), 'Payment for invoice ' || inv.invoice_number || ' (' || inv.party_name || ')',
          inv.donor_id, 'invoice_payment', new.id, new.created_by);
  perform set_config('app.finance_sync', 'off', true);
  return new;
end $$;
drop trigger if exists trg_invoice_payment_apply on invoice_payments;
create trigger trg_invoice_payment_apply before insert on invoice_payments
  for each row execute function ws_invoice_payment_apply();

create or replace function ws_bill_payment_apply() returns trigger
language plpgsql as $$
declare b bills; new_paid numeric;
begin
  select * into b from bills where id = new.bill_id for update;
  if b.org_id <> new.org_id then raise exception 'bill must belong to the same organization'; end if;
  if b.status not in ('Unpaid','Partially Paid') then raise exception 'payments can only be recorded against unpaid bills'; end if;
  new_paid := b.amount_paid + new.amount;
  if new_paid > b.amount then raise exception 'payment exceeds the outstanding balance'; end if;
  update bills set amount_paid = new_paid, status = case when new_paid = amount then 'Paid' else 'Partially Paid' end where id = b.id;
  perform set_config('app.finance_sync', 'on', true);
  insert into finance_transactions(org_id, txn_date, type, account_id, category, amount, payment_method, reference, description, source_type, source_id, created_by)
  values (new.org_id, new.paid_on, 'Expense', coalesce(b.account_id, ws_account_id(new.org_id,'5900')), 'Bill Payment', new.amount,
          new.method, coalesce(new.reference, b.bill_number), 'Payment for bill ' || b.bill_number || ' (' || b.vendor_name || ')',
          'bill_payment', new.id, new.created_by);
  perform set_config('app.finance_sync', 'off', true);
  return new;
end $$;
drop trigger if exists trg_bill_payment_apply on bill_payments;
create trigger trg_bill_payment_apply before insert on bill_payments
  for each row execute function ws_bill_payment_apply();

-- Payments are append-only (corrections = void the document / new entry).
create or replace function ws_no_payment_change() returns trigger
language plpgsql as $$
begin raise exception 'payments cannot be edited or deleted'; end $$;
drop trigger if exists trg_invoice_payment_immutable on invoice_payments;
create trigger trg_invoice_payment_immutable before update or delete on invoice_payments
  for each row execute function ws_no_payment_change();
drop trigger if exists trg_bill_payment_immutable on bill_payments;
create trigger trg_bill_payment_immutable before update or delete on bill_payments
  for each row execute function ws_no_payment_change();

-- Amount/identity of a document can't change once money has been applied.
create or replace function ws_doc_guard() returns trigger
language plpgsql as $$
begin
  if old.amount_paid > 0 and (new.amount <> old.amount) and new.amount_paid = old.amount_paid then
    raise exception 'amount cannot be changed after payments were recorded';
  end if;
  if old.status = 'Void' and new.status <> 'Void' then raise exception 'a void document cannot be reopened'; end if;
  if new.status = 'Void' and old.amount_paid > 0 then raise exception 'documents with payments cannot be voided'; end if;
  return new;
end $$;
drop trigger if exists trg_invoice_guard on invoices;
create trigger trg_invoice_guard before update on invoices for each row execute function ws_doc_guard();
drop trigger if exists trg_bill_guard on bills;
create trigger trg_bill_guard before update on bills for each row execute function ws_doc_guard();

-- ------------------------------------------------------------ payroll -> ledger
-- Idempotent: one ledger row per payroll run (unique source), amount refreshed on re-sync.
create or replace function ws_sync_payroll_run(p_run uuid, p_org uuid) returns uuid
language plpgsql as $$
declare run payroll_runs; tg numeric; td numeric; tn numeric; acc uuid; tid uuid; last_day date;
begin
  select * into run from payroll_runs where id = p_run and org_id = p_org for update;
  if not found then raise exception 'payroll run not found'; end if;
  select coalesce(sum(gross_salary),0), coalesce(sum(deductions),0), coalesce(sum(net_salary),0)
    into tg, td, tn from payroll_records where run_id = p_run;
  update payroll_runs set total_gross = tg, total_deductions = td, total_net = tn where id = p_run;
  if tg = 0 then return null; end if;
  acc := ws_account_id(p_org, '5100');
  if acc is null then
    insert into chart_of_accounts(org_id, code, name, category, is_system) values (p_org,'5100','Salaries & Wages','Expense',true)
    on conflict (org_id, code) do nothing;
    acc := ws_account_id(p_org, '5100');
  end if;
  last_day := (make_date(run.year, run.month, 1) + interval '1 month - 1 day')::date;
  perform set_config('app.finance_sync', 'on', true);
  insert into finance_transactions(org_id, txn_date, type, account_id, category, amount, reference, description, source_type, source_id, created_by)
  values (p_org, last_day, 'Expense', acc, 'Payroll', tg, 'PAYROLL-' || run.year || '-' || lpad(run.month::text,2,'0'),
          'Gross payroll ' || run.year || '-' || lpad(run.month::text,2,'0') || ' (net payable ' || tn || ', deductions ' || td || ')',
          'payroll_run', p_run, run.processed_by)
  on conflict (org_id, source_type, source_id) where source_type is not null
  do update set amount = excluded.amount, txn_date = excluded.txn_date, account_id = excluded.account_id, description = excluded.description
  returning id into tid;
  perform set_config('app.finance_sync', 'off', true);
  return tid;
end $$;

-- ------------------------------------------------------------ staff donations
create table if not exists staff_donations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  campaign_id uuid not null,           -- campaigns.id (existing table)
  amount numeric(12,2) not null check (amount > 0 and amount <= 10000000),
  currency text not null default 'PKR',
  donor_name text not null,
  donor_email text,
  payment_method text,
  status text not null default 'Pending' check (status in ('Pending','Succeeded','Failed','Refunded')),
  txn_ref_no text not null,
  idempotency_key text not null,
  provider text,
  provider_txn_id text,
  response_code text,
  response_message text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_staff_donation_ref unique (txn_ref_no),
  constraint uq_staff_donation_idem unique (user_id, idempotency_key)
);
create unique index if not exists uq_staff_donation_provider_txn on staff_donations(provider, provider_txn_id) where provider_txn_id is not null;
create index if not exists idx_staff_donations_org on staff_donations(org_id, created_at desc);

do $$ begin
  if to_regclass('public.campaigns') is not null
     and not exists (select 1 from pg_constraint where conname = 'fk_staff_donation_campaign') then
    begin
      alter table staff_donations add constraint fk_staff_donation_campaign foreign key (campaign_id) references campaigns(id) on delete restrict;
    exception when others then null;
    end;
  end if;
end $$;

-- Settle a gateway callback exactly once. Only a Pending donation can transition;
-- duplicate callbacks/webhooks return changed = false and post nothing.
drop function if exists ws_staff_donation_settle(text,boolean,text,text,text,text);
create or replace function ws_staff_donation_settle(p_txn text, p_success boolean, p_provider text,
                                                    p_provider_txn text, p_code text, p_msg text)
returns table(out_id uuid, out_org_id uuid, out_user_id uuid, out_amount numeric, out_status text, changed boolean)
language plpgsql as $$
declare d staff_donations;
begin
  update staff_donations s set
      status = case when p_success then 'Succeeded' else 'Failed' end,
      provider = coalesce(p_provider, s.provider), provider_txn_id = p_provider_txn,
      response_code = p_code, response_message = p_msg,
      verified_at = case when p_success then now() end
    where s.txn_ref_no = p_txn and s.status = 'Pending'
    returning s.* into d;
  if found then
    if p_success then
      perform set_config('app.finance_sync', 'on', true);
      insert into finance_transactions(org_id, txn_date, type, account_id, category, amount, payment_method, reference, description, source_type, source_id, created_by)
      values (d.org_id, current_date, 'Income', ws_account_id(d.org_id,'4000'), 'Donation', d.amount, d.payment_method, d.txn_ref_no,
              'Staff donation by ' || d.donor_name, 'staff_donation', d.id, d.user_id)
      on conflict (org_id, source_type, source_id) where source_type is not null do nothing;
      perform set_config('app.finance_sync', 'off', true);
    end if;
    return query select d.id, d.org_id, d.user_id, d.amount, d.status, true;
  else
    return query select s.id, s.org_id, s.user_id, s.amount, s.status, false from staff_donations s where s.txn_ref_no = p_txn;
  end if;
end $$;

-- Admin marks a verified donation as refunded (after refunding through the gateway) and reverses the ledger entry.
create or replace function ws_staff_donation_refund(p_id uuid, p_org uuid, p_admin uuid) returns staff_donations
language plpgsql as $$
declare d staff_donations;
begin
  update staff_donations set status = 'Refunded' where id = p_id and org_id = p_org and status = 'Succeeded' returning * into d;
  if not found then raise exception 'only succeeded donations can be refunded'; end if;
  perform set_config('app.finance_sync', 'on', true);
  insert into finance_transactions(org_id, txn_date, type, account_id, category, amount, reference, description, source_type, source_id, created_by)
  values (d.org_id, current_date, 'Expense', ws_account_id(d.org_id,'4000'), 'Donation Refund', d.amount, d.txn_ref_no,
          'Refund of staff donation by ' || d.donor_name, 'staff_donation_refund', d.id, p_admin)
  on conflict (org_id, source_type, source_id) where source_type is not null do nothing;
  perform set_config('app.finance_sync', 'off', true);
  return d;
end $$;

-- ------------------------------------------------------------ tenant guards, updated_at, lockdown
do $$
declare r record;
begin
  for r in select * from (values
    ('finance_transactions','account_id','chart_of_accounts'),
    ('invoices','account_id','chart_of_accounts'), ('bills','account_id','chart_of_accounts'),
    ('invoice_payments','invoice_id','invoices'), ('bill_payments','bill_id','bills')
  ) as t(tbl, col, ref) loop
    execute format('drop trigger if exists %I on %I', 'trg_org_' || r.tbl || '_' || r.col, r.tbl);
    execute format('create trigger %I before insert or update on %I for each row execute function ws_assert_same_org(%L, %L)',
                   'trg_org_' || r.tbl || '_' || r.col, r.tbl, r.col, r.ref);
  end loop;

  for r in select unnest(array['chart_of_accounts','finance_transactions','invoices','invoice_payments','bills','bill_payments','staff_donations']) as tbl loop
    execute format('alter table %I enable row level security', r.tbl);
    execute format('revoke all on %I from anon, authenticated', r.tbl);
  end loop;
  for r in select unnest(array['chart_of_accounts','finance_transactions','invoices','bills','staff_donations']) as tbl loop
    execute format('drop trigger if exists %I on %I', 'trg_upd_' || r.tbl, r.tbl);
    execute format('create trigger %I before update on %I for each row execute function ws_set_updated_at()', 'trg_upd_' || r.tbl, r.tbl);
  end loop;
end $$;

revoke all on function ws_sync_payroll_run(uuid,uuid) from public, anon, authenticated;
revoke all on function ws_staff_donation_settle(text,boolean,text,text,text,text) from public, anon, authenticated;
revoke all on function ws_staff_donation_refund(uuid,uuid,uuid) from public, anon, authenticated;
