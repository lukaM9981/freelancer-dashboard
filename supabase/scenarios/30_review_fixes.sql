-- Checks added after the cross-document review. Runs after 20_more.sql.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on

create or replace function pg_temp.expect_error(p_sql text, p_expected text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return 'FAIL  no error, expected ' || p_expected;
exception when others then
  return case when sqlerrm = p_expected then 'ok    ' || p_expected
              else 'FAIL  got "' || sqlerrm || '", expected ' || p_expected end;
end $$;
create or replace function pg_temp.check(p_label text, p_ok boolean)
returns text language sql as $$ select case when p_ok then 'ok    ' else 'FAIL  ' end || p_label $$;
create or replace function pg_temp.as_user(p_id uuid)
returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(p_id::text, ''), false); end $$;
grant execute on function pg_temp.expect_error(text, text), pg_temp.check(text, boolean), pg_temp.as_user(uuid) to public;

\set admin '''a0000000-0000-0000-0000-000000000001'''
\set f1    '''f1000000-0000-0000-0000-000000000001'''
\set f3    '''f3000000-0000-0000-0000-000000000003'''
\set f4    '''f4000000-0000-0000-0000-000000000004'''

select id as project_id from public.projects where name = 'Website' \gset
select id as t1 from public.tasks where title = 'Pricing page' \gset

-- ---------------------------------------------------------------- notifications carry safe data
select pg_temp.check('assignee notified of limit reached (system event)', exists (select 1 from public.notifications where recipient_id = :f1 and type = 'task.limit_reached'));
select pg_temp.check('month.closed notification has the month, not the freelancer list', exists (select 1 from public.notifications where recipient_id = :f1 and type = 'month.closed' and data ? 'month' and not data ? 'freelancer_ids'));
select pg_temp.check('per-task estimate.submitted events exist', exists (select 1 from public.audit_events where event_type = 'estimate.submitted' and task_id = :'t1'));

-- ---------------------------------------------------------------- reassign: no trace of the other freelancer
-- (f3 became an Admin in 20_more.sql, so a new freelancer takes over the task)
set role authenticated;
select pg_temp.as_user(:admin);
select public.create_invitation('dora@example.com', 'Dora', 'freelancer', 'hash-f4') is not null;
reset role;
insert into auth.users (id, email) values (:f4, 'dora@example.com');
set role authenticated;
select pg_temp.as_user(:admin);
select public.add_project_member(:'project_id', :f4);
select pg_temp.as_user(:f1);
select public.create_task(:'project_id', 'Copy review') as r1 \gset
select public.add_comment(:'r1', 'Draft notes from Ana') as rc \gset
select public.set_task_estimate(:'r1', 30, 60);
select public.submit_proposal(:'project_id', array[:'r1']::uuid[]) as rp \gset
select pg_temp.as_user(:admin);
select public.approve_all_remaining(:'rp');
select pg_temp.as_user(:f1);
select public.request_extra_hours(:'r1', 30, 'More pages than expected') as rx \gset
select pg_temp.as_user(:admin);
select public.assign_task(:'r1', :f4);
reset role;
select pg_temp.check('reassign cancelled the pending extra-hours request', (select status = 'cancelled' from public.extra_hours_requests where id = :'rx'));
select pg_temp.check('previous assignee told via task.unassigned', exists (select 1 from public.notifications where recipient_id = :f1 and type = 'task.unassigned' and email_status = 'pending'));
set role authenticated;
select pg_temp.as_user(:f1);
select pg_temp.expect_error(format($$select public.edit_comment(%L, 'changed later')$$, :'rc'), 'task_not_found');
select pg_temp.expect_error(format($$select public.delete_comment(%L)$$, :'rc'), 'task_not_found');
select pg_temp.as_user(:f4);
select pg_temp.check('new assignee sees the task', exists (select 1 from public.tasks where id = :'r1'));
select pg_temp.check('new assignee history has no previous assignee id', not exists (
  select 1 from public.audit_events where task_id = :'r1' and data::text like '%f1000000%'));
select pg_temp.check('new assignee sees no unassigned event', not exists (
  select 1 from public.audit_events where event_type = 'task.unassigned'));
reset role;

-- ---------------------------------------------------------------- daily cap checks only touched dates
insert into public.time_entries (task_id, user_id, work_date, duration_minutes, description, source)
values (:'t1', :f1, app.org_today() - 1, 1450, 'Seeded long day', 'manual');
set role authenticated;
select pg_temp.as_user(:f1);
select pg_temp.check('an over-cap day elsewhere does not block today', (select public.add_time_entry(:'t1', app.org_today(), 5, 'Quick fix') is not null));
select pg_temp.expect_error(format($$select public.add_time_entry(%L, app.org_today() - 1, 5, 'x')$$, :'t1'), 'daily_limit_exceeded');

-- ---------------------------------------------------------------- nothing before the latest closed month
select pg_temp.as_user(:admin);
select public.close_month(date '2026-09-01');
reset role;
update public.tasks set first_approved_on = date '2026-08-01' where id = :'t1';
set role authenticated;
select pg_temp.as_user(:f1);
select pg_temp.expect_error(format($$select public.add_time_entry(%L, date '2026-08-20', 30, 'late August')$$, :'t1'), 'month_closed');

-- ---------------------------------------------------------------- timer under a minute is discarded
select public.start_timer(:'t1') as short_timer \gset
reset role;
update public.timers set started_at = now() - interval '40 seconds' where id = :'short_timer';
set role authenticated;
select pg_temp.as_user(:f1);
select pg_temp.check('40-second timer saves nothing', (select public.stop_timer((select started_at from public.timers where id = :'short_timer'), now(), 'blip') = 0));

-- ---------------------------------------------------------------- archived projects are read-only
select pg_temp.as_user(:admin);
select public.create_project('Old site') as old_project \gset
select public.create_task(:'old_project', 'Never started') as old_task \gset
select public.set_project_status(:'old_project', 'archived');
select pg_temp.expect_error(format($$select public.update_task(%L, 'Renamed', '')$$, :'old_task'), 'project_archived');
select pg_temp.expect_error(format($$select public.add_comment(%L, 'hello')$$, :'old_task'), 'project_archived');

-- ---------------------------------------------------------------- outbox does not starve
reset role;
update public.notifications set email_status = 'failed', email_attempts = 5 where email_status <> 'none';
insert into public.notifications (recipient_id, event_id, type, txid, email_status, created_at)
select :admin, (select min(id) from public.audit_events), 'test.exhausted', 900000 + g, 'failed', now() - interval '1 day'
  from generate_series(1, 30) g;
update public.notifications set email_attempts = 5 where type = 'test.exhausted';
insert into public.notifications (recipient_id, event_id, type, txid, email_status)
values (:f1, (select min(id) from public.audit_events), 'test.fresh', 999999, 'pending');
set role service_role;
select pg_temp.check('fresh email claimed despite 30 exhausted older groups', exists (select 1 from public.claim_email_batch(20) where type = 'test.fresh'));
reset role;

-- ---------------------------------------------------------------- admins can see failed emails
set role authenticated;
select pg_temp.as_user(:admin);
select pg_temp.check('admin can read others'' notifications', exists (select 1 from public.notifications where recipient_id <> :admin));
reset role;

select 'review fixes finished';
