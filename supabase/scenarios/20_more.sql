-- More scenario coverage. Runs after 10_scenarios.sql on the same database.
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

select id as project_id from public.projects where name = 'Website' \gset

-- ---------------------------------------------------------------- invitations
set role authenticated;
select pg_temp.as_user(:admin);
select public.create_invitation('cara@example.com', 'Cara', 'freelancer', 'hash-f3') as inv3 \gset
select public.renew_invitation(:'inv3', 'hash-f3-b');
reset role;
select pg_temp.check('renew bumps send_count', (select send_count = 2 and token_hash = 'hash-f3-b' from public.invitations where id = :'inv3'));
insert into auth.users (id, email) values (:f3, 'CARA@example.com');
select pg_temp.check('accept is case-insensitive', exists (select 1 from public.profiles where id = :f3));
set role authenticated;
select pg_temp.as_user(:admin);
select pg_temp.expect_error(format($$select public.revoke_invitation(%L)$$, :'inv3'), 'invitation_not_pending');
select public.add_project_member(:'project_id', :f3);

-- ---------------------------------------------------------------- one email per action
select pg_temp.as_user(:f3);
select public.create_task(:'project_id', 'Hero section') as a1 \gset
select public.create_task(:'project_id', 'Footer') as a2 \gset
select public.set_task_estimate(:'a1', 60, 120);
select public.set_task_estimate(:'a2', 30, 60);
select pg_temp.expect_error(format($$select public.submit_proposal(%L, array[%L]::uuid[])$$, :'project_id', '00000000-0000-0000-0000-000000000000'), 'task_not_found');
select public.submit_proposal(:'project_id', array[:'a1', :'a2']::uuid[]) as pp \gset
select pg_temp.as_user(:admin);
select pg_temp.check('approval queue shows the proposal with 2 items', exists (select 1 from public.approval_queue where item_id = :'pp' and item_count = 2 and max_minutes = 180));
select public.approve_all_remaining(:'pp');
reset role;
select pg_temp.check('approve all: 2 notifications, one action', (select count(*) = 2 and count(distinct txid) = 1 from public.notifications where recipient_id = :f3 and type = 'estimate.decided'));

-- ---------------------------------------------------------------- timer edits, discard, delete
set role authenticated;
select pg_temp.as_user(:f3);
select public.start_timer(:'a1') as tm \gset
select public.discard_timer();
select pg_temp.check('discard leaves no entry', not exists (select 1 from public.time_entries where timer_id = :'tm'));
select public.start_timer(:'a1') as tm2 \gset
reset role;
update public.timers set started_at = now() - interval '90 minutes' where id = :'tm2';
set role authenticated;
select pg_temp.as_user(:f3);
select pg_temp.expect_error($$select public.stop_timer(now() - interval '2 hours', now(), 'x')$$, 'timer_range_invalid');
select public.stop_timer((select started_at from public.timers where id = :'tm2') + interval '10 minutes', now(), 'Built hero');
select id as te from public.time_entries where timer_id = :'tm2' \gset
select pg_temp.check('shortened timer saved 80 min', (select duration_minutes = 80 and source = 'timer' from public.time_entries where id = :'te'));
select public.update_time_entry(:'te', 'Built hero, fixed spacing',
  p_started_at => (select started_at from public.time_entries where id = :'te'),
  p_ended_at   => (select started_at from public.time_entries where id = :'te') + interval '45 minutes');
select pg_temp.check('timed entry edited to 45 min, still timed', (select duration_minutes = 45 and source = 'timer' from public.time_entries where id = :'te'));
select public.add_time_entry(:'a1', app.org_today(), 15, 'Review') as te2 \gset
select public.delete_time_entry(:'te2');
reset role;
select pg_temp.check('delete recorded in history', exists (select 1 from public.audit_events where event_type = 'time_entry.deleted' and entity_id = :'te2'));
select pg_temp.check('a1 counted 45', (select counted_minutes = 45 from public.tasks where id = :'a1'));

-- ---------------------------------------------------------------- comments, links
set role authenticated;
select pg_temp.as_user(:f3);
select public.add_comment(:'a1', 'Hero copy needs sign-off') as c1 \gset
select public.add_task_link(:'a1', 'https://figma.com/file/abc', 'Figma') as l1 \gset
select pg_temp.expect_error(format($$select public.add_task_link(%L, 'javascript:alert(1)')$$, :'a1'), 'new row for relation "task_links" violates check constraint "task_links_url_check"');
select public.edit_comment(:'c1', 'Hero copy needs sign-off from Olifant');
select pg_temp.as_user(:admin);
select pg_temp.expect_error(format($$select public.edit_comment(%L, 'x')$$, :'c1'), 'not_authorized');
select public.add_comment(:'a1', 'Signed off');
reset role;
select pg_temp.check('assignee notified of admin comment', exists (select 1 from public.notifications where recipient_id = :f3 and type = 'comment.created'));
select pg_temp.check('admin notified of assignee comment', exists (select 1 from public.notifications where recipient_id = :admin and type = 'comment.created'));

-- ---------------------------------------------------------------- done, return, accept
set role authenticated;
select pg_temp.as_user(:f3);
select public.start_timer(:'a1') is not null;
select pg_temp.expect_error(format($$select public.mark_task_done(%L)$$, :'a1'), 'timer_running_on_task');
select public.discard_timer();
select public.mark_task_done(:'a1', 'Ready');
select pg_temp.as_user(:admin);
select pg_temp.expect_error(format($$select public.return_task(%L, '')$$, :'a1'), 'comment_required');
select public.return_task(:'a1', 'Mobile spacing is off');
select pg_temp.as_user(:f3);
select public.mark_task_done(:'a1');
select pg_temp.as_user(:admin);
select public.accept_task(:'a1');
reset role;
select pg_temp.check('a1 accepted', (select status = 'accepted' from public.tasks where id = :'a1'));

-- ---------------------------------------------------------------- cancel, withdraw, delete
set role authenticated;
select pg_temp.as_user(:f3);
select public.create_task(:'project_id', 'Scrap me') as a3 \gset
select public.delete_task(:'a3');
select public.create_task(:'project_id', 'Withdraw me') as a4 \gset
select public.set_task_estimate(:'a4', 15, 30);
select public.submit_proposal(:'project_id', array[:'a4']::uuid[]) is not null;
select public.withdraw_estimates(array(select id from public.estimate_revisions where task_id = :'a4'));
select pg_temp.expect_error(format($$select public.delete_task(%L)$$, :'a4'), 'task_was_submitted');
select pg_temp.as_user(:admin);
select public.cancel_task(:'a4', 'No longer needed');
reset role;
select pg_temp.check('a4 cancelled with decision comment', (select status = 'cancelled' from public.tasks where id = :'a4') and exists (select 1 from public.task_comments where task_id = :'a4' and kind = 'decision'));

-- ---------------------------------------------------------------- tolerance change recounts
set role authenticated;
select pg_temp.as_user(:admin);
select public.update_settings('Olifant Digital', 'Europe/Budapest', 0, 'EUR');
reset role;
select pg_temp.check('tolerance 0: Pricing page counts exactly its 540 limit', (select counted_minutes = 540 and over_limit_minutes = counted_minutes + over_limit_minutes - 540 from public.tasks where title = 'Pricing page'));
set role authenticated;
select pg_temp.as_user(:admin);
select pg_temp.expect_error($$select public.update_settings('Olifant Digital', 'Mars/Olympus', 10, 'EUR')$$, 'invalid_time_zone');
select public.update_settings('Olifant Digital', 'Europe/Budapest', 10, 'EUR');

-- ---------------------------------------------------------------- project hold, members, archive
select id as t1 from public.tasks where title = 'Pricing page' \gset
select pg_temp.as_user(:f1);
select public.start_timer(:'t1') is not null;
select pg_temp.as_user(:admin);
select public.set_project_status(:'project_id', 'on_hold');
reset role;
select pg_temp.check('project hold stopped f1 timer', not exists (select 1 from public.timers where user_id = :f1 and stopped_at is null));
select pg_temp.check('members told about hold by email', (select count(*) from public.notifications where type = 'project.status_changed' and email_status = 'pending') >= 2);
set role authenticated;
select pg_temp.as_user(:f1);
select pg_temp.expect_error(format($$select public.start_timer(%L)$$, :'t1'), 'project_not_active');
select pg_temp.as_user(:admin);
select pg_temp.expect_error(format($$select public.remove_project_member(%L, %L)$$, :'project_id', :f1), 'member_has_open_tasks');
select pg_temp.expect_error(format($$select public.set_project_status(%L, 'archived')$$, :'project_id'), 'project_has_open_tasks');
select public.set_project_status(:'project_id', 'active');

-- ---------------------------------------------------------------- people and rates
select public.add_rate(:f1, 45, 'EUR', app.org_today() + 30) as future_rate \gset
select public.delete_rate(:'future_rate');
select pg_temp.expect_error(format($$select public.delete_rate((select id from public.rates where user_id = %L limit 1))$$, :f1), 'rate_not_deletable');
select public.set_person_role(:f3, 'admin');
select public.set_person_role(:admin, 'freelancer');
select pg_temp.as_user(:f3);
select pg_temp.expect_error(format($$select public.set_person_role(%L, 'freelancer')$$, :f3), 'last_admin');
select public.set_person_role(:admin, 'admin');
reset role;
select pg_temp.check('history recorded role changes', (select count(*) from public.audit_events where event_type = 'person.role_changed') = 3);

select 'more finished';
