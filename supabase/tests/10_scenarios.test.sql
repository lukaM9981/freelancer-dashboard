-- The main flow: invitations, estimates and decisions, isolation, counting time against
-- the limit (PRD §5.4 example), timer splits, automatic stops, reassigning, months,
-- guards, the outbox, and deactivation. Runs first, on an empty database.
select no_plan();

select tests.keep('admin', 'a0000000-0000-0000-0000-000000000001');
select tests.keep('f1', 'f1000000-0000-0000-0000-000000000001');
select tests.keep('f2', 'f2000000-0000-0000-0000-000000000002');

-- ---------------------------------------------------------------- bootstrap
insert into public.invitations (email, full_name, role, token_hash, expires_at)
values ('luka@example.com', 'Luka Admin', 'admin', 'hash-admin', now() + interval '7 days');
insert into auth.users (id, email) values (tests.id('admin'), 'luka@example.com');
select ok(exists (select 1 from public.profiles where id = tests.id('admin') and role = 'admin'), 'bootstrap admin profile');

select tests.fails($$insert into auth.users (id, email) values (gen_random_uuid(), 'nobody@example.com')$$, 'no_valid_invitation');

-- ---------------------------------------------------------------- invitations as admin
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.create_invitation('ana@example.com', 'Ana Freelancer', 'freelancer', 'hash-f1') is not null;
select public.create_invitation('ben@example.com', 'Ben Freelancer', 'freelancer', 'hash-f2') is not null;
select tests.fails($$select public.create_invitation('ana@example.com','x','freelancer','h')$$, 'invitation_pending');
reset role;
insert into auth.users (id, email) values (tests.id('f1'), 'ana@example.com'), (tests.id('f2'), 'ben@example.com');
select ok((select count(*) from public.profiles where role = 'freelancer') = 2, 'freelancer profiles created');

-- ---------------------------------------------------------------- setup
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.add_rate(tests.id('f1'), 40.00, 'EUR', tests.month(-12)) is not null;
select tests.keep('project', public.create_project('Website', 'Company site'));
select public.add_project_member(tests.id('project'), tests.id('f1'));
select public.add_project_member(tests.id('project'), tests.id('f2'));
select tests.keep('t2', public.create_task(tests.id('project'), 'Checkout bug', '', tests.id('f2')));

select tests.as_user(tests.id('f1'));
select tests.keep('t1', public.create_task(tests.id('project'), 'Pricing page', 'Rebuild it'));
select public.set_task_estimate(tests.id('t1'), 240, 480, 'Two variants');
select tests.fails(format($$select public.set_task_estimate(%L, 240, 470)$$, tests.id('t1')), 'new row for relation "tasks" violates check constraint "tasks_estimate_max_minutes_check"');
select tests.keep('p1', public.submit_proposal(tests.id('project'), array[tests.id('t1')]));
select tests.fails(format($$select public.close_month(%L)$$, tests.month(-2)), 'admin_only');

select tests.as_user(tests.id('f2'));
select public.set_task_estimate(tests.id('t2'), 60, 120);
select tests.keep('p2', public.submit_proposal(tests.id('project'), array[tests.id('t2')]));

-- ---------------------------------------------------------------- isolation
select tests.as_user(tests.id('f1'));
select ok((select count(*) from public.tasks) = 1, 'f1 sees only own task');
select ok((select count(*) from public.profiles) = 2, 'f1 sees self + admin only');
select ok((select count(*) from public.project_members) = 1, 'f1 sees no other membership');
select ok((select count(*) from public.proposals) = 1, 'f1 sees own proposal only');
select ok((select count(*) from public.rates) = 1, 'f1 sees own rate');
select tests.fails(format($$select public.start_timer(%L)$$, tests.id('t2')), 'task_not_found');
select tests.fails($$insert into public.projects (name, created_by) values ('x', 'f1000000-0000-0000-0000-000000000001')$$, 'permission denied for table projects');

select tests.as_user(tests.id('f2'));
select ok((select count(*) from public.rates) = 0, 'f2 sees no rates');
select ok(not exists (select 1 from public.profiles where id = tests.id('f1')), 'f2 cannot see f1 profile');

-- ---------------------------------------------------------------- decisions
select tests.as_user(tests.id('admin'));
select public.approve_all_remaining(tests.id('p1'));
select tests.fails(format($$select public.decide_estimates(jsonb_build_array(jsonb_build_object('revision_id', (select id from public.estimate_revisions where proposal_id = %L), 'decision', 'rejected')))$$, tests.id('p2')), 'comment_required');
select public.decide_estimates(jsonb_build_array(jsonb_build_object(
  'revision_id', (select id from public.estimate_revisions where proposal_id = tests.id('p2')),
  'decision', 'changes_requested', 'comment', 'Split it into two tasks')));
reset role;
select ok((select status = 'approved' and limit_minutes = 480 and first_approved_on = app.org_today() from public.tasks where id = tests.id('t1')), 't1 approved with 8h limit');
select ok((select status = 'changes_requested' from public.tasks where id = tests.id('t2')) and exists (select 1 from public.task_comments where task_id = tests.id('t2') and kind = 'decision'), 't2 changes requested + decision comment');
select ok((select count(*) from public.proposals where completed_at is not null) = 2, 'proposals completed');
select ok(exists (select 1 from public.notifications where recipient_id = tests.id('f1') and type = 'estimate.decided' and email_status = 'pending'), 'f1 email notification pending');
select ok((select count(*) from public.notifications where recipient_id = tests.id('admin') and type = 'proposal.submitted') = 2, 'admin notified of proposals');

-- ---------------------------------------------------------------- time and the ceiling (PRD §5.4 example)
set role authenticated;
select tests.as_user(tests.id('f1'));
select public.add_time_entry(tests.id('t1'), app.org_today(), 510, 'Layout and copy') is not null;
select tests.keep('e2', public.add_time_entry(tests.id('t1'), app.org_today(), 60, 'Responsive fixes'));
reset role;
select ok((select counted_minutes = 18 and over_limit_minutes = 42 from public.time_entries where id = tests.id('e2')), '8h30 + 1h -> 18 counted, 42 over');
select ok((select status = 'in_progress' and counted_minutes = 528 and over_limit_minutes = 42 from public.tasks where id = tests.id('t1')), 'task in progress, 528 counted, 42 over');
select ok((select count(*) from public.audit_events where task_id = tests.id('t1') and event_type in ('task.limit_reached', 'task.over_limit')) = 2, 'limit_reached + over_limit events');

set role authenticated;
select tests.as_user(tests.id('f1'));
select tests.fails(format($$select public.add_time_entry(%L, app.org_today() + 1, 10, 'x')$$, tests.id('t1')), 'work_date_in_future');
select tests.fails(format($$select public.add_time_entry(%L, app.org_today(), 900, 'too much')$$, tests.id('t1')), 'daily_limit_exceeded');
select tests.keep('x1', public.request_extra_hours(tests.id('t1'), 60, 'Second variant needs more QA'));
select tests.fails(format($$select public.request_extra_hours(%L, 30, 'again')$$, tests.id('t1')), 'extra_hours_pending');
select tests.as_user(tests.id('admin'));
select public.decide_extra_hours(tests.id('x1'), true);
reset role;
select ok((select limit_minutes = 540 and counted_minutes = 570 and over_limit_minutes = 0 from public.tasks where id = tests.id('t1')), 'extra hour recounts over-limit into counted');

-- ---------------------------------------------------------------- timer: midnight split
set role authenticated;
select tests.as_user(tests.id('f1'));
select tests.keep('timer1', public.start_timer(tests.id('t1')));
select tests.fails(format($$select public.start_timer(%L)$$, tests.id('t1')), 'timer_already_running');
reset role;
-- pretend the timer started at 23:30 two days ago (local) and the task was approved before that
update public.tasks set first_approved_on = app.org_today() - 3 where id = tests.id('t1');
update public.timers set started_at = ((app.org_today() - 2)::timestamp + time '23:30') at time zone app.org_time_zone() where id = tests.id('timer1');
set role authenticated;
select tests.as_user(tests.id('f1'));
select is(public.stop_timer(
  ((app.org_today() - 2)::timestamp + time '23:30') at time zone app.org_time_zone(),
  ((app.org_today() - 1)::timestamp + time '00:20') at time zone app.org_time_zone(),
  'Late fix'), 50, 'timer saved 50 min');
reset role;
select ok((select string_agg(duration_minutes::text, '+' order by work_date) from public.time_entries where timer_id = tests.id('timer1')) = '30+20', 'split into 30 + 20 on two dates');

-- DST: 2026-10-25 Budapest clocks go back at 03:00. 23:00 on the 24th to 04:00 on the 25th is 6 real hours.
select ok((
  with b as (
    select g.d::date as work_date,
           greatest(timestamptz '2026-10-24 23:00 Europe/Budapest', g.d at time zone 'Europe/Budapest') s,
           least(timestamptz '2026-10-25 04:00 Europe/Budapest', (g.d + interval '1 day') at time zone 'Europe/Budapest') e
      from generate_series(date '2026-10-24'::timestamp, date '2026-10-25'::timestamp, interval '1 day') g(d))
  select string_agg((extract(epoch from e - s) / 60)::int::text, '+' order by work_date) from b) = '60+300', 'DST split 60 + 300');

-- ---------------------------------------------------------------- hold auto-stops the timer
set role authenticated;
select tests.as_user(tests.id('f1'));
select public.start_timer(tests.id('t1')) is not null;
reset role;
update public.timers set started_at = now() - interval '25 minutes' where user_id = tests.id('f1') and stopped_at is null;
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.hold_task(tests.id('t1'));
reset role;
select ok(exists (select 1 from public.time_entries where task_id = tests.id('t1') and auto_stopped_reason = 'task put on hold' and duration_minutes = 25), 'hold stopped timer and saved 25 min');
select ok(exists (select 1 from public.notifications where recipient_id = tests.id('f1') and type = 'timer.auto_stopped'), 'f1 notified about auto stop');
set role authenticated;
select tests.as_user(tests.id('f1'));
select tests.fails(format($$select public.add_time_entry(%L, app.org_today(), 10, 'x')$$, tests.id('t1')), 'invalid_task_status');
select public.update_time_entry((select id from public.time_entries where auto_stopped_reason = 'task put on hold'), 'Pricing tweaks before the pause');
select ok(exists (select 1 from public.time_entries where description = 'Pricing tweaks before the pause' and duration_minutes = 25), 'description fixable while on hold');
select tests.fails($$select public.update_time_entry((select id from public.time_entries where auto_stopped_reason = 'task put on hold'), 'x', p_ended_at => (select ended_at from public.time_entries where auto_stopped_reason = 'task put on hold') - interval '5 minutes')$$, 'invalid_task_status');
select tests.as_user(tests.id('admin'));
select public.resume_task(tests.id('t1'));
reset role;
select ok((select status = 'in_progress' from public.tasks where id = tests.id('t1')), 'resume returns to in_progress');

-- ---------------------------------------------------------------- reassign and history isolation
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.assign_task(tests.id('t2'), tests.id('f1'));
select tests.fails(format($$select public.assign_task(%L, %L)$$, tests.id('t1'), tests.id('f2')), 'task_has_time');
select tests.as_user(tests.id('f1'));
select ok(exists (select 1 from public.tasks where id = tests.id('t2') and status = 'draft'), 'f1 now sees t2');
select ok(not exists (select 1 from public.estimate_revisions where task_id = tests.id('t2')), 'f1 cannot see f2 revision on t2');
select ok(not exists (select 1 from public.task_comments where task_id = tests.id('t2')), 'f1 cannot see earlier comments on t2');
select ok(not exists (select 1 from public.audit_events where task_id = tests.id('t2') and event_type = 'proposal.submitted'), 'f1 sees only history since assignment');
select tests.as_user(tests.id('f2'));
select ok(not exists (select 1 from public.tasks where id = tests.id('t2')), 'f2 lost t2');

-- ---------------------------------------------------------------- months
-- Two months back stands in for "last month", so the timer split above (which can
-- fall into last month early in a month) never lands in the month being closed.
reset role;
update public.tasks set first_approved_on = tests.month(-2) where id = tests.id('t1');
set role authenticated;
select tests.as_user(tests.id('f1'));
select tests.keep('sept', public.add_time_entry(tests.id('t1'), tests.month(-2) + 14, 90, 'Earlier month work'));
select tests.as_user(tests.id('admin'));
select tests.fails(format($$select public.close_month(%L)$$, tests.month(0)), 'month_not_ended');
select public.close_month(tests.month(-2));
reset role;
select ok((select amount = 60.00 and currency = 'EUR' and counted_minutes = 90 from public.month_report_lines where month = tests.month(-2)), 'frozen line 90 min x 40 EUR = 60.00');
select tests.fails(format($$update public.time_entries set description = 'edit' where id = %L$$, tests.id('sept')), 'month_closed');
set role authenticated;
select tests.as_user(tests.id('admin'));
select tests.fails(format($$select public.add_rate(%L, 45, 'EUR', %L)$$, tests.id('f1'), tests.month(-2) + 19), 'rate_in_closed_month');
select public.reopen_month(tests.month(-2), 'Wrong description');
reset role;
select ok(not exists (select 1 from public.month_report_lines), 'reopen removed frozen lines');
select ok(exists (select 1 from public.notifications where recipient_id = tests.id('f1') and type = 'month.closed' and email_status = 'pending'), 'f1 got month.closed email');

-- ---------------------------------------------------------------- guards
select tests.fails($$update public.audit_events set event_type = 'x'$$, 'audit_events_are_append_only');
select tests.fails(format($$update public.tasks set status = 'accepted' where id = %L$$, tests.id('t2')), 'invalid_status_transition');

-- ---------------------------------------------------------------- outbox
set role service_role;
select ok((select count(*) > 0 from public.claim_email_batch(50)), 'claim groups emails');
select public.complete_email_batch(array(select id from public.notifications where email_status = 'sending'), true);
reset role;
select ok(not exists (select 1 from public.notifications where email_status in ('pending', 'sending')), 'all emails sent');

-- ---------------------------------------------------------------- deactivation
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.deactivate_person(tests.id('f2'));
select tests.fails(format($$select public.deactivate_person(%L)$$, tests.id('admin')), 'last_admin');
select tests.as_user(tests.id('f2'));
select ok((select count(*) from public.projects) = 0 and (select count(*) from public.profiles) = 0, 'deactivated user sees nothing');
reset role;

select * from finish();
