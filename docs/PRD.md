# Olifant Workboard — Product Requirements Document

## Build status

| Phase | What it covers | PRD | Estimate | Status |
| --- | --- | --- | --- | --- |
| 1. Project setup | Next.js 16, shadcn (base-nova), design kit, packages | §10 | 2–3 h | Done (2026-10-07) |
| 2. Database | Migrations 0001–0010 applied, types generated | DB.md | 1–2 h | Done (2026-10-07) |
| 3. Sign-in and first Admin | Sign in, password reset, invitation acceptance, bootstrap script | §6.1 | 6–9 h | Done (2026-10-07) |
| 4. App shell and components | Navigation by role, page header, StatusBadge, HoursMeter, StatCard, DurationInput, EmptyState, formatting libraries, /styleguide | §9, §10 | 9–13 h | Done (2026-10-07) |
| 5. People and settings | Invite, resend, revoke (email via Resend if configured, otherwise a copyable link); people list and detail; rates; deactivation; settings; profile | §6.1, §6.2, §6.14 | 6–9 h | Done (2026-10-07) |
| 6. Projects | Projects, statuses, members | §6.3 | 3–5 h | Done (2026-10-07) |
| 7. Tasks | List, detail, editor, estimate, links, comments, task history | §5.1, §5.2, §6.4, §6.9 | 8–12 h | Done (2026-10-08) |
| 8. Proposals and approvals | Submit, approvals inbox, review, approve all, request changes, reject, withdraw | §5.3, §6.5 | 6–9 h | Done (2026-10-08) |
| 9. Timer | Start, stop, discard, timer bar on every device, review dialog, automatic stops, 10-hour warning | §5.5, §6.8 | 6–9 h | Done (2026-10-08) |
| 10. Manual time and My time | Manual entries, edit, delete, My time screen | §6.8 | 4–6 h | Done (2026-10-08) |
| 11. Limits and task lifecycle | Hours meter, extra-hours requests, over-limit prompts, hold, resume, cancel, reassign, done, accept, return | §5.1, §5.4, §6.6, §6.7 | 5–7 h | Done (2026-10-08) |
| 12. Months and reports | Month close and reopen, monthly report, CSV export | §5.6, §5.7, §6.10 | 6–9 h | Done (2026-10-09) |
| 13. Dashboards | Admin and freelancer dashboards | §6.11 | 6–9 h | Done (2026-10-12) |
| 14. Notifications and email | Bell with live updates, notifications page, Resend emails, outbox, retry job (migration 0011) | §6.12 | 7–10 h | Done (2026-10-12) |
| 15. Audit log | Admin audit log with filters | §6.13 | 2–4 h | Done (2026-10-13) |
| 16. Quality pass | Database tests (pgTAP from the scenario checks), responsive and accessibility pass, Playwright smoke test | §10 | 9–13 h | Done (2026-10-15) |
| 17. Demo and deploy | Demo data, Vercel deploy, production Supabase settings, Resend domain | Tech.md §17 | 3–5 h | In progress |
| **Total** | | | **89–134 h** | |

### Notes (built differently from the PRD)
- Phase 3: passwords must be 8–72 characters; a deactivated person with a live session is signed out by the proxy.
- Phase 4: a bare duration is hours (`10` is 10h, `10:30` is 10h 30m); estimates and extra hours snap to the nearest 15 minutes. The Approvals count and the notification bell are empty slots until those phases. `getOrganizationSettings()` is a read-only query so dates can use the organization time zone.
- Phase 5: an invitation link is shown once when Resend is not configured or the send fails, because only the hash is stored. Changing a password requires the current password. Tolerance is a whole number. Rates are set on freelancers only. Project memberships are shown and stay read-only until phase 6.
- Phase 6: the project list has two tabs, Current (Active and On hold) and Archived. "Time this month" is counted plus over-limit time in the organization's current month; cost comes from `report_lines`, per currency, without over-limit time. In the project summary, approved time leaves out rejected and cancelled tasks, remaining time covers only Approved, In progress, and On hold tasks, and counted and over-limit time include every task. Only active freelancers can be added as members, on the project page; the person page lists memberships as links. Task rows link to task detail from phase 7. Project status emails are queued in the outbox and sent once phase 14 adds the dispatcher.
- Phase 7: there is no separate task list screen; the project page's task table is the list, and its rows open the task detail. The task editor is two pages, `/tasks/new?project=…` and `/tasks/[id]/edit`. A freelancer can enter the estimate while creating the task. An Admin picks the assignee when creating a task and can change it on a draft that was never submitted (changing it clears the estimate); reassigning after submission comes with phase 11, and an assigned task cannot be made unassigned again. Once saved, an estimate can be changed but not cleared. The task detail shows the approved estimate, counted time, time entries, and comments. It does not show the limit, the ceiling, the hours bar, links, estimate revisions, or extra-hours requests. The timer and the submit, decide, hold, cancel, done, and accept actions arrive with phases 8–11. History lines are readable sentences with before and after values where the event has them. Decision comments are marked and cannot be edited or deleted; deleting a comment asks for confirmation.
- Phase 8: a proposal is submitted from the project page (several tasks) or from the task detail (one task). The proposal detail is shared: Admins decide there, and the submitter sees it read-only and withdraws undecided items there or on the task detail. Each item decision is its own action; "Approve All Remaining" and withdrawing ask for confirmation. The proposal's totals and cost range leave out withdrawn items. The inbox already lists extra-hours requests and Done tasks, which open the task detail until phase 11 adds their decisions; the sidebar count covers every inbox entry. Completed proposals are not listed in the inbox and are not linked from the task. There is no "only Admin" warning when submitting, because only freelancers can be members and so only freelancers submit.
- Phase 9: the timer starts from the task detail and from the freelancer's task rows on the project page; My time and the dashboard add their start buttons in phases 10 and 13. Starting while another timer runs opens the review for the running one first, and the new timer starts once it is saved or discarded. The review shows only times when the run stays within one day, and dates and times with the split per day when it crosses midnight. After more than 10 hours the review shows a warning and needs a "The end time is correct" checkbox before saving; a timer is never stopped for running long. A run that would put a day over 24 hours is refused next to the end time, and the dialog stays open so the run can be shortened or discarded. The author can correct only the description of their entries on the task detail while the month is open; full editing and deleting come with phase 10. An automatic stop removes the bar on every device and shows a toast with the reason. Admins see "Timer running" with the person and the elapsed time on the task detail.
- Phase 10: My time opens on the organization's current month and lists every month from the first entry through that month. Closed months stay visible and read-only. Add time is the page's primary action, and the start button sits on the list of tasks that can be tracked now, including tasks with no entries this month. A saved timed entry can be moved within one local day, including made longer; only the live stop review is shorten-only. Deleting an entry asks for confirmation.
- Phase 11: limits and lifecycle actions live on the task detail. The approvals inbox still opens extra-hours requests and Done tasks there. Mark Done while a timer runs on that task opens the stop review first, then the optional comment, whether the run was saved or discarded; closing the review without resolving it leaves the task In progress. Cancel, Hold, and Accept ask for confirmation. Cancel's comment is optional and, when given, is a decision comment. Resume is immediate. Reassign is a dialog for a task that has moved past a never-submitted draft, only while no time exists, and it cannot clear the assignee; the editor still assigns that first draft. Approving extra hours is one click; rejecting requires a reason. The task detail does not show the limit, the ceiling, or the hours bar. Request Extra Hours is in the header on an Approved, In progress, or On hold task while no request is open, and an open request is decided above the estimate. The freelancer dashboard still shows the hours bar on active tasks.
- Phase 12: an Admin report can show everyone or one freelancer, and the CSV export follows that choice. Closing queues the month-closed email; it is sent once phase 14 adds the dispatcher.
- Phase 13: both dashboards open with a row of stat cards. The Admin cards count what is waiting for a decision, how many timers are running, and this month's counted time and cost. The waiting list is Approvals, not the dashboard, and the tracking count is from when the page loaded. This month is counted time and cost per freelancer and per project. Team activity lists time entries and decisions on estimates and extra hours only (not hold, resume, cancel, or acceptance), the 25 newest, with the estimate decisions of one action as one line. The freelancer's timer card shows the running timer with a stop button; starting is the play button on the rows of "My active tasks". "My proposals" lists undecided items and those decided in the last 30 days, without withdrawn ones.
- Phase 14: the bell opens a popover with the ten newest notifications, "Mark All Read", and a link to the Notifications page, which has All and Unread tabs and shows 50 at a time with "Load More". Opening a notification marks it read. The estimate decisions of one action are one notification in the app, as they are one email. A previous assignee's "reassigned" notification opens the dashboard, because they can no longer see the task. Failed emails have no screen; the error stays on the notification row and in the server log. Emails queued before this phase (project status, month closed, and test data) were marked in-app only and never sent. Migration `0011` (the five-minute retry) is in `supabase/migrations/` but is applied, with its Vault secrets, in phase 17, because `pg_cron` cannot reach a local server; until then emails are sent right after each action and failures are retried by the next action's dispatch. Development uses Resend's test sender `onboarding@resend.dev`, which delivers only to the Resend account owner; the verified domain comes in phase 17.
- Phase 15: the audit log lists every recorded event, newest first, 50 at a time with "Load More". The person filter matches events the person did or that are about them. The event type filter offers a whole group (Tasks, Estimates, Extra hours, Time and timer, Comments and links, Projects, People and rates, Months, Settings) or one event type. The date range is from–to, inclusive, in the organization's time zone, and a start after the end shows an error. Filters live in the URL. Each line is a readable sentence with links to its project, task, person, proposal, or report, and edits (task, time entry, comment, project, status, role, settings) expand to show only the fields that changed, before and after. Migration `0012` adds the `audit_log` view, which takes the project from the task for comment edits and deletions, because those events carry no project; it was applied to the development project ahead of `0011`.
- Phase 16 (16a): Docker cannot run on the development machine, so the database tests run against a separate Supabase test project instead of a local Supabase, with `npm run test:db` (`scripts/test-db.ts`) instead of `supabase test db`, which needs Docker. The three scenario scripts became pgTAP tests in `supabase/tests/` and were removed; their dates are now relative to the organization's today. A fourth file checks isolation for every table and view and checks the privileges in the catalog. It found that `anon` and `authenticated` had every privilege on the four views, so migration `0013` limits them to SELECT for `authenticated`; it is applied to the test project.
- Phase 16 (16b): `npm run test:a11y` checks the screens in §9 with axe-core, on a production server that uses only the test project (port 3100, build output in `.next-a11y`, so it does not touch the dev server or `.env.local`). It is separate from `npm test` and from `npm run test:db`. Two stat cards on a phone row scale the figure so a value like €10.83 fits at 360px. Below `sm`, the timer bar is taller, and the stop control, the row start control, and the proposal decision controls are 44px. Stacked table labels are real text. Header actions, including links styled as buttons, stack full width below `sm`. The page content is the only main landmark, and the sidebar is an aside. red-600 is `#E32315` so error text clears 4.5:1 on the page (the design-system `#E62415` is 4.49:1). A select's empty value uses muted text, because that value is real text.
- Phase 16 (16c): `npm run test:e2e` walks the loop in Tech.md §16 on the test project, in a production server on port 3200 (build output in `.next-e2e`). It calls `tests.reset_data()` first, so it must not run beside `npm run test:db` or `npm run test:a11y`, and it is separate from `npm test`. Resend is left unset, so the invitation is a link on screen. Last month's time is seeded on the second task after acceptance: an accepted task cannot take more time, and a task approved today cannot take a work date in last month, so the seed moves that task's approval date back and inserts the entry with `add_time_entry`.
- Profile photos (during phase 17): each person uploads their own on Profile. JPG, PNG, or WebP, up to 2 MB, kept in a private Storage bucket (`avatars`). The photo replaces initials wherever that person already has an avatar, including project members. An Admin sees other people's photos; a freelancer sees only their own. Migration `0014`.
- Screen captures (during phase 17): the timer starts only when the freelancer shares the entire screen from a computer. Sharing stopping pauses the clock; sharing again continues it. A screenshot is stored at the start and every 10 minutes. Deleting one hides it from the freelancer, leaves the file for Admins, and notifies them. Each saved screenshot plays a shutter sound (`public/sound/shutter.mp3`) and shows a preview: a card in the app when the Olifant tab is visible and focused, otherwise a browser notification that closes itself after about four seconds (Chrome and Edge show the image, Firefox a small icon, Safari text only). Notification permission is asked from a separate toast, once per browser, after the timer starts, because the start click is spent on sharing the screen; without permission only the sound plays outside the app. These are not §6.12 notifications and are not stored. Migration `0015`. Phase 17's deploy, Resend domain, and migration `0011` are unchanged.

The database schema will live in `DB.md`, the architecture in `Tech.md`, and the visual
rules in `Design.md`.

## 1. Overview

Olifant Workboard is an internal web application for Olifant Digital and the freelancers
who work for it. It replaces "just start working" with one explicit loop:

1. A task is described, and the freelancer who will do it estimates it as a range of hours.
2. Olifant approves the estimate before any work starts. A whole list of tasks can be
   approved at once.
3. The freelancer tracks the time they spend, to the minute, on approved tasks only — with
   a start/stop timer or by entering it by hand.
4. When a task needs more hours than were approved, the freelancer asks for them and the
   extra hours are approved or rejected.
5. At the end of each month the time is closed and turned into a per-freelancer report
   that is the basis for payment.

Everything else — dashboards, notifications, the history of every change — exists to make
that loop fast for Olifant and transparent for the people doing the work.

The application serves exactly one organization, Olifant Digital. There is no public
sign-up, no multi-tenancy, and no access for Olifant's own customers. Each freelancer
works as if they were alone with Olifant: freelancers never see each other.

## 2. Goals

- No minute is worked without an approved estimate, and no minute is paid unless it falls
  inside an approved limit.
- Olifant can approve a whole list of proposed work in one action, and can still decide
  item by item.
- Olifant sees this month's time and cost per freelancer and per project, how many
  timers are running, and how much is waiting for a decision.
- Each freelancer sees what they may work on, how much approved time remains, and what
  they have earned this month.
- Tracking time is as easy as pressing start and stop.
- Paying freelancers means closing the month and exporting a report, and the amounts never
  change afterwards.
- There is a complete, append-only history of who estimated, approved, tracked, and changed
  what.

## 3. Non-goals

The following are explicitly out of scope for this product:

- Multiple organizations, public registration, or any SaaS features.
- Access for Olifant's customers: no client portal, no client-side approvals.
- A project manager role. In this version Admins decide everything; the data model leaves
  room to add project managers later.
- Freelancers seeing, messaging, or collaborating with each other.
- Budgets or hour caps per project or per freelancer.
- File attachments, due dates, priorities, subtasks, phases, or milestones.
- Idle detection, or activity monitoring such as keyboard and mouse counts. Screen captures
  during a timer are in scope (section 5.5); watching the screen any other way is not.
- Weekly timesheet approval. Control happens per task and per month.
- Admins editing a freelancer's estimate. They approve, reject, or request changes.
- Invoicing, payouts, or payment processing inside the application.
- Currency conversion or exchange rates.
- More than one assignee per task.
- Slack or other third-party integrations, notification preferences, and digests.
- Translations. The interface is English only.
- Dark mode. The design system defines a light theme only.
- Native mobile apps.
- Importing data from other tools.

## 4. User roles

There are two roles.

- **Admin** — Olifant. Sees every project, task, time entry, and amount. Creates projects
  and tasks, decides on estimates and extra hours, accepts finished work, manages people
  and rates, closes months, and changes settings. There is always at least one active
  Admin.
- **Freelancer** — a person who is a member of one or more projects. Estimates the tasks
  assigned to them, submits proposals, tracks time, asks for extra hours, and marks work as
  done.

**Freelancers are isolated from each other.** A freelancer sees only the tasks currently
assigned to them, their own time, their own rate and earnings, and their own history. They
never see other freelancers anywhere in the application: not their names, tasks, time,
comments, or activity. Only Admins see across freelancers.

An Admin is the client. They are not assigned tasks and do not estimate, track time, or
mark work done. They see every freelancer's time.

**No self-approval.** Nobody decides on their own estimate or extra-hours request, or
accepts their own work. If no other Admin exists, the item waits, and the submitter is
warned when submitting.

## 5. Core concepts

### 5.1 Task lifecycle

| Status            | Meaning                                                          | Time can be tracked |
| ----------------- | ---------------------------------------------------------------- | ------------------- |
| Draft             | Being written, or waiting for the assignee's estimate            | No                  |
| Pending approval  | Estimate submitted in a proposal, waiting for a decision         | No                  |
| Changes requested | Sent back by an Admin with a comment                             | No                  |
| Approved          | Estimate approved, work may start                                | Yes                 |
| In progress       | At least one time entry exists; set automatically                | Yes                 |
| On hold           | Paused by an Admin                                               | No                  |
| Done              | The assignee says the work is finished; waiting for acceptance   | No                  |
| Accepted          | An Admin confirmed the work. Final                               | No                  |
| Rejected          | An Admin declined the estimate. Final                            | No                  |
| Cancelled         | Stopped by an Admin. Final                                       | No                  |

Allowed transitions:

- **Draft → Pending approval** — the assignee submits it in a proposal.
- **Pending approval → Approved / Changes requested / Rejected** — an Admin decides.
- **Pending approval → Draft** — the assignee withdraws it before it is decided.
- **Changes requested → Pending approval** — the assignee edits it and resubmits it in a new
  proposal.
- **Approved → In progress** — automatically, on the first time entry.
- **Approved or In progress → On hold**, and back — an Admin pauses or resumes it. Resuming
  returns it to In progress if time has been tracked, otherwise to Approved.
- **In progress → Done** — the assignee marks it done.
- **Done → Accepted** — an Admin accepts it.
- **Done → In progress** — an Admin returns it with a comment.
- **Any non-final status → Cancelled** — an Admin cancels it. Counted time already tracked
  remains payable.

Final statuses are never left. A rejected task is not resubmitted; if the work is still
wanted, a new task is created. A task that was never submitted can be deleted; once
submitted, it can only be cancelled.

### 5.2 Estimates, limits, and the ceiling

- An estimate is a range: a minimum and a maximum number of hours, in 15-minute steps, both
  greater than zero, with the minimum not above the maximum. An optional note explains the
  assumptions behind it.
- Every submitted estimate is kept permanently as an **estimate revision**, together with
  the decision made on it.
- The maximum of the approved estimate is the task's **approved limit**. Every approved
  extra-hours request adds its hours to the limit.
- The **tolerance** (default 10%, set by an Admin) gives each task a **ceiling**: the limit
  plus the tolerance. Time up to the limit counts normally; time between the limit and the
  ceiling still counts but shows a warning; time above the ceiling is **over limit**
  (section 5.4).
- Planning figures — remaining time, estimated cost — use the maximum, that is the worst
  case.

Example: an estimate of 4–8 h has a limit of 8 h and, with 10% tolerance, a ceiling of
8 h 48 min.

### 5.3 Proposals

A proposal is the unit of approval: one or more tasks from one project, submitted
together by their assignee. Submitting a single task creates a proposal with one item.

- Each item carries the estimate exactly as submitted.
- An Admin can **approve all** undecided items in one action, or decide each item:
  **approve**, **reject** (reason required), or **request changes** (comment required).
- A proposal shows its total estimated range in hours and the cost range at the
  freelancer's current rate.
- The assignee can withdraw items that have not been decided yet. A proposal is complete
  when none of its items is waiting for a decision.

### 5.4 Extra hours and over-limit time

When a task approaches or exceeds its limit, the assignee submits an **extra-hours
request**: a number of additional hours (in 15-minute steps) and a reason. An Admin
approves it or rejects it with a reason. A task has at most one open request at a time.

Time is never refused because of the limit. Instead, a task's entries are counted in
chronological order (work date, then the moment they were recorded), and any part of an
entry that falls above the ceiling is **over limit**:

- Over-limit time is shown separately, is excluded from cost and payment, and prompts the
  assignee to request extra hours.
- When an extra-hours request is approved, the ceiling rises, and over-limit time that now
  fits under it counts normally.
- If the request is rejected, or never made, the over-limit time stays unpaid. It remains
  visible for transparency.
- Recounting never touches a closed month: over-limit time there stays unpaid for good.
  That is why a month cannot be closed while such a task has an open request (section
  6.10).

Example: a task with an 8 h limit and 8 h 48 min ceiling has 8 h 30 min tracked. The
freelancer tracks another 1 h. Of that entry, 18 min count and 42 min are over limit.

### 5.5 Time entries and the timer

A time entry records work by the assignee on one task: the work date, a duration in whole
minutes, a short description of what was done, and whether it came from the timer or was
entered by hand.

There are two ways to record time:

- **Timer.** The freelancer starts a timer on a task from a computer and stops it when
  they finish. The timer starts only after they share their entire screen in the browser.
  A window or a single tab is refused, and a phone cannot start a timer. A person has at
  most one running timer; starting a new one stops the current one. The clock runs only
  while the screen stays shared. When sharing stops, the clock pauses at that moment and
  the gap is not counted. Sharing the entire screen again continues the same timer.
  While it runs, the app stores a screenshot at the start and then every 10 minutes.
  Each time one is saved, the freelancer hears a short shutter sound and sees the shot:
  as a small card in the app when Olifant is the window in front, otherwise as a browser
  notification if they allowed notifications.
  Those images stay even if the time is discarded. The freelancer can delete one of
  their screenshots; the file stays for Admins, and every Admin is notified. Stopping
  opens a short review — task, the active time, description — and saves the time as an
  entry rounded to the nearest whole minute; under one minute is discarded. A single
  uninterrupted run can still be shortened in the review. A run that crosses midnight
  is saved as one entry per work date. The paused or running timer is the same on every
  device; only the computer that is sharing can keep the clock going.
- **Manual entry.** For time that was not timed, or to add it afterwards: a work date, a
  duration in hours and minutes or in decimal hours, and a description.

Timed entries keep their start and end time and stay marked as timed even after they are
edited, so Admins can see which time was tracked live and which was entered by hand. The
rules for tracking and changing time are in section 6.8.

### 5.6 Months and frozen amounts

Time is grouped into calendar months in the organization's time zone. A month is **open**
until an Admin **closes** it.

- Closing a month locks its time entries and freezes, for each freelancer, the counted
  time, the rate that applied on each work date, and the resulting amounts. Later changes
  to rates, tasks, or limits never change a closed month — the same principle as the frozen
  details on an issued invoice.
- Months are closed in order. Only the most recently closed month can be reopened, by an
  Admin, with a reason. Reopening discards its frozen figures until it is closed again.

### 5.7 Rates and money

- Each freelancer has an hourly rate in **EUR or USD**, with an effective-from date.
  Changing a rate adds a new entry to the rate history; old entries are never overwritten.
- Time is priced at the rate in effect on its work date.
- Amounts in different currencies are always shown separately and are never converted or
  added together.
- Money is visible to Admins (everyone's) and to each freelancer (their own only).

### 5.8 History

Every meaningful action is recorded as a history entry: who did it, when, and what
changed. History entries cannot be edited or deleted by anyone, Admins included. The list
of recorded events is in section 6.13.

## 6. Features

### 6.1 Authentication and invitations

- There is no public registration. An Admin invites a person by email, with their name and
  role. The link is valid for seven days, where the person sets a password and is signed in.
  The link is emailed when email delivery is configured. When it is not, or sending fails,
  the Admin sees the link once and can copy it. Resending creates a new link.
- An Admin can resend or revoke a pending invitation.
- Sign in with email and password, sign out, and reset a forgotten password through an
  emailed link.
- Every screen except sign-in, invitation acceptance, and password reset requires a
  signed-in, active person.

### 6.2 People and rates

**People list** (Admin): name, email, role, status (invited, active, deactivated),
projects, and current rate.

**Person detail** (Admin):

- Profile and role.
- Project memberships.
- Rate history, for freelancers. Adding a rate requires an amount, a currency (EUR or USD),
  and an effective-from date, which cannot fall inside a closed month. A rate whose effective
  date is still in the future can be deleted; any other rate is permanent.

**Deactivation.** An Admin can deactivate a person: they can no longer sign in, any running
timer is stopped, and they disappear from assignment lists, while all their history stays.
Deactivated people can be reactivated. People are never deleted once they have any
history. The last active Admin cannot be deactivated or changed to Freelancer.

A freelancer without a rate can still estimate and track time. Their cost shows as "no
rate", and a month containing their time cannot be closed until a rate covers those dates.

### 6.3 Projects and membership

| Field       | Required |
| ----------- | -------- |
| Name        | Yes      |
| Description | Optional |
| Status      | Yes      |

- Admins create and edit projects and manage members: add a person to a project or remove
  them. A member cannot be removed while they are the assignee of a task in the project
  that is not final; those tasks must be reassigned or cancelled first.
- **Active** — normal work.
- **On hold** — planning continues (tasks, estimates, proposals, decisions), but no time
  can be tracked on any task of the project, and running timers on it are stopped. This is
  how "stop working on the website for now" is expressed.
- **Archived** — read-only and hidden from default lists. Only allowed when every task is
  final or a never-submitted draft.

The **project list** shows the projects a person can see. Admins see task counts by
status, time this month, and cost. Freelancers see the same figures for their own tasks
only.

The **project detail** shows, to Admins, every task (filterable by status and assignee),
the members, and a summary: approved time, counted time, remaining time, and over-limit
time. Freelancers see only their own tasks and their own summary, and no member list.

### 6.4 Tasks

| Field       | Required                       | Notes                                           |
| ----------- | ------------------------------ | ----------------------------------------------- |
| Title       | Yes                            |                                                 |
| Description | Optional                       | Plain text                                      |
| Assignee    | Required before submission     | A member of the project                         |
| Estimate    | Required before submission     | Minimum, maximum, optional note                 |

- **Creating.** A freelancer creates tasks in their projects, assigned to themselves. An
  Admin creates tasks in any project and assigns them to a member or leaves them
  unassigned; unassigned tasks are visible to Admins only. The assignee is notified when a
  task is waiting for their estimate.
- **Editing.** Only the assignee sets and changes the estimate, while the task is Draft or
  Changes requested. In those statuses the assignee can also edit the title and
  description. Admins can edit the title and description at any time before the task is
  final. Every edit after the first submission is recorded in the history.
- **Reassigning.** An Admin can reassign a task only while no time has been tracked on it
  and no timer is running on it. Reassigning returns the task to Draft: any undecided item
  is withdrawn, any approved estimate stops applying (it stays in the history), and the new
  assignee estimates the task from scratch. The previous assignee loses access to the
  task. Once time has been tracked, the task is cancelled instead, and a new task is
  created for the new person.
- **Deleting.** Only a task that was never submitted can be deleted, by its creator or an
  Admin.

The **task detail** shows status, assignee, the approved estimate, and counted time. It does
not show the limit, the ceiling, or a bar of time against them. It shows the time entries,
comments, and the activity history. Links, the estimate history, and the extra-hours
history are not on this screen. An open extra-hours request is decided here, and the
assignee requests extra hours from the header. It also has the timer's start and stop
button for the assignee.

### 6.5 Proposals and approval

- **Submitting.** The assignee selects one or more of their Draft or Changes requested
  tasks in one project, each with an estimate, and submits them as a proposal. Each task
  becomes Pending approval and the Admins are notified.
- **Approvals inbox** (Admin). One list of everything waiting for a decision across all
  projects: proposal items, extra-hours requests, and tasks marked Done. Oldest first, with
  the age of each item.
- **Reviewing a proposal.** Every item shows title, description, estimate range, and note,
  followed by the totals and the cost range. Each item can be approved, rejected, or sent
  back for changes, and **Approve all remaining** decides every undecided item at once.
- A decision on an estimate revision is final. Requesting changes leads to a new revision,
  not an edit of the old one.
- The comment given when rejecting or requesting changes also appears in the task's
  comment thread.

### 6.6 Extra-hours requests

- The assignee can request extra hours on a task that is Approved, In progress, or On hold:
  hours in 15-minute steps, greater than zero, and a reason. Only one request per task can
  be open.
- The Admins are notified and approve or reject it; rejecting requires a reason.
- On approval, the hours are added to the limit, the ceiling is recalculated, and
  over-limit time is recounted.
- Cancelling a task cancels its open request. A task cannot be accepted while a request is
  still open.
- The assignee sees the hours bar on their active tasks. The task detail does not show it.
  Request Extra Hours is a button on the task while it is Approved, In progress, or On hold
  and no request is open.

### 6.7 Completion and acceptance

- The assignee marks an In progress task as **Done**, with an optional comment. A running
  timer on the task is stopped first.
- An Admin **accepts** it (not while an extra-hours request on it is still open), or
  **returns** it to In progress with a comment.
- An accepted task is final: no more time, no more edits. Comments are still allowed.

### 6.8 Time tracking

**Who and when**

- Only the current assignee can track time, only on an Approved or In progress task, and
  only in an Active project.
- The work date cannot be in the future, before the date the task was first approved, or
  in or before the most recently closed month.
- Durations are whole minutes greater than zero. One person's entries cannot exceed 24
  hours on one work date.
- A description of the work is required.

**Timer**

- A timer is started from the task detail, from **My time**, or from the dashboard, and
  only from a computer. The start asks the browser to share the entire screen. Until that
  share is in place, the timer does not start. On a phone the control says to use a
  computer. While it runs, a timer bar is visible on every screen: task, project, active
  elapsed time, and a stop button. When sharing stops, the bar shows Paused and a
  continue control, which asks for the entire screen again.
- The first screenshot is taken as the timer starts, then one every 10 minutes for as
  long as the screen stays shared. After each one is saved, the freelancer hears a short
  shutter sound and sees a preview for about four seconds: a card with the image and the
  capture time in the bottom-right corner when the Olifant tab is visible and focused,
  otherwise the browser's own notification, if they allowed notifications. Nothing is
  shown when a screenshot fails to save. Screenshots are listed on the task for the assignee
  and for Admins. A freelancer sees only their own, and not ones they have deleted. An
  Admin sees every screenshot on the task, including ones the freelancer deleted, marked
  as deleted.
- Stopping opens the review described in section 5.5. On a single uninterrupted run the
  freelancer can shorten it (a later start or an earlier end) but not extend it. A run
  that was paused shows the active time, which already excludes the gaps. They must add
  a description, and can save or discard. Discarding the time does not delete the
  screenshots. Work done before the timer was started is added as a manual entry. Manual
  entries have no screenshots.
- If a task stops accepting time while its timer is running — it is put on hold, its
  project is put on hold, it is cancelled, or the person is deactivated — the timer stops
  at that moment and the time is saved as an entry described as "Stopped automatically",
  with the reason. The freelancer is notified and can edit the description.
- A timer that has been running for more than ten hours shows a warning in the app;
  stopping it then asks the freelancer to confirm or correct the end time.

**Changing time**

- The author can edit or delete their own entries while the month is open and the task
  still accepts time. The task of an entry cannot be changed; the entry is deleted and
  recorded again instead. Every edit and deletion is recorded in the history.
- The description alone can be corrected at any task status while the month is open, for
  example after a timer was stopped automatically.

**My time** shows the freelancer's entries for a selected month, grouped by day, with
daily and monthly totals, timed and manual markers, and over-limit markers. It lets them
start the timer or add a manual entry on any task they can currently track time on.

### 6.9 Comments

- The assignee and Admins can comment on a task, in plain text, at any status. Authors can
  edit their comments (marked as edited) or delete them.
- Comments given with a decision (reject, request changes, return) appear in the thread
  automatically.

### 6.10 Month close and reports

The **months** screen (Admin) lists every month with its status, counted time, and amounts
per currency.

Closing a month is **blocked** while any of the following is true:

- An earlier month that has time in it is still open (months without any time never need
  closing).
- The month has not ended yet in the organization's time zone.
- A timer started in the month is still running.
- A task with over-limit time dated in the month has an open extra-hours request.
- A freelancer has counted time in the month that no rate covers.

Closing shows **warnings**, without blocking, for tasks still Done and waiting for
acceptance with time in the month, and for over-limit time that will remain unpaid.

Closing freezes the report figures and emails each freelancer who had time in the month a
summary. Reopening (most recent closed month only) requires a reason and notifies the same
freelancers in the app.

**Monthly report**

- Per freelancer: one row per task (split by rate if the rate changed during the month)
  with counted time, rate, currency, and amount; over-limit time shown separately as
  unpaid; totals per currency.
- An open month shows the current figures. A closed month shows the frozen figures. The
  report does not say which; Open and Closed stay on the Months screen.
- Admins see every freelancer. Each freelancer sees only their own report.
- **CSV export**, one row per time entry: month, freelancer, project, task, work date,
  start and end time (timed entries), source (timer or manual), description, duration,
  counted duration, over-limit duration, rate, currency, amount. Durations appear in
  minutes and in decimal hours.

### 6.11 Dashboards

The landing screen after sign-in depends on the role.

**Admin**

- **Waiting for a decision** — the number of proposal items, extra-hours requests, and Done
  tasks. The list is the Approvals inbox.
- **Tracking now** — how many timers are running, counted when the page loads.
- **This month** — counted time per freelancer and per project, and cost per currency.
- **Team activity** — a feed of time entries and decisions from the last seven days.

**Freelancer**

- **Timer** — the running timer, or a quick start on one of their active tasks.
- **Waiting for my estimate** — tasks assigned to them that are still Draft or Changes
  requested.
- **My active tasks** — Approved and In progress tasks with the time remaining before the
  limit.
- **My month** — counted time this month and earnings per currency (a preview until the
  month is closed).
- **My proposals** — status of their submitted items: pending, approved, changes requested,
  rejected.

### 6.12 Notifications

Every notification appears in the app. Events that need someone to act also send an email.

| Event                                        | Recipients                              | Email |
| -------------------------------------------- | --------------------------------------- | ----- |
| Invitation                                   | Invitee                                 | Yes   |
| Task assigned, waiting for an estimate       | Assignee                                | Yes   |
| Proposal submitted                           | Admins                                  | Yes   |
| Proposal items decided                       | Assignee                                | Yes   |
| Extra-hours request submitted                | Admins                                  | Yes   |
| Extra-hours request decided                  | Assignee                                | Yes   |
| Task marked Done                             | Admins                                  | Yes   |
| Task accepted or returned                    | Assignee                                | Yes   |
| Task put on hold, resumed, cancelled         | Assignee                                | Yes   |
| Task reassigned                              | Previous and new assignee               | Yes   |
| Project put on hold or resumed               | Project members                         | Yes   |
| Timer stopped automatically                  | Assignee                                | No    |
| Task reached 100% of its limit               | Assignee and Admins                     | No    |
| Over-limit time tracked                      | Assignee and Admins                     | No    |
| New comment                                  | Assignee and Admins                     | No    |
| Screenshot deleted                           | Admins                                  | Yes   |
| Month closed                                 | Freelancers with time in that month     | Yes   |
| Month reopened                               | Freelancers with time in that month     | No    |

- The author of an action is never notified about it.
- One action sends at most one email per recipient; "approve all" on a proposal is a single
  email listing every decision.
- The in-app bell shows an unread count; notifications can be opened, marked read, or all
  marked read, and each one links to its item.
- A failed email never blocks or undoes the action that caused it; the failure is logged.

### 6.13 History and audit log

Recorded events include: task created, edited, assigned, and every status change; estimate
submitted, withdrawn, and decided; extra hours requested and decided; timer started,
stopped, paused, continued, discarded, and stopped automatically; screenshot captured and
deleted; time entry created, edited, and deleted (with the values before and
after); comment deleted; project created, edited, and status changed; member added and
removed; person invited, activated, deactivated, role changed, and profile photo changed; rate
added or deleted; month closed and reopened; settings changed.

- The task detail shows that task's history to Admins and to the assignee. The assignee
  sees only what happened from the moment the task was assigned to them.
- Admins have a full audit log, filterable by person, project, event type, and date.

### 6.14 Settings and profile

**Settings** (Admin): organization name, time zone, tolerance percentage (a whole number
from 0 to 100, default 10), and the default currency suggested for new rates. Changing the
tolerance applies to open months immediately and never to closed months.

**Profile** (everyone): own name, password, and photo. Changing the password requires the
current password. The photo is optional: JPG, PNG, or WebP, up to 2 MB. Without one, the
avatar is the person's initials. A person sees their own photo. An Admin also sees other
people's photos where those people are shown. A freelancer never sees another freelancer's
photo. Freelancers also see their own rate history, read-only.

## 7. Permissions

| Action                                                   | Admin                                  | Freelancer                        |
| -------------------------------------------------------- | -------------------------------------- | --------------------------------- |
| See projects                                             | All                                    | Projects they are a member of     |
| See tasks                                                | All                                    | Only tasks assigned to them       |
| See time, comments, and task history                     | All                                    | Only on their own tasks           |
| See other freelancers                                    | Yes                                    | Never                             |
| Create, edit, hold, or archive projects; manage members  | Yes                                    | No                                |
| Create a task                                            | Yes, for anyone or unassigned          | Yes, assigned to self             |
| Edit after submission, reassign, hold, resume, cancel    | Yes                                    | No                                |
| Estimate, submit, withdraw                               | No                                     | Own tasks                         |
| Decide estimates, extra hours, and acceptance            | Yes                                    | No                                |
| Track time, request extra hours, mark as Done            | No                                     | Own tasks, from a computer        |
| See timer screenshots                                    | Every task                             | Own tasks, except shots they deleted |
| Comment                                                  | Yes                                    | Own tasks                         |
| See rates and amounts                                    | Everyone's                             | Own only                          |
| Monthly report and CSV                                   | All freelancers                        | Own only                          |
| Close or reopen a month                                  | Yes                                    | No                                |
| Invite people, set roles and rates, change settings      | Yes                                    | No                                |
| Full audit log                                           | Yes                                    | No                                |

## 8. Business rules

1. Admins see everything. A freelancer sees only the projects they are a member of and,
   within them, only the tasks currently assigned to them.
2. Freelancers never see other freelancers: names, tasks, time, comments, or activity.
3. Rates and amounts are visible only to Admins and to the freelancer they belong to.
4. Rules 1–3 are enforced in the database, not only in the interface.
5. Time can be tracked only by the current assignee, on an Approved or In progress task, in
   an Active project, for a work date that is not in the future, not before the task was
   first approved, and not in or before the most recently closed month.
6. A person has at most one running timer.
7. Nobody decides on their own estimate or extra-hours request, or accepts their own work.
8. An approved estimate is never edited. The limit grows only through approved extra-hours
   requests.
9. The ceiling is the limit plus the tolerance. Time above it is over limit and unpaid
   unless a later approved request covers it.
10. A task has at most one open extra-hours request.
11. Estimates and extra hours are in 15-minute steps; an estimate's minimum is not above its
    maximum, and both are greater than zero. Time is tracked in whole minutes, at most 24
    hours per person per work date.
12. A task can be reassigned only before any time is tracked on it; reassigning returns it
    to Draft for a new estimate.
13. Months are closed in order. A closed month's entries and amounts never change. Only the
    most recently closed month can be reopened.
14. Amounts in different currencies are never added together or converted.
15. A rate applies from its effective date, and no new rate can take effect inside a closed
    month.
16. Final statuses (Accepted, Rejected, Cancelled) are never left.
17. A task that has ever been submitted is never deleted.
18. People with any history are never deleted, only deactivated. There is always at least
    one active Admin.
19. History entries are append-only.
20. All dates and month boundaries use the organization's time zone.

## 9. Screens

| Screen               | Who                    | Purpose                                                      |
| -------------------- | ---------------------- | ------------------------------------------------------------ |
| Sign in              | Everyone               | Authenticate                                                 |
| Accept invitation    | Invitee                | Set password and enter the app                               |
| Forgot password      | Everyone               | Request a reset link                                         |
| Reset password       | Everyone               | Set a new password from the emailed link                     |
| Dashboard            | Everyone               | Role-specific overview (section 6.11)                        |
| Approvals            | Admins                 | Inbox of proposal items, extra-hours requests, Done tasks    |
| Projects             | Everyone               | Projects the person can see                                  |
| Project detail       | Everyone               | Tasks and summary; members for Admins                        |
| Task detail          | Admins, assignee       | Everything about one task, timer, and manual time entry      |
| Task editor          | Admins, freelancers    | Create or edit a task and its estimate                       |
| New proposal         | Freelancers            | Select tasks, check estimates, submit                        |
| Proposal detail      | Admins, assignee       | Review and decide items                                      |
| My time              | Freelancers            | Monthly timesheet, timer, add, edit, and delete entries      |
| Reports              | Admins, freelancers    | Monthly report and CSV export                                |
| Months               | Admins                 | Close and reopen months                                      |
| People               | Admins                 | People list, invitations                                     |
| Person detail        | Admins                 | Role, memberships, rate history, deactivation                |
| Audit log            | Admins                 | Filterable history of every recorded event                   |
| Notifications        | Everyone               | Full list behind the bell                                    |
| Settings             | Admins                 | Organization name, time zone, tolerance, default currency    |
| Profile              | Everyone               | Own name and password; own rate history for freelancers      |

The timer bar and the review dialog shown when stopping a timer are global elements,
available on every screen while a timer runs.

## 10. Non-functional requirements

- **Design** — every screen follows the Olifant design system, light theme only.
  `Design.md` is the reference for tokens, components, status colours, and patterns.
- **Responsive** — usable on phone, tablet, and desktop. Starting and stopping the timer,
  adding time, and deciding on a proposal must be comfortable on a phone.
- **Validation** — every form validates before submitting and shows field-level errors.
  The server re-validates every rule in this document.
- **Data protection** — every request is authenticated, and access is enforced at the
  database layer, so no role can reach data beyond what section 7 allows, including
  through direct API calls.
- **Timer reliability** — the start time is stored on the server and elapsed time is
  computed from it, so reloading, closing the browser, or switching devices never loses or
  doubles time.
- **Exact arithmetic** — durations are stored as whole minutes and money as exact
  decimals. Amounts are rounded to cents once per report line, so the screen, the CSV, and
  the frozen month always agree.
- **Time zone correctness** — work dates, "today", midnight splits, and month boundaries
  are computed in the organization's time zone, never in the server's or the browser's.
- **Tamper-evident history** — history entries are written by the database itself as part
  of the change they describe, and cannot be modified afterwards.
- **Email reliability** — failed emails are logged and never leave an action half done.
- **Performance** — dashboards and lists load in about a second at the expected scale: up
  to 50 people, a few hundred tasks per month, and tens of thousands of time entries.
- **Accessibility** — keyboard navigable, visible focus states, and text contrast of at
  least 4.5:1. Status is never shown by colour alone.

## 11. Open questions

| Question                                                                    | Proposed default                                             | Decision                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Time above the ceiling: refuse the entry, or accept it as over limit?        | Accept as over limit, unpaid until extra hours are approved  | **Yes, as proposed**                                                      |
| Smallest unit of time?                                                      | 15 minutes                                                   | **Track to the minute, with a start/stop timer and manual entry**         |
| Organization time zone?                                                     | Europe/Budapest, changeable in Settings                      | **Yes**                                                                   |
| Can a project manager track time on a project they manage?                  | No                                                           | **No; the project manager role is postponed**                             |
| Can time be tracked for dates before the task was approved?                 | No                                                           | **No**                                                                    |
| Do Admins receive approval emails for projects that have a project manager? | Yes                                                          | **Project manager role removed from v1; Admins receive all of them**      |
| Can freelancers see time other freelancers tracked on the same project?     | Yes, time only, never money                                  | **No. Freelancers never see each other; only Admins see across them**     |
| How long is an invitation link valid?                                       | 7 days                                                       | **Yes**                                                                   |
| Product name?                                                               | Olifant Workboard                                            | **Olifant Workboard**                                                     |
| Timer running for a long time: warn only, or stop it automatically?         | Warn after 10 hours, never stop it automatically             | **Yes, as proposed**                                                      |
| Estimates and extra hours: 15-minute steps, or any number of minutes?       | 15-minute steps                                              |                                                                           |
| May freelancers delete timed entries, or only edit them?                    | Both, while the month is open; deletions stay in the history |                                                                           |
