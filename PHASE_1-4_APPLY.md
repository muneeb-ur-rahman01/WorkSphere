# WorkSphere – Phases 1-4: apply & verify

Extract this zip over your project root (same folder structure). Files marked MOD in
"What changed" replace your copies; everything else is new.

## 1. Database (Supabase -> SQL Editor, run in this order; each is safe to re-run)
1. backend/db/migrations/20260929_01_hr_attendance_leave_foundation.sql
2. backend/db/migrations/20260929_02_leave_storage_and_clock.sql
3. backend/db/migrations/20260929_03_hr_employees_support.sql

Migration 01 needs the tables organizations, users, notifications (already in your DB).
The new tables have RLS enabled with no policies and anon/authenticated access revoked:
the app's own JWT + service-role backend is the only way in (see header of migration 01).

## 2. Backend
- New: routes/attendanceRoutes.js, leaveRoutes.js, hrRoutes.js; matching controllers and services.
- MOD: server.js (3 mounts: /api/attendance, /api/leave, /api/hr), utils/auditLog.js (new action keys).
- No new npm packages, no new environment variables.
- Restart the backend.

## 3. Frontend
- New: layouts/TopNav.jsx, pages (StaffAttendance, StaffLeave, StaffOverview, AttendanceLeave,
  EmployeeProfiles, OrgStructure), shared/AttendanceChart, shared/HrUi, utils/hrFormat.js.
- MOD: layouts/DashboardLayout.jsx (sidebar replaced by TopNav + new nav entries),
  routes/AppRoutes.jsx (new routes), pages/organization/staff/StaffDashboard.jsx
  (profile card, attendance chart, six blue-bordered grid cards).
- No new npm packages.

## 4. Verify after deploying
SQL (Supabase SQL Editor):
  select tablename, rowsecurity from pg_tables where schemaname='public'
    and tablename in ('departments','designations','employees','attendance_sessions',
    'attendance_settings','attendance_corrections','leave_categories','leave_requests','notification_reads');
  -- every row must show rowsecurity = true
  select count(*) from pg_policies where schemaname='public' and tablename in ('employees','leave_requests','attendance_sessions');
  -- expect 0 (deny-all for anon/authenticated by design)
  select id, public from storage.buckets where id in ('leave-attachments','employee-photos');
  -- expect public = false for both
  select name from leave_categories limit 4;  -- Casual / Annual / Sick / Other-Unpaid per org

App (log in as OrgAdmin, then as an Employee):
  1. OrgAdmin -> User & Access Management -> Employee Profiles & Records -> "Create records for all staff".
  2. OrgAdmin -> Roles, Departments & Designations: add a department + designation, assign in an employee profile.
  3. Employee -> Attendance: Check In, refresh the page (timer must continue), Check Out.
  4. Employee -> Leave: submit a request (try a PDF attachment - this exercises Supabase Storage).
  5. OrgAdmin -> Attendance & Leave -> Leave Requests: Accept. Employee sees Approved + gets a notification.
  6. Employee -> My Workspace: profile card, monthly chart (approved leave is olive "Leave", not red "Absent"), 6 grid cards.
  7. Employee -> camera icon on profile card: upload a JPG/PNG (exercises the employee-photos bucket).

## Not in this zip yet (later phases)
Recruitment/onboarding, payroll + CSV export, performance, training, employee documents,
benefits, finance sub-sections, staff donations / fundraising report, notification-center wiring,
SuperAdmin notifications.
