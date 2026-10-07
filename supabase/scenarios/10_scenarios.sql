-- Scenario tests for the migrations. Run as postgres; switches roles inside.
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
returns text language sql as $$
  select case when p_ok then 'ok    ' else 'FAIL  ' end || p_label
$$;

create or replace function pg_temp.as_user(p_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_id::text, ''), false);
end $$;
grant execute on function pg_temp.expect_error(text, text), pg_temp.check(text, boolean), pg_temp.as_user(uuid) to public;

-- ids
\set admin   '''a0000000-0000-0000-0000-000000000001'''
\set f1      '''f1000000-0000-0000-0000-000000000001'''
\set f2      '''f2000000-0000-0000-0000-000000000002'''

-- ---------------------------------------------------------------- bootstrap
insert into public.invitations (email, full_name, role, token_hash, expires_at)
values ('luka@example.com', 'Luka Admin', 'admin', 'hash-admin', now() + interval '7 days');
insert into auth.users (id, email) values (:admin, 'luka@example.com');
select pg_temp.check('bootstrap admin profile', exists (select 1 from public.profiles where id = :admin and role = 'admin'));

select pg_temp.expect_error($$insert into auth.users (email) values ('nobody@example.com')$$, 'no_valid_invitation');

-- ---------------------------------------------------------------- invitations as admin
set role authenticated;
select pg_temp.as_user(:admin);
select public.create_invitation('ana@example.com', 'Ana Freelancer', 'freelancer', 'hash-f1') is not null;
select public.create_invitation('ben@example.com', 'Ben Freelancer', 'freelancer', 'hash-f2') is not null;
select pg_temp.expect_error($$select public.create_invitation('ana@example.com','x','freelancer','h')$$, 'invitation_pending');
reset role;
insert into auth.users (id, email) values (:f1, 'ana@example.com'), (:f2, 'ben@example.com');
select pg_temp.check('freelancer profiles created', (select count(*) from public.profiles where role = 'freelancer') = 2);

-- ---------------------------------------------------------------- setup
set role authenticated;
select pg_temp.as_user(:admin);
select public.add_rate(:f1, 40.00, 'EUR', date '2026-01-01') is not null;
select public.create_project('Website', 'Company site') as project_id \gset
select public.add_project_member(:'project_id', :f1);
select public.add_project_member(:'project_id', :f2);
select public.create_task(:'project_id', 'Checkout bug', '', :f2) as t2 \gset

select pg_temp.as_user(:f1);
select public.create_task(:'project_id', 'Pricing page', 'Rebuild it') as t1 \gset
select public.set_task_estimate(:'t1', 240, 480, 'Two variants');
select pg_temp.expect_error(format($$select public.set_task_estimate(%L, 240, 470)$$, :'t1'), 'new row for relation "tasks" violates check constraint "tasks_estimate_max_minutes_check"');
select public.submit_proposal(:'project_id', array[:'t1']::uuid[]) as p1 \gset
select pg_temp.expect_error($$select public.close_month('2026-09-01')$$, 'admin_only');

select pg_temp.as_user(:f2);
select public.set_task_estimate(:'t2', 60, 120);
select public.submit_proposal(:'project_id', array[:'t2']::uuid[]) as p2 \gset

-- ---------------------------------------------------------------- isolation
select pg_temp.as_user(:f1);
select pg_temp.check('f1 sees only own task', (select count(*) from public.tasks) = 1);
select pg_temp.check('f1 sees self + admin only', (select count(*) from public.profiles) = 2);
select pg_temp.check('f1 sees no other membership', (select count(*) from public.project_members) = 1);
select pg_temp.check('f1 sees own proposal only', (select count(*) from public.proposals) = 1);
select pg_temp.check('f1 sees own rate', (select count(*) from public.rates) = 1);
select pg_temp.expect_error(format($$select public.start_timer(%L)$$, :'t2'), 'task_not_found');
select pg_temp.expect_error($$insert into public.projects (name, created_by) values ('x', 'f1000000-0000-0000-0000-000000000001')$$, 'permission denied for table projects');

select pg_temp.as_user(:f2);
select pg_temp.check('f2 sees no rates', (select count(*) from public.rates) = 0);
select pg_temp.check('f2 cannot see f1 profile', not exists (select 1 from public.profiles where id = 'f1000000-0000-0000-0000-000000000001'));

-- ---------------------------------------------------------------- decisions
select pg_temp.as_user(:admin);
select public.approve_all_remaining(:'p1');
select pg_temp.expect_error(format($$select public.decide_estimates(jsonb_build_array(jsonb_build_object('revision_id', (select id from public.estimate_revisions where proposal_id = %L), 'decision', 'rejected')))$$, :'p2'), 'comment_required');
select public.decide_estimates(jsonb_build_array(jsonb_build_object(
  'revision_id', (select id from public.estimate_revisions where proposal_id = :'p2'),
  'decision', 'changes_requested', 'comment', 'Split it into two tasks')));
reset role;
select pg_temp.check('t1 approved with 8h limit', (select status = 'approved' and limit_minutes = 480 and first_approved_on = app.org_today() from public.tasks where id = :'t1'));
select pg_temp.check('t2 changes requested + decision comment', (select status = 'changes_requested' from public.tasks where id = :'t2') and exists (select 1 from public.task_comments where task_id = :'t2' and kind = 'decision'));
select pg_temp.check('proposals completed', (select count(*) from public.proposals where completed_at is not null) = 2);
select pg_temp.check('f1 email notification pending', exists (select 1 from public.notifications where recipient_id = :f1 and type = 'estimate.decided' and email_status = 'pending'));
select pg_temp.check('admin notified of proposals', (select count(*) from public.notifications where recipient_id = :admin and type = 'proposal.submitted') = 2);

-- ---------------------------------------------------------------- time and the ceiling (PRD §5.4 example)
set role authenticated;
select pg_temp.as_user(:f1);
select public.add_time_entry(:'t1', app.org_today(), 510, 'Layout and copy') is not null;
select public.add_time_entry(:'t1', app.org_today(), 60, 'Responsive fixes') as e2 \gset
reset role;
select pg_temp.check('8h30 + 1h -> 18 counted, 42 over', (select counted_minutes = 18 and over_limit_minutes = 42 from public.time_entries where id = :'e2'));
select pg_temp.check('task in progress, 528 counted, 42 over', (select status = 'in_progress' and counted_minutes = 528 and over_limit_minutes = 42 from public.tasks where id = :'t1'));
select pg_temp.check('limit_reached + over_limit events', (select count(*) from public.audit_events where task_id = :'t1' and event_type in ('task.limit_reached', 'task.over_limit')) = 2);

set role authenticated;
select pg_temp.as_user(:f1);
select pg_temp.expect_error(format($$select public.add_time_entry(%L, app.org_today() + 1, 10, 'x')$$, :'t1'), 'work_date_in_future');
select pg_temp.expect_error(format($$select public.add_time_entry(%L, app.org_today(), 900, 'too much')$$, :'t1'), 'daily_limit_exceeded');
select public.request_extra_hours(:'t1', 60, 'Second variant needs more QA') as x1 \gset
select pg_temp.expect_error(format($$select public.request_extra_hours(%L, 30, 'again')$$, :'t1'), 'extra_hours_pending');
select pg_temp.as_user(:admin);
select public.decide_extra_hours(:'x1', true);
reset role;
select pg_temp.check('extra hour recounts over-limit into counted', (select limit_minutes = 540 and counted_minutes = 570 and over_limit_minutes = 0 from public.tasks where id = :'t1'));

-- ---------------------------------------------------------------- timer: midnight split
set role authenticated;
select pg_temp.as_user(:f1);
select public.start_timer(:'t1') as timer1 \gset
select pg_temp.expect_error(format($$select public.start_timer(%L)$$, :'t1'), 'timer_already_running');
reset role;
-- pretend the timer started at 23:30 yesterday (local) and the task was approved two days ago
update public.tasks set first_approved_on = app.org_today() - 2 where id = :'t1';
update public.timers set started_at = ((app.org_today() - 1)::timestamp + time '23:30') at time zone app.org_time_zone() where id = :'timer1';
set role authenticated;
select pg_temp.as_user(:f1);
select public.stop_timer(
  ((app.org_today() - 1)::timestamp + time '23:30') at time zone app.org_time_zone(),
  (app.org_today()::timestamp + time '00:20') at time zone app.org_time_zone(),
  'Late fix') as saved \gset
reset role;
select pg_temp.check('timer saved 50 min', :saved = 50);
select pg_temp.check('split into 30 + 20 on two dates', (select string_agg(duration_minutes::text, '+' order by work_date) from public.time_entries where timer_id = :'timer1') = '30+20');

-- DST: 2026-10-25 Budapest clocks go back at 03:00. 23:00 on the 24th to 04:00 on the 25th is 6 real hours.
select pg_temp.check('DST split 60 + 300', (
  with b as (
    select g.d::date as work_date,
           greatest(timestamptz '2026-10-24 23:00 Europe/Budapest', g.d at time zone 'Europe/Budapest') s,
           least(timestamptz '2026-10-25 04:00 Europe/Budapest', (g.d + interval '1 day') at time zone 'Europe/Budapest') e
      from generate_series(date '2026-10-24'::timestamp, date '2026-10-25'::timestamp, interval '1 day') g(d))
  select string_agg((extract(epoch from e - s) / 60)::int::text, '+' order by work_date) from b) = '60+300');

-- ---------------------------------------------------------------- hold auto-stops the timer
set role authenticated;
select pg_temp.as_user(:f1);
select public.start_timer(:'t1') is not null;
reset role;
update public.timers set started_at = now() - interval '25 minutes' where user_id = :f1 and stopped_at is null;
set role authenticated;
select pg_temp.as_user(:admin);
select public.hold_task(:'t1');
reset role;
select pg_temp.check('hold stopped timer and saved 25 min', exists (select 1 from public.time_entries where task_id = :'t1' and auto_stopped_reason = 'task put on hold' and duration_minutes = 25));
select pg_temp.check('f1 notified about auto stop', exists (select 1 from public.notifications where recipient_id = :f1 and type = 'timer.auto_stopped'));
set role authenticated;
select pg_temp.as_user(:f1);
select pg_temp.expect_error(format($$select public.add_time_entry(%L, app.org_today(), 10, 'x')$$, :'t1'), 'invalid_task_status');
select public.update_time_entry((select id from public.time_entries where auto_stopped_reason = 'task put on hold'), 'Pricing tweaks before the pause');
select pg_temp.check('description fixable while on hold', exists (select 1 from public.time_entries where description = 'Pricing tweaks before the pause' and duration_minutes = 25));
select pg_temp.expect_error(format($$select public.update_time_entry((select id from public.time_entries where auto_stopped_reason = 'task put on hold'), 'x', p_ended_at => (select ended_at from public.time_entries where auto_stopped_reason = 'task put on hold') - interval '5 minutes')$$), 'invalid_task_status');
select pg_temp.as_user(:admin);
select public.resume_task(:'t1');
reset role;
select pg_temp.check('resume returns to in_progress', (select status = 'in_progress' from public.tasks where id = :'t1'));

-- ---------------------------------------------------------------- reassign and history isolation
set role authenticated;
select pg_temp.as_user(:admin);
select public.assign_task(:'t2', :f1);
select pg_temp.expect_error(format($$select public.assign_task(%L, %L)$$, :'t1', :f2), 'task_has_time');
select pg_temp.as_user(:f1);
select pg_temp.check('f1 now sees t2', exists (select 1 from public.tasks where id = :'t2' and status = 'draft'));
select pg_temp.check('f1 cannot see f2 revision on t2', not exists (select 1 from public.estimate_revisions where task_id = :'t2'));
select pg_temp.check('f1 cannot see earlier comments on t2', not exists (select 1 from public.task_comments where task_id = :'t2'));
select pg_temp.check('f1 sees only history since assignment', not exists (select 1 from public.audit_events where task_id = :'t2' and event_type = 'proposal.submitted'));
select pg_temp.as_user(:f2);
select pg_temp.check('f2 lost t2', not exists (select 1 from public.tasks where id = :'t2'));

-- ---------------------------------------------------------------- months
reset role;
-- a September entry (approval date moved back for the test)
update public.tasks set first_approved_on = date '2026-09-01' where id = :'t1';
set role authenticated;
select pg_temp.as_user(:f1);
select public.add_time_entry(:'t1', date '2026-09-15', 90, 'September work') as sept \gset
select pg_temp.as_user(:admin);
select pg_temp.expect_error($$select public.close_month(date '2026-10-01')$$, 'month_not_ended');
select public.close_month(date '2026-09-01');
reset role;
select pg_temp.check('frozen line 90 min x 40 EUR = 60.00', (select amount = 60.00 and currency = 'EUR' and counted_minutes = 90 from public.month_report_lines where month = date '2026-09-01'));
select pg_temp.expect_error(format($$update public.time_entries set description = 'edit' where id = %L$$, :'sept'), 'month_closed');
set role authenticated;
select pg_temp.as_user(:admin);
select pg_temp.expect_error(format($$select public.add_rate(%L, 45, 'EUR', date '2026-09-20')$$, :f1), 'rate_in_closed_month');
select public.reopen_month(date '2026-09-01', 'Wrong description');
reset role;
select pg_temp.check('reopen removed frozen lines', not exists (select 1 from public.month_report_lines));
select pg_temp.check('f1 got month.closed email', exists (select 1 from public.notifications where recipient_id = :f1 and type = 'month.closed' and email_status = 'pending'));

-- ---------------------------------------------------------------- guards
select pg_temp.expect_error($$update public.audit_events set event_type = 'x'$$, 'audit_events_are_append_only');
select pg_temp.expect_error(format($$update public.tasks set status = 'accepted' where id = %L$$, :'t2'), 'invalid_status_transition');

-- ---------------------------------------------------------------- outbox
set role service_role;
select pg_temp.check('claim groups emails', (select count(*) > 0 from public.claim_email_batch(50)));
select public.complete_email_batch(array(select id from public.notifications where email_status = 'sending'), true);
reset role;
select pg_temp.check('all emails sent', not exists (select 1 from public.notifications where email_status in ('pending', 'sending')));

-- ---------------------------------------------------------------- deactivation
set role authenticated;
select pg_temp.as_user(:admin);
select public.deactivate_person(:f2);
select pg_temp.expect_error(format($$select public.deactivate_person(%L)$$, :admin), 'last_admin');
select pg_temp.as_user(:f2);
select pg_temp.check('deactivated user sees nothing', (select count(*) from public.projects) = 0 and (select count(*) from public.profiles) = 0);
reset role;

select 'scenarios finished';
