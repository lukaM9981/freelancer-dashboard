-- Helpers for the pgTAP tests (Tech.md §16, DB.md §12). scripts/test-db.ts runs this
-- before every test run, on the test project only. Never apply it to a real project:
-- tests.reset_data() deletes every person, task, and history row.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to authenticated, service_role, anon;

-- Acts as the given person for the next statements (auth.uid() reads this claim).
create or replace function tests.as_user(p_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claim.sub', coalesce(p_id::text, ''), false);
$$;

-- Remembers an id under a name for the rest of the file (one connection per file).
create or replace function tests.keep(p_name text, p_id uuid)
returns uuid
language sql
as $$
  select set_config('tests.' || p_name, p_id::text, false)::uuid;
$$;

create or replace function tests.id(p_name text)
returns uuid
language sql
stable
as $$
  select nullif(current_setting('tests.' || p_name, true), '')::uuid;
$$;

-- Month starts relative to the organization's today, so the tests run on any date.
-- tests.month(0) is the current month, tests.month(-2) two months back.
create or replace function tests.month(p_offset integer)
returns date
language sql
stable
as $$
  select (app.month_start(app.org_today()) + make_interval(months => p_offset))::date;
$$;

-- The statement fails with exactly this message (the error keys of DB.md §10).
create or replace function tests.fails(p_sql text, p_message text)
returns text
language sql
as $$
  select extensions.throws_ok(p_sql, null::char(5), p_message, p_message);
$$;

grant execute on function tests.as_user(uuid), tests.keep(text, uuid), tests.id(text),
  tests.month(integer), tests.fails(text, text) to authenticated, service_role, anon;

-- Empties every app table and the test people in auth.users, and restores the default
-- settings. History is append-only, so its truncate guard is lifted for the moment.
create or replace function tests.reset_data()
returns void
language plpgsql
as $$
begin
  if exists (select 1 from auth.users where email not ilike '%@example.com') then
    raise exception 'refusing to reset: auth.users has people outside @example.com';
  end if;

  alter table public.audit_events disable trigger audit_events_no_truncate;
  truncate public.notifications, public.audit_events, public.month_report_lines,
           public.month_closures, public.time_entries, public.timers, public.rates,
           public.task_links, public.task_comments, public.extra_hours_requests,
           public.estimate_revisions, public.proposals, public.tasks,
           public.project_members, public.projects, public.invitations, public.profiles;
  alter table public.audit_events enable trigger audit_events_no_truncate;

  delete from auth.users where email ilike '%@example.com';

  update public.organization_settings
     set name = 'Olifant Digital', time_zone = 'Europe/Budapest',
         tolerance_percent = 10, default_currency = 'EUR'
   where id = 1;
end;
$$;

revoke execute on function tests.reset_data() from public, anon, authenticated, service_role;
