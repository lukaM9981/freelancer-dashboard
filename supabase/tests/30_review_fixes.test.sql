-- Checks added after the cross-document review: safe notification data, reassigning
-- without a trace of the other freelancer, the daily cap, closed months, short timers,
-- archived projects, and the outbox. Runs after 20_more.test.sql.
select no_plan();

select tests.keep('admin', 'a0000000-0000-0000-0000-000000000001');
select tests.keep('f1', 'f1000000-0000-0000-0000-000000000001');
select tests.keep('f4', 'f4000000-0000-0000-0000-000000000004');
select tests.keep('project', (select id from public.projects where name = 'Website'));
select tests.keep('t1', (select id from public.tasks where title = 'Pricing page'));

-- ---------------------------------------------------------------- notifications carry safe data
select ok(exists (select 1 from public.notifications where recipient_id = tests.id('f1') and type = 'task.limit_reached'), 'assignee notified of limit reached (system event)');
select ok(exists (select 1 from public.notifications where recipient_id = tests.id('f1') and type = 'month.closed' and data ? 'month' and not data ? 'freelancer_ids'), 'month.closed notification has the month, not the freelancer list');
select ok(exists (select 1 from public.audit_events where event_type = 'estimate.submitted' and task_id = tests.id('t1')), 'per-task estimate.submitted events exist');

-- ---------------------------------------------------------------- reassign: no trace of the other freelancer
-- (f3 became an Admin in 20_more.test.sql, so a new freelancer takes over the task)
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.create_invitation('dora@example.com', 'Dora', 'freelancer', 'hash-f4') is not null;
reset role;
insert into auth.users (id, email) values (tests.id('f4'), 'dora@example.com');
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.add_project_member(tests.id('project'), tests.id('f4'));
select tests.as_user(tests.id('f1'));
select tests.keep('r1', public.create_task(tests.id('project'), 'Copy review'));
select tests.keep('rc', public.add_comment(tests.id('r1'), 'Draft notes from Ana'));
select public.set_task_estimate(tests.id('r1'), 30, 60);
select tests.keep('rp', public.submit_proposal(tests.id('project'), array[tests.id('r1')]));
select tests.as_user(tests.id('admin'));
select public.approve_all_remaining(tests.id('rp'));
select tests.as_user(tests.id('f1'));
select tests.keep('rx', public.request_extra_hours(tests.id('r1'), 30, 'More pages than expected'));
select tests.as_user(tests.id('admin'));
select public.assign_task(tests.id('r1'), tests.id('f4'));
reset role;
select ok((select status = 'cancelled' from public.extra_hours_requests where id = tests.id('rx')), 'reassign cancelled the pending extra-hours request');
select ok(exists (select 1 from public.notifications where recipient_id = tests.id('f1') and type = 'task.unassigned' and email_status = 'pending'), 'previous assignee told via task.unassigned');
set role authenticated;
select tests.as_user(tests.id('f1'));
select tests.fails(format($$select public.edit_comment(%L, 'changed later')$$, tests.id('rc')), 'task_not_found');
select tests.fails(format($$select public.delete_comment(%L)$$, tests.id('rc')), 'task_not_found');
select tests.as_user(tests.id('f4'));
select ok(exists (select 1 from public.tasks where id = tests.id('r1')), 'new assignee sees the task');
select ok(not exists (
  select 1 from public.audit_events where task_id = tests.id('r1') and data::text like '%f1000000%'), 'new assignee history has no previous assignee id');
select ok(not exists (
  select 1 from public.audit_events where event_type = 'task.unassigned'), 'new assignee sees no unassigned event');
reset role;

-- ---------------------------------------------------------------- daily cap checks only touched dates
insert into public.time_entries (task_id, user_id, work_date, duration_minutes, description, source)
values (tests.id('t1'), tests.id('f1'), app.org_today() - 1, 1450, 'Seeded long day', 'manual');
set role authenticated;
select tests.as_user(tests.id('f1'));
select ok((select public.add_time_entry(tests.id('t1'), app.org_today(), 5, 'Quick fix') is not null), 'an over-cap day elsewhere does not block today');
select tests.fails(format($$select public.add_time_entry(%L, app.org_today() - 1, 5, 'x')$$, tests.id('t1')), 'daily_limit_exceeded');

-- ---------------------------------------------------------------- nothing before the latest closed month
select tests.as_user(tests.id('admin'));
select public.close_month(tests.month(-2));
reset role;
update public.tasks set first_approved_on = tests.month(-3) where id = tests.id('t1');
set role authenticated;
select tests.as_user(tests.id('f1'));
select tests.fails(format($$select public.add_time_entry(%L, %L, 30, 'three months back')$$, tests.id('t1'), tests.month(-3) + 19), 'month_closed');

-- ---------------------------------------------------------------- timer under a minute is discarded
select tests.keep('short_timer', public.start_timer(tests.id('t1')));
reset role;
update public.timers set started_at = now() - interval '40 seconds' where id = tests.id('short_timer');
set role authenticated;
select tests.as_user(tests.id('f1'));
select is(public.stop_timer((select started_at from public.timers where id = tests.id('short_timer')), now(), 'blip'), 0, '40-second timer saves nothing');

-- ---------------------------------------------------------------- archived projects are read-only
select tests.as_user(tests.id('admin'));
select tests.keep('old_project', public.create_project('Old site'));
select tests.keep('old_task', public.create_task(tests.id('old_project'), 'Never started'));
select public.set_project_status(tests.id('old_project'), 'archived');
select tests.fails(format($$select public.update_task(%L, 'Renamed', '')$$, tests.id('old_task')), 'project_archived');
select tests.fails(format($$select public.add_comment(%L, 'hello')$$, tests.id('old_task')), 'project_archived');

-- ---------------------------------------------------------------- outbox does not starve
reset role;
update public.notifications set email_status = 'failed', email_attempts = 5 where email_status <> 'none';
insert into public.notifications (recipient_id, event_id, type, txid, email_status, created_at)
select tests.id('admin'), (select min(id) from public.audit_events), 'test.exhausted', 900000 + g, 'failed', now() - interval '1 day'
  from generate_series(1, 30) g;
update public.notifications set email_attempts = 5 where type = 'test.exhausted';
insert into public.notifications (recipient_id, event_id, type, txid, email_status)
values (tests.id('f1'), (select min(id) from public.audit_events), 'test.fresh', 999999, 'pending');
set role service_role;
select ok(exists (select 1 from public.claim_email_batch(20) where type = 'test.fresh'), 'fresh email claimed despite 30 exhausted older groups');
reset role;

-- ---------------------------------------------------------------- admins can see failed emails
set role authenticated;
select tests.as_user(tests.id('admin'));
select ok(exists (select 1 from public.notifications where recipient_id <> tests.id('admin')), 'admin can read others'' notifications');
reset role;

select * from finish();
