-- Invitations, one email per action, timer edits, comments and links, done and accept,
-- cancel and withdraw, tolerance, project status, people and rates. Runs after
-- 10_scenarios.test.sql on the same data.
select no_plan();

select tests.keep('admin', 'a0000000-0000-0000-0000-000000000001');
select tests.keep('f1', 'f1000000-0000-0000-0000-000000000001');
select tests.keep('f3', 'f3000000-0000-0000-0000-000000000003');
select tests.keep('project', (select id from public.projects where name = 'Website'));

-- ---------------------------------------------------------------- invitations
set role authenticated;
select tests.as_user(tests.id('admin'));
select tests.keep('inv3', public.create_invitation('cara@example.com', 'Cara', 'freelancer', 'hash-f3'));
select public.renew_invitation(tests.id('inv3'), 'hash-f3-b');
reset role;
select ok((select send_count = 2 and token_hash = 'hash-f3-b' from public.invitations where id = tests.id('inv3')), 'renew bumps send_count');
insert into auth.users (id, email) values (tests.id('f3'), 'CARA@example.com');
select ok(exists (select 1 from public.profiles where id = tests.id('f3')), 'accept is case-insensitive');
set role authenticated;
select tests.as_user(tests.id('admin'));
select tests.fails(format($$select public.revoke_invitation(%L)$$, tests.id('inv3')), 'invitation_not_pending');
select public.add_project_member(tests.id('project'), tests.id('f3'));

-- ---------------------------------------------------------------- one email per action
select tests.as_user(tests.id('f3'));
select tests.keep('a1', public.create_task(tests.id('project'), 'Hero section'));
select tests.keep('a2', public.create_task(tests.id('project'), 'Footer'));
select public.set_task_estimate(tests.id('a1'), 60, 120);
select public.set_task_estimate(tests.id('a2'), 30, 60);
select tests.fails(format($$select public.submit_proposal(%L, array[%L]::uuid[])$$, tests.id('project'), '00000000-0000-0000-0000-000000000000'), 'task_not_found');
select tests.keep('pp', public.submit_proposal(tests.id('project'), array[tests.id('a1'), tests.id('a2')]));
select tests.as_user(tests.id('admin'));
select ok(exists (select 1 from public.approval_queue where item_id = tests.id('pp') and item_count = 2 and max_minutes = 180), 'approval queue shows the proposal with 2 items');
select public.approve_all_remaining(tests.id('pp'));
reset role;
select ok((select count(*) = 2 and count(distinct txid) = 1 from public.notifications where recipient_id = tests.id('f3') and type = 'estimate.decided'), 'approve all: 2 notifications, one action');

-- ---------------------------------------------------------------- timer edits, discard, delete
set role authenticated;
select tests.as_user(tests.id('f3'));
select tests.keep('tm', public.start_timer(tests.id('a1')));
select public.discard_timer();
select ok(not exists (select 1 from public.time_entries where timer_id = tests.id('tm')), 'discard leaves no entry');
select tests.keep('tm2', public.start_timer(tests.id('a1')));
reset role;
update public.timers set started_at = now() - interval '90 minutes' where id = tests.id('tm2');
set role authenticated;
select tests.as_user(tests.id('f3'));
select tests.fails($$select public.stop_timer(now() - interval '2 hours', now(), 'x')$$, 'timer_range_invalid');
select public.stop_timer((select started_at from public.timers where id = tests.id('tm2')) + interval '10 minutes', now(), 'Built hero');
select tests.keep('te', (select id from public.time_entries where timer_id = tests.id('tm2')));
select ok((select duration_minutes = 80 and source = 'timer' from public.time_entries where id = tests.id('te')), 'shortened timer saved 80 min');
select public.update_time_entry(tests.id('te'), 'Built hero, fixed spacing',
  p_started_at => (select started_at from public.time_entries where id = tests.id('te')),
  p_ended_at   => (select started_at from public.time_entries where id = tests.id('te')) + interval '45 minutes');
select ok((select duration_minutes = 45 and source = 'timer' from public.time_entries where id = tests.id('te')), 'timed entry edited to 45 min, still timed');
select tests.keep('te2', public.add_time_entry(tests.id('a1'), app.org_today(), 15, 'Review'));
select public.delete_time_entry(tests.id('te2'));
reset role;
select ok(exists (select 1 from public.audit_events where event_type = 'time_entry.deleted' and entity_id = tests.id('te2')), 'delete recorded in history');
select ok((select counted_minutes = 45 from public.tasks where id = tests.id('a1')), 'a1 counted 45');

-- ---------------------------------------------------------------- comments, links
set role authenticated;
select tests.as_user(tests.id('f3'));
select tests.keep('c1', public.add_comment(tests.id('a1'), 'Hero copy needs sign-off'));
select public.add_task_link(tests.id('a1'), 'https://figma.com/file/abc', 'Figma') is not null;
select tests.fails(format($$select public.add_task_link(%L, 'javascript:alert(1)')$$, tests.id('a1')), 'new row for relation "task_links" violates check constraint "task_links_url_check"');
select public.edit_comment(tests.id('c1'), 'Hero copy needs sign-off from Olifant');
select tests.as_user(tests.id('admin'));
select tests.fails(format($$select public.edit_comment(%L, 'x')$$, tests.id('c1')), 'not_authorized');
select public.add_comment(tests.id('a1'), 'Signed off') is not null;
reset role;
select ok(exists (select 1 from public.notifications where recipient_id = tests.id('f3') and type = 'comment.created'), 'assignee notified of admin comment');
select ok(exists (select 1 from public.notifications where recipient_id = tests.id('admin') and type = 'comment.created'), 'admin notified of assignee comment');

-- ---------------------------------------------------------------- done, return, accept
set role authenticated;
select tests.as_user(tests.id('f3'));
select public.start_timer(tests.id('a1')) is not null;
select tests.fails(format($$select public.mark_task_done(%L)$$, tests.id('a1')), 'timer_running_on_task');
select public.discard_timer();
select public.mark_task_done(tests.id('a1'), 'Ready');
select tests.as_user(tests.id('admin'));
select tests.fails(format($$select public.return_task(%L, '')$$, tests.id('a1')), 'comment_required');
select public.return_task(tests.id('a1'), 'Mobile spacing is off');
select tests.as_user(tests.id('f3'));
select public.mark_task_done(tests.id('a1'));
select tests.as_user(tests.id('admin'));
select public.accept_task(tests.id('a1'));
reset role;
select ok((select status = 'accepted' from public.tasks where id = tests.id('a1')), 'a1 accepted');

-- ---------------------------------------------------------------- cancel, withdraw, delete
set role authenticated;
select tests.as_user(tests.id('f3'));
select tests.keep('a3', public.create_task(tests.id('project'), 'Scrap me'));
select public.delete_task(tests.id('a3'));
select tests.keep('a4', public.create_task(tests.id('project'), 'Withdraw me'));
select public.set_task_estimate(tests.id('a4'), 15, 30);
select public.submit_proposal(tests.id('project'), array[tests.id('a4')]) is not null;
select public.withdraw_estimates(array(select id from public.estimate_revisions where task_id = tests.id('a4')));
select tests.fails(format($$select public.delete_task(%L)$$, tests.id('a4')), 'task_was_submitted');
select tests.as_user(tests.id('admin'));
select public.cancel_task(tests.id('a4'), 'No longer needed');
reset role;
select ok((select status = 'cancelled' from public.tasks where id = tests.id('a4')) and exists (select 1 from public.task_comments where task_id = tests.id('a4') and kind = 'decision'), 'a4 cancelled with decision comment');

-- ---------------------------------------------------------------- tolerance change recounts
set role authenticated;
select tests.as_user(tests.id('admin'));
select public.update_settings('Olifant Digital', 'Europe/Budapest', 0, 'EUR');
reset role;
select ok((select counted_minutes = 540 and over_limit_minutes = counted_minutes + over_limit_minutes - 540 from public.tasks where title = 'Pricing page'), 'tolerance 0: Pricing page counts exactly its 540 limit');
set role authenticated;
select tests.as_user(tests.id('admin'));
select tests.fails($$select public.update_settings('Olifant Digital', 'Mars/Olympus', 10, 'EUR')$$, 'invalid_time_zone');
select public.update_settings('Olifant Digital', 'Europe/Budapest', 10, 'EUR');

-- ---------------------------------------------------------------- project hold, members, archive
select tests.keep('t1', (select id from public.tasks where title = 'Pricing page'));
select tests.as_user(tests.id('f1'));
select public.start_timer(tests.id('t1')) is not null;
select tests.as_user(tests.id('admin'));
select public.set_project_status(tests.id('project'), 'on_hold');
reset role;
select ok(not exists (select 1 from public.timers where user_id = tests.id('f1') and stopped_at is null), 'project hold stopped f1 timer');
select ok((select count(*) from public.notifications where type = 'project.status_changed' and email_status = 'pending') >= 2, 'members told about hold by email');
set role authenticated;
select tests.as_user(tests.id('f1'));
select tests.fails(format($$select public.start_timer(%L)$$, tests.id('t1')), 'project_not_active');
select tests.as_user(tests.id('admin'));
select tests.fails(format($$select public.remove_project_member(%L, %L)$$, tests.id('project'), tests.id('f1')), 'member_has_open_tasks');
select tests.fails(format($$select public.set_project_status(%L, 'archived')$$, tests.id('project')), 'project_has_open_tasks');
select public.set_project_status(tests.id('project'), 'active');

-- ---------------------------------------------------------------- people and rates
select tests.keep('future_rate', public.add_rate(tests.id('f1'), 45, 'EUR', app.org_today() + 30));
select public.delete_rate(tests.id('future_rate'));
select tests.fails(format($$select public.delete_rate((select id from public.rates where user_id = %L limit 1))$$, tests.id('f1')), 'rate_not_deletable');
select public.set_person_role(tests.id('f3'), 'admin');
select public.set_person_role(tests.id('admin'), 'freelancer');
select tests.as_user(tests.id('f3'));
select tests.fails(format($$select public.set_person_role(%L, 'freelancer')$$, tests.id('f3')), 'last_admin');
select public.set_person_role(tests.id('admin'), 'admin');
reset role;
select ok((select count(*) from public.audit_events where event_type = 'person.role_changed') = 3, 'history recorded role changes');

select * from finish();
