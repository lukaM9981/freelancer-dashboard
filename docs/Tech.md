# Olifant Workboard — Architecture and Technical Implementation

This document describes how the product defined in [PRD.md](./PRD.md) is built. The
database schema lives in [DB.md](./DB.md), the visual system in [Design.md](./Design.md).

## 1. Current state of the repository

Nothing is scaffolded yet. What exists:

- The documents in `docs/` (PRD, DB, Tech, Design).
- The design kit: `app/globals.css`, `app/fonts.ts`, `app/fonts/`, `app/icon.png`,
  `app/apple-icon.png`, `public/brand/`, `.cursor/rules/`, `design-system/`.
- The database: `supabase/migrations/0001`–`0014`, and the pgTAP tests in
  `supabase/tests/` (section 16).

Step 1 of the build order (section 17) creates the Next.js project around these files.
**After step 1, replace this section** with the real state, as on the Invoice Generator: the
installed packages with exact versions, the files that matter, and the Supabase project's
Postgres version.

**Packages to install** (pin exact versions at scaffold time and commit the lockfile)

| Package                           | Expected | Purpose                                                   |
| --------------------------------- | -------- | --------------------------------------------------------- |
| `next`                            | 16.x     | App Router, TypeScript, `proxy.ts`                         |
| `react` / `react-dom`             | 19.2.x   |                                                           |
| `typescript`                      | 5.x      | Strict mode, `@/*` path alias                             |
| `tailwindcss`, `@tailwindcss/postcss` | 4.x  | Theme from the kit's `globals.css`, no config file         |
| `tw-animate-css`                  | 1.x      | Animations used by shadcn components                       |
| `shadcn` (CLI)                    | 4.x      | `base-nova` style, `iconLibrary: "lucide"`                 |
| `@base-ui/react`                  | 1.x      | Primitive layer under the shadcn preset                    |
| `lucide-react`                    | latest   | Icons (Design.md §2)                                      |
| `@supabase/supabase-js`           | 2.x      |                                                           |
| `@supabase/ssr`                   | 0.x      | Cookie-based sessions                                      |
| `zod`                             | 4.x      | Schemas shared by forms and server actions                 |
| `react-hook-form`, `@hookform/resolvers` | 7.x / 5.x | Forms with the shadcn `field` primitives            |
| `server-only`                     | 0.0.1    | Keeps server modules out of client bundles                 |
| `sonner`                          | 2.x      | Toasts (no `next-themes`; Design.md §2)                    |
| `date-fns`, `@date-fns/tz`        | 4.x / 1.x | Display formatting in the organization's time zone        |
| `resend`                          | 6.x      | Email delivery                                             |
| `@react-email/components`         | 1.x      | Email templates                                            |
| `vitest`                          | 3.x      | Unit tests for the pure libraries                          |
| `@playwright/test`                | 1.x      | End-to-end smoke test                                      |
| `supabase` (CLI, dev dependency)  | 2.x      | Local stack, migrations, type generation                   |

## 2. Next.js 16 specifics that shape the design

The same points as on the Invoice Generator, plus one:

- **Middleware is now Proxy.** The root file is `proxy.ts`, exporting `proxy`. It only
  refreshes the Supabase session and redirects optimistically. It is never the security
  boundary.
- **Route Handlers** (`app/**/route.ts`) are uncached by default and run on the Node
  runtime. Used here for the CSV export, the email cron endpoint, and the auth callback.
- **Server Actions** are the only mutation path from the UI. They are reachable by direct
  `POST`, so each one resolves the caller and validates its input, and the database
  checks everything again.
- **Cache Components are not enabled**, so pages render dynamically. After a mutation,
  `revalidatePath` refreshes the affected routes.
- **`after()` from `next/server`** runs work after the response is sent. Server actions use
  it to send the emails their command queued (section 9), so an action is never slowed
  down or failed by email.

## 3. Stack overview

| Concern            | Choice                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Framework          | Next.js 16 App Router on the Node runtime                               |
| UI                 | React 19 Server Components, shadcn/ui on Base UI, Tailwind v4, Olifant design kit |
| Authentication     | Supabase Auth, email and password, cookie sessions, invitation-only     |
| Database           | Supabase Postgres 17: RLS for reads, command functions for writes       |
| Realtime           | Supabase Realtime (Postgres Changes) for the timer and the bell |
| Email              | Resend + React Email, through a database outbox                         |
| Scheduled work     | `pg_cron` + `pg_net` in Supabase (email retries)                        |
| Validation         | Zod schemas shared between forms and server actions                     |
| Hosting            | Vercel                                                                  |

**Why shadcn when there is a design system.** The Olifant design system defines how things
look; its own React components are inline-styled prototypes without keyboard handling,
focus management, or positioning, and it has 17 of the roughly 30 components the app
needs. shadcn provides accessible behaviour as source code in the repository, and the kit's
`globals.css` plus Design.md §4 give every component the Olifant look. shadcn is the
skeleton; Olifant is the skin.

## 4. Directory structure

```
app/
  (auth)/
    login/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    invite/[token]/page.tsx         accept an invitation: set name and password
    confirm/route.ts                password recovery callback
  (app)/
    layout.tsx                      requireViewer() + app shell + timer bar
    dashboard/page.tsx              Admin or freelancer sections (PRD §6.11)
    approvals/page.tsx              Admin inbox
    approvals/[proposalId]/page.tsx proposal review (Admins decide; the submitter views and withdraws)
    projects/page.tsx
    projects/[id]/page.tsx
    tasks/new/page.tsx
    tasks/[id]/page.tsx             detail, timer, manual time, comments, links, history
    tasks/[id]/edit/page.tsx
    proposals/new/page.tsx
    time/page.tsx                   My time
    reports/page.tsx
    reports/[month]/page.tsx
    months/page.tsx                 Admin: close and reopen
    people/page.tsx
    people/[id]/page.tsx
    audit/page.tsx
    notifications/page.tsx
    settings/page.tsx
    profile/page.tsx
    styleguide/page.tsx             development only (notFound() in production)
  api/
    reports/[month]/csv/route.ts
    cron/dispatch-emails/route.ts
  globals.css, fonts.ts, fonts/, icon.png, apple-icon.png, layout.tsx
lib/
  auth/        actions.ts, queries.ts (getViewer, requireViewer, requireAdmin), schemas.ts, routes.ts, urls.ts, errors.ts, recovery.ts
  invitations/ actions.ts, queries.ts, tokens.ts
  people/      actions.ts, queries.ts, schemas.ts
  settings/    actions.ts, queries.ts, schemas.ts
  projects/    actions.ts, queries.ts, schemas.ts
  tasks/       actions.ts, queries.ts, schemas.ts, permissions.ts
  proposals/   actions.ts, queries.ts, schemas.ts
  time/        actions.ts, queries.ts, schemas.ts
  months/      actions.ts, queries.ts
  reports/     queries.ts, csv.ts
  notifications/ actions.ts, queries.ts, describe.ts (in-app copy and links)
  audit/       queries.ts, events.ts (event type groups), filters.ts (URL filters), describe.ts (sentences, before and after)
  email/       dispatch.ts, send.ts, styles.ts, invitation.tsx, templates/ (notification-email.tsx, content.ts)
  db/          errors.ts (error key → message), result.ts (ActionResult helpers)
  supabase/    admin.ts (secret key; server-only)
  duration.ts, money.ts, dates.ts, format.ts
  database.types.ts                 generated
utils/supabase/                     client.ts, server.ts, middleware.ts (as on the Invoice Generator)
components/
  ui/                               shadcn primitives, restyled per Design.md §4
  status-badge.tsx, hours-meter.tsx, stat-card.tsx, duration-input.tsx, empty-state.tsx
  text-field.tsx, submit-button.tsx  react-hook-form field and pending submit button
  auth/                             sign-in, reset, and invitation forms; Notice
  timer/                            timer-bar.tsx, timer-review-dialog.tsx, start-timer-button.tsx
  layout/                           app-sidebar.tsx, top-bar.tsx, page-header.tsx
  notifications/                    notification-bell.tsx, notification-entry.tsx, notification-list.tsx
  audit/                            audit-filters.tsx, audit-list.tsx
  tasks/, proposals/, time/, people/, projects/, dashboard/
scripts/
  bootstrap-admin.ts                creates the first Admin's invitation
  seed-demo.ts                      realistic demo data for the client presentation
  test-db.ts                        runs the pgTAP tests against the test project (section 16)
  a11y.ts                           serves the test project and runs the axe checks (section 16)
supabase/
  migrations/                       0001–0015
  tests/                            pgTAP tests (*.test.sql) and their helpers (setup.sql)
docs/                               PRD.md, DB.md, Tech.md, Design.md
design-system/                      the original export, reference only
proxy.ts
```

## 5. Authentication, invitations, and route protection

### 5.1 Defence in depth

1. **Proxy** refreshes the session token and redirects signed-out visitors away from
   `(app)` routes to `/login?next=…`. Signed-in people are sent from `/login` and
   `/forgot-password` to `/dashboard`; `/reset-password`, `/confirm`, and `/invite/…` stay
   reachable either way. A session whose profile RLS hides (deactivated) is signed out
   there instead, which prevents a loop with `requireViewer()`. The route lists live in
   `lib/auth/routes.ts`. A convenience, not a guarantee.
2. **The `(app)` layout** calls `requireViewer()`, which resolves the user with
   `getClaims()` (wrapped in React `cache`) and loads their profile. No profile, or a
   deactivated one, redirects to `/login`. Never trust `getSession()` for authorization.
3. **Every server action and route handler** resolves the viewer again before doing
   anything.
4. **The database** is the real boundary: SELECT policies for reads, command functions for
   writes, and `app.viewer_id()` refusing deactivated people (DB.md §2).

Roles are read from `profiles.role`, never from JWT claims or `user_metadata`, which the
user can edit.

### 5.2 Invitations

There is no sign-up screen, and **"Allow new users to sign up" is off** in the Supabase
dashboard. The database refuses any auth user without a valid invitation as well
(`app.handle_new_user`).

**Inviting** (Admin, `lib/people/actions.ts`):

1. Generate a token: 32 random bytes, base64url. Hash it with sha256 (hex).
2. Call `create_invitation(email, full_name, role, token_hash)`.
3. Send the Invitation email with `${APP_URL}/invite/${token}` when `RESEND_API_KEY` and
   `EMAIL_FROM` are set. The raw token is not stored.
4. If email is not configured, or sending fails, the action returns the link once so the
   Admin can copy it. It cannot be shown again, because only the hash is stored. A failed
   send calls `record_invitation_send_error(id, message)`. Resending generates a new token
   and calls `renew_invitation`.

**Accepting** (`app/(auth)/invite/[token]/page.tsx`):

1. The page hashes the token and looks up the invitation with the admin client (the
   visitor has no session). If it is missing, accepted, revoked, or expired, show "This
   invitation link has expired. Ask Olifant for a new one."
2. Otherwise show a form: name (prefilled), password, confirm password.
3. The action re-validates the token, then calls
   `admin.auth.admin.createUser({ email, password, email_confirm: true })`. The database
   trigger creates the profile from the invitation and marks it accepted, in the same
   transaction.
4. It signs the person in with `signInWithPassword`, calls `update_my_profile` if they
   changed their name, and redirects to `/dashboard`. If that sign-in fails, the account
   already exists, so it redirects to `/login?notice=account-created` instead.

`email_confirm: true` is safe because the emailed token already proves ownership of the
address.

Passwords (invitation and reset) need at least 8 characters, at most 72 (bcrypt's limit),
with no other composition rules (`lib/auth/schemas.ts`).

### 5.3 The first Admin

`scripts/bootstrap-admin.ts <email> "<full name>"` runs with the secret key. It inserts an
invitation with `role = 'admin'` and `invited_by = null`, and prints the `/invite/…` link.
Run it once per environment. It loads `.env.local` with `loadEnvConfig` from `@next/env`
and builds its own secret-key client, because `lib/supabase/admin.ts` is `server-only`,
which throws outside Next.js. Token helpers are shared from `lib/invitations/tokens.ts`.

### 5.4 Password reset

Identical to the Invoice Generator: Supabase's recovery email lands on
`app/(auth)/confirm/route.ts`, which accepts both `?code=` and `?token_hash=&type=recovery`,
sets a short-lived `recovery_grant` httpOnly cookie (15 minutes, holding the recovering
user's id), and redirects to the reset form; the reset action requires both the session
and a cookie matching that session's user. Only `recovery` is accepted as a
`type` here, since there is no sign-up confirmation. Supabase sends its auth emails through
Resend's SMTP so they come from the same domain, with an Olifant-styled template.

### 5.5 Deactivation

`deactivate_person` (the database command) stops their timer and blocks every query they
make from then on. The server action then bans the auth user
(`admin.auth.admin.updateUserById(id, { ban_duration: '876000h' })`) so their session cannot
be refreshed. Reactivation reverses both (`ban_duration: 'none'`).

## 6. Data access model

**Reads** happen in Server Components through `utils/supabase/server.ts` (publishable key +
the viewer's session). Queries live in `lib/<feature>/queries.ts` (`import 'server-only'`),
are typed by `lib/database.types.ts`, and read tables or the views from DB.md §8. Queries
still filter explicitly (for example by `assignee_id` or `month`) so Postgres can use the
indexes, even though RLS would return the right rows anyway. Independent queries on a page
run in parallel with `Promise.all`.

**Writes** happen only in Server Actions (`lib/<feature>/actions.ts`), and only as calls to
the command functions. Each action:

1. resolves the viewer (`requireViewer()` or `requireAdmin()`);
2. parses its input with the Zod schema for that form;
3. calls `supabase.rpc('command_name', args)`;
4. on error, maps the error key with `lib/db/errors.ts` and returns `{ ok: false, error }`;
5. on success, calls `revalidatePath` for the affected routes and, if the command can
   queue email, `after(dispatchEmails)`;
6. redirects when the flow moves to another page.

The app never calls `.insert()`, `.update()`, or `.delete()` on a table; the database would
refuse anyway. An ESLint `no-restricted-syntax` rule on those method names in `lib/**`
keeps that visible in review.

**The secret key** (formerly the service role key) is used only by `lib/supabase/admin.ts`,
which is `import 'server-only'` and imported by exactly three places: the invitation
lookup and accept action (`lib/invitations/queries.ts`, `lib/invitations/actions.ts`),
the deactivate and reactivate actions in `lib/people/actions.ts` (auth bans), and the email
dispatcher. The scripts
create their own secret-key client (section 5.3). Nothing prefixed `NEXT_PUBLIC_` ever holds it.

**The browser client** (`utils/supabase/client.ts`) is used for one thing: Realtime
subscriptions (section 8).

## 7. Domain implementation

### 7.1 Tasks and permissions in the UI

The database decides what is allowed. The UI only decides what to show:
`lib/tasks/permissions.ts` exports pure functions such as
`canTrackTime(task, viewer)` and `availableActions(task, viewer)`, derived from PRD §5.1
and §7, so buttons that would fail are hidden. They mirror the database rules and must be
updated with them; unit tests cover them.

### 7.2 Proposals and approvals

- **New proposal** (`/proposals/new?project=…`, opened from the project page) lists the
  freelancer's Draft and Changes requested tasks in a project with their estimates; tasks
  without an estimate cannot be selected. Submitting calls
  `submit_proposal(project_id, task_ids)` and opens the proposal. The task detail's
  "Submit" button submits that one task as a one-item proposal.
- **Proposal detail** (`/approvals/[proposalId]`) shows the items with the totals and cost
  range (estimate × the freelancer's current rate, from `rates`, rounded to cents in integer
  arithmetic; withdrawn items are left out). Admins get per-item buttons; rejecting or
  requesting changes opens a dialog with a required comment. Each decision is sent
  immediately as a one-item `decide_estimates`; "Approve All Remaining" calls
  `approve_all_remaining`, which is one action and therefore one email. The submitter sees
  the same page read-only and can withdraw undecided items (`withdraw_estimates`), here or
  on the task detail.
- **Approvals inbox** lists every `approval_queue` row oldest first, with its age. Proposals
  open the proposal detail; extra-hours requests and Done tasks open the task detail. The
  sidebar badge counts the same rows. Completed proposals are not linked from the task.
  The freelancer dashboard lists their recent ones.
- Only freelancers can be project members, so an Admin is never an assignee and never
  submits; the database still refuses self-approval (PRD §4).

### 7.3 Timer

- **Source of truth** is the `timers` row plus its `timer_segments`. The browser never
  keeps its own start time. The app layout loads the viewer's open timer
  (`lib/time/queries.ts`) and passes it, with the server's `now`, to `TimerProvider`
  (`components/timer/`), which computes the clock offset once per server render and ticks
  every second only while a segment is open. Active time is the closed segments plus the
  open one. `TimerBar`, the start buttons, and the review dialog read it from there. The
  clock uses `font-mono numeric` so digits don't shift.
- **Entire screen.** Start and continue call `getDisplayMedia` and accept only
  `displaySurface === "monitor"`. The database cannot see the display, so this gate is
  the client. A phone (no hover, coarse pointer) does not get the picker. The sharing
  tab uploads a JPEG at once and every 10 minutes (`lib/time/active-time.ts`), and sends
  a heartbeat every 15 seconds. When the share ends, or the heartbeat is older than 45
  seconds, `pause_timer` closes the segment. Closing the tab calls `POST /api/timer/pause`.
- **Every device** subscribes to its own timer rows (section 8). A pause or an automatic
  stop (hold, cancel, deactivation) updates the bar everywhere. An automatic stop shows
  a toast with the reason. Only the computer that is sharing can resume.
- **Starting while a timer runs**: `start_timer` refuses with `timer_already_running`, so the
  UI first opens the review dialog for the running timer, then starts the new one.
- **Review dialog** (on stop): start and end as time inputs in the organization's time
  zone, prefilled with the real run, plus date inputs and the split per day when the run
  crosses midnight (`lib/time/run.ts` mirrors `app.save_timer`); the description is
  required. A field left alone keeps the exact real moment: an unchanged start is sent as
the database's own value (microseconds included), and the end is rounded down to the
second. Save calls
  `stop_timer(started_at, ended_at, description)`; Discard calls `discard_timer()` after a
  confirmation. The database refuses an extended run (`timer_range_invalid`); the dialog
  explains that earlier work is added as a manual entry. `daily_limit_exceeded` is shown
  on the end time and the dialog stays open.
- **Ten-hour warning** is computed on the client from `startedAt` (Design.md §5.4). Past
  ten hours the review also needs a "The end time is correct" checkbox.
- **Correcting a description** (for example after an automatic stop) calls
  `update_time_entry` with only the description, from the task detail's entry table.
- **Marking a task Done** with its timer running opens the review dialog first
  (`timer_running_on_task`).

### 7.4 Manual time and My time

`DurationInput` turns `1:30`, `1h 30m`, `90m`, or `1.5` into whole minutes
(`lib/duration.ts`). The date picker allows dates from the task's `first_approved_on` to
the organization's today; both come from the server. My time loads one month of the
viewer's entries, grouped by work date, with timed and manual markers and over-limit
markers from `over_limit_minutes`.

### 7.5 Limits and the hours meter

All counting happens in the database (`app.recount_task`, DB.md §5.3). The UI reads
`task_progress` for the limit, ceiling, counted, over-limit, remaining, and percent used,
and `HoursMeter` (Design.md §5.2) draws it on the freelancer's active tasks. The task
detail shows the approved estimate and counted time, without the limit, the ceiling, or
the bar. Prompts to request extra hours appear on that dashboard bar when
`over_limit_minutes > 0`; the warning appears from `percent_used >= 100`. On the task
itself, Request Extra Hours is a header button.

### 7.6 Months and reports

- **Months screen** lists every month from the first month with time through the
  organization's current month (PRD §6.10), including months in between that have no time.
  Those need no closing. The current month is open, and Close stays unavailable until the
  month has ended. Status comes from `month_closures`. Before offering "Close Month" it
  runs the same blocking checks as the database (month not ended, earlier open month,
  running timers, pending extra-hours requests on tasks with over-limit time, missing
  rates) and lists what blocks it; the database re-checks on close. Warnings for Done tasks
  still waiting and for unpaid over-limit time are shown in the confirm dialog.
- **Reports** read `report_lines` for a month: one table per freelancer with rows per task
  (and per rate), over-limit time shown as unpaid, and totals per currency. The report does
  not label the month open or closed. An Admin can show everyone or one freelancer; the CSV
  export uses the same choice (`?user=`).

### 7.7 Durations, money, and time zones in TypeScript

- **Durations** are integers in minutes everywhere. `lib/duration.ts` parses and formats
  (`8h 48m`); decimal hours appear only in estimate inputs and the CSV.
- **Money** arrives as numeric values from PostgREST and is converted to integer cents
  immediately (`lib/money.ts`). Amounts are computed by the database; TypeScript only
  formats them (`Intl.NumberFormat('en-US', { style: 'currency', currency })`, giving
  `€1,240.00` and `$1,240.00`) and never adds two currencies together.
- **Time zones**: the database is the authority for "today", work dates, midnight splits,
  and months. The server loads `organization_settings` once per request (React `cache`)
  and passes the time zone and today's date down; display formatting uses `@date-fns/tz`
  with that zone. Never `new Date().toISOString().slice(0, 10)`.

## 8. Realtime

`utils/supabase/client.ts` (browser, cookie session) opens these channels:

| Channel             | Subscription                                               | Used by             |
| ------------------- | ---------------------------------------------------------- | ------------------- |
| `timer:{userId}`    | `postgres_changes` on `timers`, filter `user_id=eq.{userId}` | Timer bar, every page |
| `bell:{userId}`     | `postgres_changes` INSERT on `notifications`, filter `recipient_id=eq.{userId}` | Notification bell |

RLS applies to every broadcast, and neither table is ever deleted from, so nothing leaks
(DB.md §9). Components unsubscribe on unmount. On a change, the component updates its
local state or calls `router.refresh()`.

## 9. Notifications and email

**In-app.** The database creates notifications (DB.md §5.6). The bell shows the
server-rendered unread count and the ten newest in a popover, and refreshes when the
`bell:{userId}` channel sees an insert; the Notifications page lists them (All and Unread,
50 at a time). `lib/notifications/describe.ts` turns each row into a sentence and a link,
and joins the estimate decisions of one action into one item. Opening an item marks it
read; `mark_notifications_read` marks one or all.

**Email** uses the `notifications` table as an outbox:

1. A command creates notifications with `email_status = 'pending'` (the PRD §6.12 events
   with Email = Yes).
2. The server action calls `scheduleEmailDispatch()`, which runs `dispatchEmails` in
   `after()`.
3. `lib/email/dispatch.ts` (secret key) calls `claim_email_batch(20)`, which locks due rows
   and marks them `sending`; groups them by `(recipient_id, txid)` — one group is one
   action for one person; loads the events, recipient, task, and project; renders one
   React Email template per group to HTML and text; sends it with Resend using the
   idempotency key `{recipient_id}:{txid}`, about two a second (Resend's default limit);
   and calls `complete_email_batch(ids, sent, error)`. A round with a failure ends the run,
   because a failed row is claimable again at once and would otherwise spend its five
   attempts within seconds.
4. `/api/cron/dispatch-emails` (POST, `Authorization: Bearer CRON_SECRET`) runs the same
   dispatcher for up to ten rounds. `pg_cron` calls it every five minutes (migration
   `0011`), which retries failures (up to five attempts) and anything an interrupted
   `after()` left behind.

A failed email never undoes or blocks the action that caused it, and its error stays on the
notification row for the Admin to see.

**Templates**: the Invitation is `lib/email/invitation.tsx`. The notification emails share
one frame (`lib/email/templates/notification-email.tsx`), and `templates/content.ts`
builds what each says: TaskAssigned, ProposalSubmitted, ProposalDecided (lists every
decision in the action), ExtraHoursRequested, ExtraHoursDecided, TaskDone,
TaskAcceptedOrReturned, TaskStatusChanged (hold, resume, cancel, reassign),
ProjectStatusChanged, MonthClosed (the freelancer's totals per currency). Each one has a
short summary and one yellow button to the item. Email clients
do not load the brand fonts reliably, so templates use Georgia for headings and the system
sans-serif for text, with the logo as a PNG from `public/brand/`.

**Sender**: `EMAIL_FROM` (for example `Olifant Workboard <workboard@olifant.digital>`), with
`reply_to` set to the person who acted when there is one, so a freelancer can reply
straight to the Admin who decided.

## 10. Dashboards

Each dashboard section is one query against the tables and views in DB.md §8, run in
parallel. Admin: `approval_queue` (the waiting count), running `timers` (the tracking count),
`report_lines` for the month (time and cost), and recent `audit_events` (activity).
Freelancer: their running timer, their Draft and Changes requested tasks, `task_progress`
for active tasks, `report_lines` for the month, and their latest revisions. Example SQL is
in DB.md §11.

## 11. CSV export

`app/api/reports/[month]/csv/route.ts` uses the viewer's RLS-bound client, so an Admin can
export everyone (or one freelancer with `?user=`) and a freelancer only themselves. It
returns `text/csv; charset=utf-8` with a byte-order mark (so Excel reads č, ć, đ, š, ž
correctly) as `olifant-workboard-YYYY-MM.csv`, one row per time entry with the PRD §6.10
columns. Durations appear in minutes and in decimal hours (two decimals).

**Per-entry amounts** must add up exactly to the report line. `lib/reports/csv.ts`
allocates each line's amount to its entries in integer cents by the largest-remainder
method, so the CSV, the screen, and the frozen month always agree.

## 12. Errors and validation

- Zod schemas in `lib/**/schemas.ts` mirror the database rules (15-minute steps for
  estimates, minimum not above maximum, whole minutes, required descriptions, URL format)
  and are used by the form and re-parsed in the action.
- Actions return `{ ok: true, data } | { ok: false, error, fieldErrors? }` for expected
  failures and throw only on the unexpected.
- `lib/db/errors.ts` maps every error key from DB.md §10 to a sentence that says what
  happened and what to do (Design.md §6). An unknown key logs the original error and shows
  "Something went wrong. Try again."
- Forms use react-hook-form with `zodResolver`, show field errors with `FieldError`, and
  show action errors in a toast. `formState.isSubmitting` drives the loading state.
- `error.tsx` and `not-found.tsx` cover the `(app)` segment.

## 13. Design system integration

The kit's files are the starting point (Design.md §1–§2). Build these components first,
because every screen uses them: `StatusBadge`, `HoursMeter`, `StatCard`, `DurationInput`,
`EmptyState`, `PageHeader`, and the timer components. `/styleguide` renders every shadcn
component and these custom ones with the Olifant theme, for comparison with
`design-system/` and `docs/design-preview.png`; it returns `notFound()` in production.

## 14. Environment variables

| Variable                               | Where           | Purpose                                         |
| -------------------------------------- | --------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | client + server | Supabase project URL                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | Publishable key, RLS-bound                       |
| `SUPABASE_SECRET_KEY`                  | server only     | Invitations, auth bans, email dispatcher, scripts |
| `RESEND_API_KEY`                       | server only     | Email delivery                                   |
| `EMAIL_FROM`                           | server only     | Verified sending address                         |
| `NEXT_PUBLIC_APP_URL`                  | client + server | Absolute links in emails and auth redirects      |
| `CRON_SECRET`                          | server only     | Protects `/api/cron/dispatch-emails`             |
| `SUPABASE_TEST_DB_URL`                 | tests only      | Session pooler URI of the test project (section 16) |

The tests read `.env.test.local`, which holds the test project's values for the variables
above plus `SUPABASE_TEST_DB_URL`, and never `.env.local`.

In Supabase Vault (for `pg_cron`): `app_url` and `cron_secret` with the same values.

## 15. Security checklist

- RLS enabled on every table, SELECT policies only, and no write privileges for
  `authenticated` (DB.md §7).
- Every command function: `security definer`, `set search_path = ''`, caller resolved
  first, every task lookup through `app.lock_task()`.
- Freelancer isolation and money visibility enforced in the database and covered by the
  pgTAP tests; screens never rely on filtering alone.
- `app` schema not exposed through the Data API; `anon` has no access to anything.
- Public sign-up disabled in Supabase and refused by the database.
- Invitation tokens stored only as hashes, valid seven days, single use.
- Deactivation blocks queries immediately and bans the auth user.
- Secret key confined to `lib/supabase/admin.ts`; the cron endpoint requires
  `CRON_SECRET`.
- History is append-only (triggers block UPDATE, DELETE, and TRUNCATE).
- Redirect targets validated (`safeRedirectPath`), as on the Invoice Generator.
- Package versions pinned, lockfile committed, Supabase advisors clean before release.

## 16. Testing

- **Test project.** Docker cannot run on the development machine, so there is no local
  Supabase. The database and end-to-end tests use a separate Supabase project that exists
  only for them (`freelancer-dashboard-test`), configured like the development project
  (sign-up off, Site URL and `/confirm` redirect on `http://localhost:3000`). Its data is
  deleted on every run, so it never holds anything real. It has every migration except
  `0011` (`pg_cron` and Vault). To apply new migrations, copy `supabase/config.toml` and
  `supabase/migrations/` without `0011` into a temporary folder and run
  `npx supabase db push --db-url "$SUPABASE_TEST_DB_URL" --workdir <folder>`. Never use
  `--linked` for tests: the CLI is linked to the development project.
- **Database** (pgTAP): `npm run test:db` runs `supabase/tests/*.test.sql` against the test
  project. `supabase test db` needs Docker even for a remote database, so
  `scripts/test-db.ts` runs them itself: it reads only `.env.test.local`, refuses a
  database with anyone outside `@example.com`, applies `supabase/tests/setup.sql` (pgTAP
  and the `tests` helpers), empties the test data with `tests.reset_data()`, and runs the
  files in name order, each on its own connection. The files build on each other. Every
  statement commits on its own, because the rules depend on `now()` and the transaction id
  changing between actions, so the tests cannot run inside one rolled-back transaction.
  `10`–`30` are the 105 scenario checks of DB.md; `40_isolation` checks every table and
  view for two freelancers, a deactivated person, and a session with no person, and checks
  the catalog (RLS on every table, SELECT-only policies, nothing for `anon`, read-only
  `authenticated`, definer commands), so tables added later are covered too. Dates are
  relative to the organization's today, so the tests run on any day.
- **Unit** (Vitest): `lib/duration.ts`, `lib/money.ts`, `lib/reports/csv.ts` (cent
  allocation), `lib/tasks/permissions.ts`, `lib/db/errors.ts` (every key has a message).
- **Accessibility** (Playwright and axe-core, against the test project): `npm run test:a11y`
  (`scripts/a11y.ts`). It reads only `.env.test.local`, refuses the run if that project is
  the development project or has anyone outside `@example.com`, and does not call
  `tests.reset_data()` (so it can run beside `npm run test:db` without wiping it, and a
  later `test:db` is free to wipe these fixtures). It builds with `NEXT_DIST_DIR=.next-a11y`
  and serves that build on port 3100, so it never reuses the dev server's `.next` cache or
  its inlined keys. The checks cover the screens in PRD §9 for an Admin and a freelancer,
  at 360px, 768px, and 1280px, plus keyboard focus on the sign-in form. This is not the smoke test
  below, and it does not run as part of `npm test`.
- **End-to-end** (Playwright, against the test project): `npm run test:e2e`
  (`scripts/e2e.ts`). It reads only `.env.test.local`, refuses the development project
  and anyone outside `@example.com`, applies `supabase/tests/setup.sql`, and calls
  `tests.reset_data()`, so it must not run beside `npm run test:db` or `npm run test:a11y`.
  It builds with `NEXT_DIST_DIR=.next-e2e` and serves that build on port 3200. `RESEND_API_KEY`
  and `EMAIL_FROM` are left empty, so the invitation is shown as a link. The walk is:
  bootstrap Admin → invite a freelancer → accept → freelancer creates and estimates two
  tasks → submits → Admin approves all → freelancer runs the timer and adds manual time
  past the ceiling → requests extra hours → Admin approves → Done → Accept → Admin closes
  last month (seeded) → CSV downloads. The seeded entry is on the second task, which is
  still approved: an accepted task cannot take time, and a task approved today cannot take
  a work date in last month, so the seed moves that task's `first_approved_on` back and
  inserts the entry with `add_time_entry`. It does not run as part of `npm test`. Run it
  before every deploy.

## 17. Deployment and handover

**Now (before the client knows):** Supabase and Vercel projects on your own accounts,
with demo data from `scripts/seed-demo.ts`, no real client data.

Per environment:

1. Supabase: apply the migrations (`supabase db push`; on the development project `0012`
   was applied before `0011`, so pushing `0011` there needs `--include-all`); turn off "Allow new users to sign
   up"; set custom SMTP to Resend; add `/confirm` on every origin to the redirect allow
   list; enable `pg_cron` and `pg_net`; create the Vault secrets; run the advisors.
2. Resend: verify the sending domain (SPF, DKIM).
3. Vercel: set the environment variables (section 14) and deploy.
4. Run `scripts/bootstrap-admin.ts` and accept the invitation.

**Handover to Olifant** (after they say yes):

1. Transfer the Supabase project to Olifant's organization (Project Settings → General →
   Transfer project) and the Vercel project to Olifant's team.
2. Move the domain and verify Resend on Olifant's domain.
3. Rotate every secret: the Supabase secret key, `CRON_SECRET` (and its Vault copy), and
   the Resend key.
4. Olifant's owner becomes Admin; your profile becomes Freelancer (`set_person_role`), so
   you never approve your own work. Keep developer access to Supabase and Vercel as agreed
   with them.

## 18. Build order

The build follows the product's own process: a list of tasks, each estimated as a range.
Once the app runs, this list can be entered as the first project in it. Live status is
in `docs/PRD.md` under "Build status".

| Phase | What it covers | PRD | Estimate |
| --- | --- | --- | --- |
| 1. Project setup | Next.js 16, shadcn (base-nova), design kit, packages | §10 | 2–3 h |
| 2. Database | Migrations 0001–0010 applied, types generated | DB.md | 1–2 h |
| 3. Sign-in and first Admin | Sign in, password reset, invitation acceptance, bootstrap script | §6.1 | 6–9 h |
| 4. App shell and components | Navigation by role, page header, StatusBadge, HoursMeter, StatCard, DurationInput, EmptyState, formatting libraries, /styleguide | §9, §10 | 9–13 h |
| 5. People and settings | Invite, resend, revoke (email via Resend if configured, otherwise a copyable link); people list and detail; rates; deactivation; settings; profile | §6.1, §6.2, §6.14 | 6–9 h |
| 6. Projects | Projects, statuses, members | §6.3 | 3–5 h |
| 7. Tasks | List, detail, editor, estimate, links, comments, task history | §5.1, §5.2, §6.4, §6.9 | 8–12 h |
| 8. Proposals and approvals | Submit, approvals inbox, review, approve all, request changes, reject, withdraw | §5.3, §6.5 | 6–9 h |
| 9. Timer | Start, stop, discard, timer bar on every device, review dialog, automatic stops, 10-hour warning | §5.5, §6.8 | 6–9 h |
| 10. Manual time and My time | Manual entries, edit, delete, My time screen | §6.8 | 4–6 h |
| 11. Limits and task lifecycle | Hours meter, extra-hours requests, over-limit prompts, hold, resume, cancel, reassign, done, accept, return | §5.1, §5.4, §6.6, §6.7 | 5–7 h |
| 12. Months and reports | Month close and reopen, monthly report, CSV export | §5.6, §5.7, §6.10 | 6–9 h |
| 13. Dashboards | Admin and freelancer dashboards | §6.11 | 6–9 h |
| 14. Notifications and email | Bell with live updates, notifications page, Resend emails, outbox, retry job (migration 0011) | §6.12 | 7–10 h |
| 15. Audit log | Admin audit log with filters | §6.13 | 2–4 h |
| 16. Quality pass | Database tests (pgTAP from the scenario checks), responsive and accessibility pass, Playwright smoke test | §10 | 9–13 h |
| 17. Demo and deploy | Demo data, Vercel deploy, production Supabase settings, Resend domain | Tech.md §17 | 3–5 h |
| **Total** | | | **89–134 h** |
