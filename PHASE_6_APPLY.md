# Phase 6 — staff self-service, analytics, page loader

Run in Supabase SQL editor (after 01–05): `backend/db/migrations/20261001_06_staff_self_service.sql`
(goal status/progress trigger + `training_interests` table). Tested on a scratch Postgres only, not on your Supabase.

- Admin → Performance → Goals: employee, title, due date, description only. Staff set status/progress.
- Staff dashboard: Goals, Reviews, Feedback, Training (I'm interested), Benefits cards after Upcoming Meetings.
- Admin → Training: "Interested" column + "Interested Staff" tab.
- Org Analytics: new "HR & Finance Insights" section (`GET /api/analytics/hr-insights`).
- 3-second centered route loader (`frontend/src/shared/RouteLoader`), logo static, ring rotates.
- No .env / .env.example files are included; keep your own.

Note: built on my previous delivery, so re-apply any of your own manual edits (e.g. your customized PerformanceManagement.jsx) if needed.
