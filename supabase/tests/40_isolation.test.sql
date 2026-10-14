-- Isolation for every table and view (PRD §4, §7, §8; DB.md §7). Runs after
-- 30_review_fixes.test.sql: Luka and Cara are Admins, Ana (f1) and Dora (f4) are active
-- freelancers on the same project, Ben (f2) is deactivated, and Dora took over a task
-- from Ana. The catalog checks cover tables added later without changes here.
select no_plan();

select tests.keep('admin', 'a0000000-0000-0000-0000-000000000001');
select tests.keep('f1', 'f1000000-0000-0000-0000-000000000001');
select tests.keep('f2', 'f2000000-0000-0000-0000-000000000002');
select tests.keep('f4', 'f4000000-0000-0000-0000-000000000004');
select tests.keep('t1', (select id from public.tasks where title = 'Pricing page'));
select tests.keep('r1', (select id from public.tasks where title = 'Copy review'));

-- ---------------------------------------------------------------- give Dora her own data
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.add_rate(tests.id('f4'), 55.00, 'EUR', tests.month(-1)) is not null;
select public.add_comment(tests.id('t1'), 'Looks good so far') is not null;
select tests.as_user(tests.id('f4'));
select public.set_task_estimate(tests.id('r1'), 60, 90);
select tests.keep('dora_proposal', public.submit_proposal((select project_id from public.tasks where id = tests.id('r1')), array[tests.id('r1')]));
select tests.as_user(tests.id('admin'));
select public.approve_all_remaining(tests.id('dora_proposal'));
select tests.as_user(tests.id('f4'));
select public.add_time_entry(tests.id('r1'), app.org_today(), 30, 'Read the drafts') is not null;
select public.add_comment(tests.id('r1'), 'Picked this up') is not null;
select public.add_task_link(tests.id('r1'), 'https://docs.example.com/copy', 'Copy doc') is not null;
select public.start_timer(tests.id('r1')) is not null;
reset role;

-- Every person-owned table holds rows of both freelancers, so the checks below are not
-- passing on empty tables.
select ok((select count(distinct user_id) >= 2 from public.time_entries where user_id in (tests.id('f1'), tests.id('f4'))), 'fixture: time entries of both freelancers');
select ok((select count(distinct user_id) >= 2 from public.rates where user_id in (tests.id('f1'), tests.id('f4'))), 'fixture: rates of both freelancers');
select ok((select count(distinct recipient_id) >= 2 from public.notifications where recipient_id in (tests.id('f1'), tests.id('f4'))), 'fixture: notifications of both freelancers');
select ok(exists (select 1 from public.estimate_revisions where task_id = tests.id('r1') and submitted_by = tests.id('f1')), 'fixture: Ana''s revision on the task Dora now has');
select ok(exists (select 1 from public.task_comments where task_id = tests.id('r1') and author_id = tests.id('f1')), 'fixture: Ana''s comment on the task Dora now has');

-- ---------------------------------------------------------------- one battery per freelancer
-- Runs as the signed-in freelancer: every row they can read must be theirs by the rules
-- of DB.md §7, and the rows they need must be there.
create or replace function tests.freelancer_isolation(p_me uuid, p_name text)
returns setof text
language plpgsql
as $$
begin
  return next ok((select count(*) = 1 from public.organization_settings),
    p_name || ' reads the settings');
  return next ok(exists (select 1 from public.profiles where id = p_me)
             and not exists (select 1 from public.profiles where id <> p_me and role <> 'admin'),
    p_name || ' sees self and Admins only (profiles)');
  return next ok(not exists (select 1 from public.invitations),
    p_name || ' sees no invitations');
  return next ok(exists (select 1 from public.projects)
             and not exists (select 1 from public.projects p
                              where p.id not in (select project_id from public.project_members)
                                and p.id not in (select project_id from public.tasks)),
    p_name || ' sees only projects they belong to or have tasks in');
  return next ok(not exists (select 1 from public.projects where name = 'Old site'),
    p_name || ' does not see a project without them');
  return next ok(exists (select 1 from public.project_members)
             and not exists (select 1 from public.project_members where user_id <> p_me),
    p_name || ' sees only own memberships');
  return next ok(exists (select 1 from public.tasks)
             and not exists (select 1 from public.tasks where assignee_id is distinct from p_me),
    p_name || ' sees only tasks assigned to them');
  return next ok(not exists (select 1 from public.proposals where submitted_by <> p_me),
    p_name || ' sees only own proposals');
  return next ok(not exists (select 1 from public.estimate_revisions r
                              where r.submitted_by <> p_me
                                 or r.task_id not in (select id from public.tasks)),
    p_name || ' sees only own revisions on current tasks');
  return next ok(not exists (select 1 from public.extra_hours_requests x
                              where x.requested_by <> p_me
                                 or x.task_id not in (select id from public.tasks)),
    p_name || ' sees only own extra-hours requests on current tasks');
  return next ok(exists (select 1 from public.task_comments)
             and not exists (select 1 from public.task_comments c
                               left join public.tasks t on t.id = c.task_id
                              where t.id is null or c.created_at < t.assigned_at),
    p_name || ' sees comments on own tasks since assignment only');
  return next ok(not exists (select 1 from public.task_links l
                              where l.task_id not in (select id from public.tasks)),
    p_name || ' sees links on own tasks only');
  return next ok(not exists (select 1 from public.timers where user_id <> p_me),
    p_name || ' sees only own timers');
  return next ok(exists (select 1 from public.time_entries)
             and not exists (select 1 from public.time_entries where user_id <> p_me),
    p_name || ' sees only own time entries');
  return next ok(exists (select 1 from public.rates)
             and not exists (select 1 from public.rates where user_id <> p_me),
    p_name || ' sees only own rates');
  return next ok((select count(*) = 1 from public.month_closures),
    p_name || ' sees which months are closed');
  return next ok(not exists (select 1 from public.month_report_lines where user_id <> p_me),
    p_name || ' sees only own frozen report lines');
  return next ok(exists (select 1 from public.audit_events)
             and not exists (select 1 from public.audit_events e
                               left join public.tasks t on t.id = e.task_id
                              where t.id is null or e.occurred_at < t.assigned_at),
    p_name || ' sees history of own tasks since assignment only');
  return next ok(exists (select 1 from public.notifications)
             and not exists (select 1 from public.notifications where recipient_id <> p_me),
    p_name || ' sees only own notifications');
  return next ok(not exists (select 1 from public.task_progress where assignee_id is distinct from p_me),
    p_name || ' sees only own tasks in task_progress');
  return next ok(exists (select 1 from public.report_lines)
             and not exists (select 1 from public.report_lines where user_id <> p_me),
    p_name || ' sees only own money in report_lines');
  return next ok(not exists (select 1 from public.approval_queue where requested_by <> p_me),
    p_name || ' sees only own items in approval_queue');
  return next ok(not exists (select 1 from public.audit_log l
                               left join public.tasks t on t.id = l.task_id
                              where t.id is null or l.occurred_at < t.assigned_at),
    p_name || ' sees history of own tasks since assignment only (audit_log)');
end;
$$;

grant execute on function tests.freelancer_isolation(uuid, text) to authenticated;

set role authenticated;
select tests.as_user(tests.id('f1'));
select * from tests.freelancer_isolation(tests.id('f1'), 'Ana');
select ok(not exists (select 1 from public.tasks where id = tests.id('r1')), 'Ana no longer sees the task she handed over');
select tests.as_user(tests.id('f4'));
select * from tests.freelancer_isolation(tests.id('f4'), 'Dora');
select ok(not exists (select 1 from public.task_comments where body = 'Draft notes from Ana'), 'Dora does not see Ana''s comment from before the handover');
select ok((select count(*) = 1 and bool_and(submitted_by = tests.id('f4')) from public.estimate_revisions where task_id = tests.id('r1')), 'Dora sees her own estimate on the task, not Ana''s');
select ok(not exists (select 1 from public.extra_hours_requests where task_id = tests.id('r1')), 'Dora does not see Ana''s extra-hours request on the task');
select ok(exists (select 1 from public.task_links where task_id = tests.id('r1')), 'Dora sees the task''s links');
reset role;

-- ---------------------------------------------------------------- Admins see everything
set role authenticated;
select tests.as_user(tests.id('admin'));
select ok((select count(distinct user_id) from public.time_entries) >= 2
      and (select count(distinct user_id) from public.rates) >= 2
      and (select count(*) from public.profiles where role = 'freelancer') >= 3
      and exists (select 1 from public.invitations)
      and exists (select 1 from public.projects where name = 'Old site'),
  'an Admin sees every person''s rows');
reset role;

-- ---------------------------------------------------------------- deactivated: nothing at all
create or replace function tests.visible_rows_per_relation()
returns table (relation name, row_count bigint)
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select c.relname
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'v')
     order by c.relname
  loop
    relation := r.relname;
    execute format('select count(*) from public.%I', r.relname) into row_count;
    return next;
  end loop;
end;
$$;

grant execute on function tests.visible_rows_per_relation() to authenticated;

set role authenticated;
select tests.as_user(tests.id('f2'));
select is(array(select relation from tests.visible_rows_per_relation() where row_count > 0),
          '{}'::name[], 'a deactivated person reads no row in any table or view');
select tests.as_user(null);
select is(array(select relation from tests.visible_rows_per_relation() where row_count > 0),
          '{}'::name[], 'a session without a person reads no row in any table or view');
reset role;

-- ---------------------------------------------------------------- catalog: every table and view
select is(array(select c.relname from pg_catalog.pg_class c
                  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
                 order by 1),
          '{}'::name[], 'RLS is enabled on every table');
select is(array(select tablename || ' ' || cmd from pg_catalog.pg_policies
                 where schemaname = 'public' and (cmd <> 'SELECT' or roles <> '{authenticated}')
                 order by 1),
          '{}'::text[], 'every policy is SELECT for authenticated');
select is(array(select c.relname from pg_catalog.pg_class c
                  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
                   and not exists (select 1 from pg_catalog.pg_policies p
                                    where p.schemaname = 'public' and p.tablename = c.relname)
                 order by 1),
          '{}'::name[], 'every table has a policy');
select is(array(select c.relname from pg_catalog.pg_class c
                  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relkind = 'v'
                   and not coalesce('security_invoker=true' = any(c.reloptions), false)
                 order by 1),
          '{}'::name[], 'every view is security_invoker');
select is(array(select c.relname from pg_catalog.pg_class c
                  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relkind in ('r', 'v', 'S', 'm')
                   and has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
                 order by 1),
          '{}'::name[], 'anon has no privilege on any table, view, or sequence');
select is(array(select c.relname from pg_catalog.pg_class c
                  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relkind in ('r', 'v', 'S', 'm')
                   and has_table_privilege('authenticated', c.oid, 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
                 order by 1),
          '{}'::name[], 'authenticated cannot write to any table, view, or sequence');
select is(array(select c.relname from pg_catalog.pg_class c
                  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relkind in ('r', 'v')
                   and not has_table_privilege('authenticated', c.oid, 'SELECT')
                 order by 1),
          '{}'::name[], 'authenticated can read every table and view (RLS decides the rows)');
select is(array(select p.oid::regprocedure::text from pg_catalog.pg_proc p
                  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                 where n.nspname in ('public', 'app')
                   and has_function_privilege('anon', p.oid, 'EXECUTE')
                 order by 1),
          '{}'::text[], 'anon cannot execute any function in public or app');
select is(array(select p.oid::regprocedure::text from pg_catalog.pg_proc p
                  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname in ('claim_email_batch', 'complete_email_batch')
                   and has_function_privilege('authenticated', p.oid, 'EXECUTE')
                 order by 1),
          '{}'::text[], 'only the service role runs the email outbox');
select is(array(select p.proname::text from pg_catalog.pg_proc p
                  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'app' and has_function_privilege('authenticated', p.oid, 'EXECUTE')
                 order by 1),
          array['assigned_since', 'can_see_project', 'ceiling_minutes', 'is_admin', 'local_date',
                'month_start', 'org_time_zone', 'org_today', 'viewer_id'],
          'authenticated executes only the app helpers that policies and views call');
select is(array(select p.oid::regprocedure::text from pg_catalog.pg_proc p
                  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.prokind = 'f'
                   and p.proname not in ('claim_email_batch', 'complete_email_batch')
                   and not (p.prosecdef and 'search_path=""' = any(p.proconfig))
                 order by 1),
          '{}'::text[], 'every command is security definer with an empty search_path');

select * from finish();
