-- 0005_rls.sql
-- Row-level security and privileges.
--
-- Model: clients only ever SELECT. Every write goes through a command function
-- (0007+), which checks the caller's permissions itself. So `authenticated`
-- gets SELECT on tables and EXECUTE on command functions, and nothing else.

-- ---------------------------------------------------------------------------
-- Visibility helpers used inside policies (security definer, so policies on
-- one table can look at another without recursion).
-- ---------------------------------------------------------------------------
create or replace function app.can_see_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_admin()
      or exists (select 1 from public.project_members m
                  where m.project_id = p_project_id and m.user_id = app.viewer_id())
      or exists (select 1 from public.tasks t
                  where t.project_id = p_project_id and t.assignee_id = app.viewer_id());
$$;

-- When the viewer is the task's assignee: the moment the task was assigned to
-- them (the start of what they may see). Otherwise null.
create or replace function app.assigned_since(p_task_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select t.assigned_at
    from public.tasks t
   where t.id = p_task_id
     and t.assignee_id = app.viewer_id();
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.organization_settings enable row level security;
alter table public.profiles              enable row level security;
alter table public.invitations           enable row level security;
alter table public.projects              enable row level security;
alter table public.project_members       enable row level security;
alter table public.tasks                 enable row level security;
alter table public.proposals             enable row level security;
alter table public.estimate_revisions    enable row level security;
alter table public.extra_hours_requests  enable row level security;
alter table public.task_comments         enable row level security;
alter table public.task_links            enable row level security;
alter table public.timers                enable row level security;
alter table public.time_entries          enable row level security;
alter table public.rates                 enable row level security;
alter table public.month_closures        enable row level security;
alter table public.month_report_lines    enable row level security;
alter table public.audit_events          enable row level security;
alter table public.notifications         enable row level security;

-- ---------------------------------------------------------------------------
-- Policies (SELECT only)
-- ---------------------------------------------------------------------------
create policy organization_settings_select on public.organization_settings
  for select to authenticated
  using ((select app.viewer_id()) is not null);

-- Freelancers see themselves and the Admins (names on comments and decisions),
-- never other freelancers.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    (select app.is_admin())
    or id = (select app.viewer_id())
    or (role = 'admin' and (select app.viewer_id()) is not null)
  );

create policy invitations_select on public.invitations
  for select to authenticated
  using ((select app.is_admin()));

create policy projects_select on public.projects
  for select to authenticated
  using ((select app.is_admin()) or app.can_see_project(id));

create policy project_members_select on public.project_members
  for select to authenticated
  using ((select app.is_admin()) or user_id = (select app.viewer_id()));

create policy tasks_select on public.tasks
  for select to authenticated
  using ((select app.is_admin()) or assignee_id = (select app.viewer_id()));

create policy proposals_select on public.proposals
  for select to authenticated
  using ((select app.is_admin()) or submitted_by = (select app.viewer_id()));

create policy estimate_revisions_select on public.estimate_revisions
  for select to authenticated
  using (
    (select app.is_admin())
    or (submitted_by = (select app.viewer_id()) and app.assigned_since(task_id) is not null)
  );

create policy extra_hours_requests_select on public.extra_hours_requests
  for select to authenticated
  using (
    (select app.is_admin())
    or (requested_by = (select app.viewer_id()) and app.assigned_since(task_id) is not null)
  );

create policy task_comments_select on public.task_comments
  for select to authenticated
  using ((select app.is_admin()) or created_at >= app.assigned_since(task_id));

create policy task_links_select on public.task_links
  for select to authenticated
  using ((select app.is_admin()) or app.assigned_since(task_id) is not null);

create policy timers_select on public.timers
  for select to authenticated
  using ((select app.is_admin()) or user_id = (select app.viewer_id()));

create policy time_entries_select on public.time_entries
  for select to authenticated
  using ((select app.is_admin()) or user_id = (select app.viewer_id()));

create policy rates_select on public.rates
  for select to authenticated
  using ((select app.is_admin()) or user_id = (select app.viewer_id()));

create policy month_closures_select on public.month_closures
  for select to authenticated
  using ((select app.viewer_id()) is not null);

create policy month_report_lines_select on public.month_report_lines
  for select to authenticated
  using ((select app.is_admin()) or user_id = (select app.viewer_id()));

-- Freelancers see a task's history from the moment it was assigned to them,
-- and only task events. The full log is for Admins.
create policy audit_events_select on public.audit_events
  for select to authenticated
  using (
    (select app.is_admin())
    or (task_id is not null and occurred_at >= app.assigned_since(task_id))
  );

-- Admins can read every notification, so failed emails are visible to them.
-- The bell always filters by recipient explicitly.
create policy notifications_select on public.notifications
  for select to authenticated
  using ((select app.is_admin()) or recipient_id = (select app.viewer_id()));

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on
  public.organization_settings, public.profiles, public.invitations, public.projects,
  public.project_members, public.tasks, public.proposals, public.estimate_revisions,
  public.extra_hours_requests, public.task_comments, public.task_links, public.timers,
  public.time_entries, public.rates, public.month_closures, public.month_report_lines,
  public.audit_events, public.notifications
to authenticated;

grant all on all tables in schema public to service_role;

-- Helpers that policies and views call run as the querying role.
revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on function
  app.viewer_id(), app.is_admin(), app.can_see_project(uuid), app.assigned_since(uuid),
  app.org_time_zone(), app.local_date(timestamptz), app.org_today(), app.month_start(date),
  app.ceiling_minutes(integer, numeric)
to authenticated;

-- The outbox functions are for the dispatcher (secret key) only.
revoke execute on function public.claim_email_batch(integer) from public, anon, authenticated;
revoke execute on function public.complete_email_batch(uuid[], boolean, text) from public, anon, authenticated;
grant execute on function public.claim_email_batch(integer) to service_role;
grant execute on function public.complete_email_batch(uuid[], boolean, text) to service_role;
