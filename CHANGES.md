# CampOS — Change Summary

> **Update (2nd pass):** Google Maps was removed entirely per request (it
> required a billing-enabled Google Cloud project). Camp/Event location is
> back to plain manual text entry, exactly like the original app — no
> Maps dependency, no API key, no cost. Accessibility now has **3**
> assignable sections instead of 1: **Registration Requests, Camps,
> Events** — see the updated section 4/5 below. Several touched pages
> (Accessibility, Registration Requests, Edit Role modal) also got a
> modernized visual treatment (gradient icon badges, rounded-2xl cards,
> softer shadows, smoother hover/transition states) without altering the
> existing Dashboard layout, navigation, or colors elsewhere.

This documents everything implemented against the development prompt
(registration fixes, Accessibility, staff role editing, and temporarily
hiding Payment Method / Timer). No existing Dashboard layout, navigation,
colors, or unrelated UI was changed — new UI was added only where the
prompt required it.

## ⚙️ Setup required before running

1. **Database migration** — run the additions at the bottom of
   `backend/db/schema.sql` against your Supabase project (SQL Editor →
   New query → paste and run). New objects:
   - `staff_permissions` table (Accessibility grants)
   - `notifications.target_user_id` column (direct-to-user notifications)
   The whole file is idempotent (`create table if not exists` /
   `add column if not exists`), so it's safe to run the full file again
   even on an existing database.

2. No new env vars are required. (An earlier draft of this feature added
   a Google Maps key — that was removed; camp/event location is a plain
   text field again.) Existing SMTP config (see `backend/.env.example`)
   is reused for the new "registration accepted" email — if SMTP isn't
   configured, it logs to the console instead of sending, same as the
   existing password-reset email does.

---

## 1. Payment Method & Timer — hidden, not deleted

- `frontend/src/Config/constant.js` — new `PAYMENTS_ENABLED = false` flag.
  Flip it back to `true` to restore everything.
- `backend/middleware/subscriptionAccess.js` — new
  `PAYMENT_ENFORCEMENT_ENABLED = false` switch. `requireOperational()`
  now no-ops while it's off, so organizations are never blocked from
  camps/events/tasks by unpaid billing status (since there's currently no
  way for them to pay). All gateway code, DB columns, and the
  Billing/Payments architecture are untouched.
- Hidden behind the flag: "Billing & Subscription" / "Billing & Payments"
  nav items, the `CountdownTimer`, `PaymentReminderBanner`,
  `SuspendedNotice`, and `PaymentAlertModal` components, and the
  Pay Now / plan-selection UI on the Billing page. The Billing route
  itself now redirects to the dashboard if visited directly by URL while
  disabled.
- Nothing else on those pages changed (payment history/audit trail code
  still exists, just unreachable while the nav entry is hidden).

## 2. Staff registration — organization dropdown fix

**Root cause:** the "Select Organization" dropdown only ever read from
`AppContext`'s `organizations` state, which is only populated for an
**authenticated** user. A visitor filling out the public registration
form was never logged in, so the list was always empty — hence "no
active organizations" even though active orgs existed.

**Fix:**
- `backend/controllers/organizationController.js` /
  `backend/routes/organizationRoutes.js` — new public, unauthenticated
  `GET /api/organizations/public` endpoint returning only `{id, name}`
  for organizations with `status = 'Active'`.
- `frontend/src/pages/auth/Register.jsx` — now fetches this endpoint
  directly on mount, independent of login state.
- Password policy: min 8 characters, at least one letter and one number,
  enforced both client-side (`frontend/src/utils/passwordValidation.js`,
  shown as a live validation message) and server-side
  (`backend/controllers/authController.js`, `STAFF_PASSWORD_REGEX`).
- Position/Role dropdown (Intern / Employee / Volunteer / Membership) was
  already present and working — left as-is.

## 3. Registration Request → Admin approval

- The request-creation and Pending Requests admin UI already existed and
  worked correctly — left functionally as-is, UI modernized (see below).
- **Fixed a real authorization bug**: `updateStaffStatus` only scoped
  the "same organization" check when `req.user.role === 'OrgAdmin'`,
  silently skipping that check for any other caller. Now anyone who
  isn't `SuperAdmin` is scoped to their own org.
- **New:** approving a Pending request (Pending → Active) now sends a
  real email — *"Your request has been accepted. You can now log in
  using your credentials."* — via a new
  `sendRegistrationAcceptedEmail()` in `backend/utils/mailer.js`
  (same console-log fallback pattern as the existing password-reset
  email when SMTP isn't configured).
- Rejecting a request already correctly prevented login
  (`status: 'Rejected'` is blocked at login) — unchanged.

## 4. Accessibility (staff section permissions) — 3 sections

- **DB:** `staff_permissions` table (`org_id, user_id, section_key,
  granted_by`), unique per `(user_id, section_key)`.
- **Backend:** `backend/controllers/permissionController.js` +
  `backend/routes/permissionRoutes.js` (`GET /sections`, `GET /me`,
  `GET /?userId=`, `POST /`, `DELETE /`). The list of assignable
  sections lives in one array (`ASSIGNABLE_SECTIONS`) and currently has
  **three** entries: `registration_requests`, `camps`, `events`. Adding
  a fourth section later is a one-line addition there plus wiring the
  relevant route with the existing `requireRoleOrSectionPermission`
  middleware (`backend/middleware/auth.js`) — no other backend or
  frontend change needed, the Accessibility page and staff nav both
  render off this same list automatically.
- `backend/routes/campRoutes.js` and `backend/routes/eventRoutes.js` now
  accept a staff member with the `camps` / `events` grant on create,
  edit, and delete — identical permissions to what an OrgAdmin has for
  that section, scoped to their own org.
- Granting access inserts a direct-to-user notification
  (`notifications.target_user_id`), and the section becomes visible in
  that employee's sidebar nav immediately — same workflow for all three
  sections.
- **Frontend:** `frontend/src/pages/organization/admin/Accessibility.jsx`
  — OrgAdmin picks a staff member, toggles checkboxes for Registration
  Requests / Camps / Events (each with its own icon). New nav item
  "Accessibility" under OrgAdmin. `AppContext` exposes `hasAccess()`,
  `myPermissions`, and the grant/revoke/list functions.
- `PendingRequests.jsx`, `Camps.jsx`, and `Events.jsx` are each now
  reachable by a staff member with the matching grant — same page, same
  data, same create/edit/approve/reject actions an OrgAdmin has. Someone
  without the grant is redirected back to their dashboard. The
  corresponding nav item ("Registration Requests" / "Camps" / "Events")
  only appears in a staff member's sidebar once granted.
- OrgAdmin always retains full access to all sections regardless of
  grants.

## 5. Camp / Event location — plain text (Google Maps removed)

Google Maps was tried in an earlier pass and then removed on request —
it needed a billing-enabled Google Cloud project, which isn't wanted
right now. Location is back to a simple manual text field, exactly as
in the original app, with no external dependency or API key. If you
want map-based location picking again later, it can be re-added the
same way without touching anything else.

## 6. Employee & Staff role editing

- `backend/controllers/userController.js` — new
  `PATCH /api/users/:id/role` (OrgAdmin only, scoped to their own org,
  refuses to touch admin accounts, clears a stale mentor assignment if
  the role changes away from Intern).
- `frontend/src/pages/organization/admin/OrgUsers.jsx` — new "Edit role"
  button per row + modal, using the existing role list
  (`STAFF_ROLES`) so it stays in sync with the rest of the app
  automatically. Since role also drives Accessibility grants and route
  access, no separate permission-migration step is needed — access is
  evaluated live off the current role/grants on every request.

## 7. UI polish (modernized, layout/nav/colors unchanged)

Touched pages got a visual refresh consistent with the app's existing
gradient/rounded-card language (already used on the Admin Overview):
- `Accessibility.jsx` — rounded-2xl cards with colored shadow accents,
  gradient icon badges, per-section icons, a live "N granted" counter
  next to the selected staff member.
- `PendingRequests.jsx` — rewritten from a plain HTML table to a card
  list: avatar circles, a pending-count pill in the header, softer
  hover states, and pill-style Approve/Reject buttons with lift-on-hover.
- `OrgUsers.jsx` Edit Role modal — rounded-2xl, backdrop blur, gradient
  icon badge, entrance animation (reusing the app's existing
  `animate-scale-up` utility).
No other pages, the sidebar, top bar, or color palette were touched.

## What wasn't touched

Dashboard layout, sidebar structure/colors, existing camps/events/tasks
CRUD logic (beyond the Accessibility permission check on the routes),
discussion groups, availability, prescriptions/AI, analytics, and the
SuperAdmin billing dashboard code are all unchanged beyond the additive
nav/flag gating described above.

## Testing note

This was implemented and reviewed as static code (syntax-checked with
`node -c` on every backend file, and brace/paren balance checked on
every changed frontend file) — there was no live Supabase database or
running dev server available in this environment to exercise the flows
end-to-end. Before deploying: run the schema migration, and smoke-test
the flows above (staff registration → approval → login, granting/
revoking each of the 3 Accessibility sections and confirming the nav
item + page access appears for that staff member, creating a camp/event
with a manually-typed location, and editing a staff member's role).

