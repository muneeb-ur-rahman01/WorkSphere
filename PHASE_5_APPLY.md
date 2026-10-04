# WorkSphere - Phases 1-5 (complete project): apply & verify

This zip is the COMPLETE project (frontend + backend), with all five phases merged.
`backend/.env` is intentionally NOT included (it holds live keys): keep your own.

## 1. Rotate exposed secrets first
The zip you originally shared contained backend/.env with live credentials (Supabase service-role key,
JWT secret, Brevo, Gemini) and .env.example had a Gmail app password. Rotate them. The password has been
removed from .env.example in this version.

## 2. Database - Supabase SQL Editor, run in this exact order (each is safe to re-run)
 1. backend/db/migrations/20260929_01_hr_attendance_leave_foundation.sql
 2. backend/db/migrations/20260929_02_leave_storage_and_clock.sql
 3. backend/db/migrations/20260929_03_hr_employees_support.sql
 4. backend/db/migrations/20260930_04_hr_modules_payroll.sql
 5. backend/db/migrations/20260930_05_finance_donations.sql
Migrations 04/05 use `donors` and `campaigns` only through optional foreign keys (skipped automatically
if their id type differs). The existing `donations`/`expenses`/`documents` tables are not modified.
All new tables: RLS enabled, no policies, anon/authenticated revoked -> reachable only through the Express
backend (service role), which scopes every query by the caller's organization.

## 3. Backend environment (new, optional)
 BACKEND_URL, DONATION_RETURN_URL, DONATION_CURRENCY  (see backend/.env.example)
 Donations reuse PAYFAST_MERCHANT_ID / PAYFAST_SECURED_KEY / PAYFAST_* already in your env.
 In the PayFast merchant portal the callback/return URL for donations is
   {BACKEND_URL}/api/staff-donations/callback        (GET and POST, signature-verified)
 Donation transaction references start with "WSD-"; subscription payments keep using /api/payments/callback.
 No new npm packages. Restart backend + rebuild frontend.

## 4. What is new in this version (Phase 5)
 Org Admin > User & Access Management: Recruitment & Onboarding, Payroll & Salary Management (incl. CSV export),
   Performance Management, Training & Development, Employee Documents, Employee Benefits & Allowances.
 Org Admin > Finance & Documents: Chart of Accounts, Income & Revenue, Invoices & Payments, Accounts Payable,
   Accounts Receivable, Payroll Integration.
 Org Admin > Reports & Insights > Fundraising: new "Staff donations" section (verified-only totals, filters, refund marking).
 Staff: Donations (campaigns, donate via gateway, history).
 Notifications: read/unread now stored per user in the database (mark one / mark all), refreshed by the existing
   8-second poll; new events for payroll, finance, onboarding, documents, reviews, training, benefits, donations, subscriptions.

## 5. Payroll CSV export
 Org Admin > Payroll & Salary Management > "Records & CSV Export" > Export CSV
 Endpoint: GET /api/payroll/export.csv?month=&year=&departmentId=&employeeId=&paymentStatus=
 Columns: Employee ID, Employee Name, Department, Designation, Basic Salary, Allowances, Deductions,
   Gross Salary, Net Salary, Payroll Month, Payroll Year, Payment Date, Payment Status, Transaction Reference.
 Filters = exactly those applied to the table; none = all records of the admin's own organization.
 Filename: Payroll_September_2026.csv (month+year), Payroll_2026.csv, Payroll_All_Records.csv ...
 UTF-8 with BOM, RFC-4180 quoting, cells starting with = + - @ TAB CR are prefixed with ' (formula injection),
 streamed in 1,000-row pages (no truncation); empty result -> 404 message, no file.
 Access: OrgAdmin only, organization taken from the login token (never from the request).

## 6. Verify after deploying
 SQL:
  select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in
   ('job_openings','applicants','onboarding_tasks','performance_reviews','performance_goals','performance_feedback',
    'training_programs','training_enrollments','benefit_plans','employee_benefits','employee_documents',
    'employee_salaries','salary_components','payroll_runs','payroll_records','chart_of_accounts',
    'finance_transactions','invoices','invoice_payments','bills','bill_payments','staff_donations');  -- all true
  select count(*) from chart_of_accounts;            -- 9 per organization
  select id, public from storage.buckets where id in ('leave-attachments','employee-photos','employee-documents'); -- public=false
 Payroll CSV isolation: as Org A admin download the CSV; the same query as Org B admin must return 404
  "No payroll records are available..." (or only Org B rows).
 Donations: with PAYFAST credentials in sandbox, donate from a staff account; the row stays Pending until
  the gateway callback arrives; replay the callback - the ledger must still show exactly one income row:
  select count(*) from finance_transactions where source_type='staff_donation';

## 7. Known limits (be aware)
 - Not run against your Supabase project or the real PayFast sandbox. Storage uploads (leave attachments,
   employee photos, employee documents) and the PayFast field names/signature must be confirmed there.
 - The `donations` raised-amount shown to staff = existing donations + verified staff donations; the
   existing admin Fundraising charts still read only the old `donations` table (staff donations appear in the new section).
 - Staff cannot yet view their own payslips or documents (admin-only in this version).
 - Check-in/out events do not notify admins (would be noisy); attendance corrections do.
 - UI was verified with automated jsdom tests and a production build, not visually in a browser.
