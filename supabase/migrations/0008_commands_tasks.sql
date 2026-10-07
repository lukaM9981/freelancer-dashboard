-- 0008_commands_tasks.sql
-- Tasks, proposals, decisions, extra hours, completion, comments, and links.

-- ---------------------------------------------------------------------------
-- Creating and editing tasks (PRD §6.4)
-- ---------------------------------------------------------------------------
create or replace function public.create_task(
  p_project_id  uuid,
  p_title       text,
  p_description text default '',
  p_assignee_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor    uuid := app.require_active();
  v_project  public.projects := app.require_project_not_archived(p_project_id);
  v_assignee uuid;
  v_id       uuid;
begin
  if app.is_admin() then
    v_assignee := p_assignee_id;
  else
    -- freelancers create tasks for themselves, in projects they belong to
    if not app.is_member(p_project_id, v_actor) then
      raise exception 'not_project_member' using errcode = '42501';
    end if;
    v_assignee := v_actor;
  end if;

  if v_assignee is not null and not app.is_member(p_project_id, v_assignee) then
    raise exception 'assignee_not_member' using errcode = 'check_violation';
  end if;

  insert into public.tasks (project_id, title, description, assignee_id, created_by)
  values (p_project_id, btrim(p_title), coalesce(p_description, ''), v_assignee, v_actor)
  returning id into v_id;

  perform app.log_event('task.created', v_id, p_project_id, v_assignee, v_id,
    jsonb_build_object('title', btrim(p_title)));

  if v_assignee is not null and v_assignee <> v_actor then
    perform app.log_event('task.assigned', v_id, p_project_id, v_assignee, v_id,
      jsonb_build_object('title', btrim(p_title)));
  end if;

  return v_id;
end;
$$;

create or replace function public.update_task(p_task_id uuid, p_title text, p_description text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  if app.is_admin() and v_task.assignee_id is distinct from v_actor then
    perform app.require_task_status(v_task, 'draft', 'pending_approval', 'changes_requested',
      'approved', 'in_progress', 'on_hold', 'done');
  else
    perform app.require_assignee(v_task, v_actor);
    perform app.require_task_status(v_task, 'draft', 'changes_requested');
  end if;

  update public.tasks
     set title = btrim(p_title), description = coalesce(p_description, '')
   where id = p_task_id;

  if v_task.ever_submitted then
    perform app.log_event('task.updated', p_task_id, v_task.project_id, v_task.assignee_id, p_task_id,
      jsonb_build_object(
        'from', jsonb_build_object('title', v_task.title, 'description', v_task.description),
        'to',   jsonb_build_object('title', btrim(p_title), 'description', p_description)));
  end if;
end;
$$;

create or replace function public.set_task_estimate(
  p_task_id     uuid,
  p_min_minutes integer,
  p_max_minutes integer,
  p_note        text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  perform app.require_assignee(v_task, v_actor);
  perform app.require_task_status(v_task, 'draft', 'changes_requested');

  update public.tasks
     set estimate_min_minutes = p_min_minutes,
         estimate_max_minutes = p_max_minutes,
         estimate_note = nullif(btrim(p_note), '')
   where id = p_task_id;

  if v_task.ever_submitted then
    perform app.log_event('task.estimate_changed', p_task_id, v_task.project_id, v_actor, p_task_id,
      jsonb_build_object(
        'from', jsonb_build_object('min_minutes', v_task.estimate_min_minutes,
                                   'max_minutes', v_task.estimate_max_minutes),
        'to',   jsonb_build_object('min_minutes', p_min_minutes, 'max_minutes', p_max_minutes)));
  end if;
end;
$$;

-- Reassigning is allowed only before any time exists, and always returns the
-- task to Draft for a fresh estimate (PRD §6.4, rule 12).
create or replace function public.assign_task(p_task_id uuid, p_assignee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  perform app.require_task_status(v_task, 'draft', 'pending_approval', 'changes_requested',
    'approved', 'in_progress', 'on_hold');
  if v_task.assignee_id is not distinct from p_assignee_id then
    return;
  end if;
  if exists (select 1 from public.time_entries where task_id = p_task_id)
     or exists (select 1 from public.timers where task_id = p_task_id and stopped_at is null) then
    raise exception 'task_has_time' using errcode = 'check_violation';
  end if;
  if p_assignee_id is not null and not app.is_member(v_task.project_id, p_assignee_id) then
    raise exception 'assignee_not_member' using errcode = 'check_violation';
  end if;

  update public.estimate_revisions
     set decision = 'withdrawn', decided_by = v_actor, decided_at = now()
   where task_id = p_task_id and decision = 'pending';
  update public.extra_hours_requests
     set status = 'cancelled', decided_by = v_actor, decided_at = now()
   where task_id = p_task_id and status = 'pending';

  update public.tasks
     set assignee_id = p_assignee_id,
         status = 'draft',
         estimate_min_minutes = null,
         estimate_max_minutes = null,
         estimate_note = null,
         approved_revision_id = null,
         limit_minutes = null,
         first_approved_at = null,
         first_approved_on = null
   where id = p_task_id;

  update public.proposals p
     set completed_at = now()
   where p.completed_at is null
     and p.id in (select r.proposal_id from public.estimate_revisions r where r.task_id = p_task_id)
     and not exists (select 1 from public.estimate_revisions r
                      where r.proposal_id = p.id and r.decision = 'pending');

  -- Two events, so neither freelancer ever sees the other: the new assignee's
  -- task history shows only 'task.assigned'; 'task.unassigned' has no task_id
  -- (only Admins see it in the full log) and tells the previous assignee.
  if p_assignee_id is not null then
    perform app.log_event('task.assigned', p_task_id, v_task.project_id, p_assignee_id, p_task_id,
      jsonb_build_object('title', v_task.title));
  end if;
  if v_task.assignee_id is not null then
    perform app.log_event('task.unassigned', null, v_task.project_id, v_task.assignee_id, p_task_id,
      jsonb_build_object('title', v_task.title, 'previous_status', v_task.status));
  end if;
end;
$$;

create or replace function public.delete_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  if not app.is_admin() and v_task.created_by <> v_actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_task.ever_submitted then
    raise exception 'task_was_submitted' using errcode = 'check_violation';
  end if;

  delete from public.tasks where id = p_task_id;
  perform app.log_event('task.deleted', p_task_id, v_task.project_id, v_task.assignee_id, p_task_id,
    jsonb_build_object('title', v_task.title));
end;
$$;

-- ---------------------------------------------------------------------------
-- Proposals and decisions (PRD §5.3, §6.5)
-- ---------------------------------------------------------------------------
create or replace function public.submit_proposal(p_project_id uuid, p_task_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor    uuid := app.require_active();
  v_project  public.projects := app.require_project_not_archived(p_project_id);
  v_proposal uuid;
  v_task     public.tasks;
  v_task_id  uuid;
  v_min      integer := 0;
  v_max      integer := 0;
begin
  if coalesce(cardinality(p_task_ids), 0) = 0 then
    raise exception 'no_tasks' using errcode = 'check_violation';
  end if;

  insert into public.proposals (project_id, submitted_by)
  values (p_project_id, v_actor)
  returning id into v_proposal;

  foreach v_task_id in array p_task_ids loop
    v_task := app.lock_task(v_task_id);
    if v_task.project_id <> p_project_id then
      raise exception 'task_not_in_project' using errcode = 'check_violation';
    end if;
    perform app.require_assignee(v_task, v_actor);
    perform app.require_task_status(v_task, 'draft', 'changes_requested');
    if v_task.estimate_min_minutes is null or v_task.estimate_max_minutes is null then
      raise exception 'estimate_incomplete' using errcode = 'check_violation';
    end if;

    insert into public.estimate_revisions
      (task_id, proposal_id, revision_number, min_minutes, max_minutes, note, submitted_by)
    values
      (v_task.id, v_proposal,
       coalesce((select max(r.revision_number) from public.estimate_revisions r
                  where r.task_id = v_task.id), 0) + 1,
       v_task.estimate_min_minutes, v_task.estimate_max_minutes, v_task.estimate_note, v_actor);

    update public.tasks
       set status = 'pending_approval', ever_submitted = true
     where id = v_task.id;

    perform app.log_event('estimate.submitted', v_task.id, p_project_id, v_actor, v_proposal,
      jsonb_build_object('min_minutes', v_task.estimate_min_minutes,
                         'max_minutes', v_task.estimate_max_minutes,
                         'note', v_task.estimate_note));

    v_min := v_min + v_task.estimate_min_minutes;
    v_max := v_max + v_task.estimate_max_minutes;
  end loop;

  perform app.log_event('proposal.submitted', null, p_project_id, v_actor, v_proposal,
    jsonb_build_object('task_ids', to_jsonb(p_task_ids), 'item_count', cardinality(p_task_ids),
                       'min_minutes', v_min, 'max_minutes', v_max));
  return v_proposal;
end;
$$;

create or replace function public.withdraw_estimates(p_revision_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_rev   public.estimate_revisions;
  v_task  public.tasks;
begin
  for v_rev in
    select * from public.estimate_revisions where id = any(p_revision_ids) for update
  loop
    if v_rev.submitted_by <> v_actor then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
    if v_rev.decision <> 'pending' then
      raise exception 'revision_already_decided' using errcode = 'check_violation';
    end if;

    v_task := app.lock_task(v_rev.task_id);
    update public.estimate_revisions
       set decision = 'withdrawn', decided_by = v_actor, decided_at = now()
     where id = v_rev.id;
    update public.tasks set status = 'draft' where id = v_task.id;

    perform app.log_event('estimate.withdrawn', v_task.id, v_task.project_id, v_actor, v_rev.id,
      jsonb_build_object('proposal_id', v_rev.proposal_id));
  end loop;

  update public.proposals p
     set completed_at = now()
   where p.completed_at is null
     and p.id in (select r.proposal_id from public.estimate_revisions r where r.id = any(p_revision_ids))
     and not exists (select 1 from public.estimate_revisions r
                      where r.proposal_id = p.id and r.decision = 'pending');
end;
$$;

-- p_decisions: [{"revision_id": "…", "decision": "approved" | "rejected" |
-- "changes_requested", "comment": "…"}]. One call = one action = one email
-- per recipient, however many items it decides.
create or replace function public.decide_estimates(p_decisions jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor     uuid := app.require_admin();
  v_item      jsonb;
  v_decision  text;
  v_comment   text;
  v_rev       public.estimate_revisions;
  v_task      public.tasks;
  v_proposals uuid[] := '{}';
begin
  if jsonb_typeof(p_decisions) <> 'array' or jsonb_array_length(p_decisions) = 0 then
    raise exception 'no_decisions' using errcode = 'check_violation';
  end if;

  for v_item in select value from jsonb_array_elements(p_decisions) loop
    v_decision := v_item ->> 'decision';
    v_comment  := nullif(btrim(v_item ->> 'comment'), '');

    if v_decision is null or v_decision not in ('approved', 'rejected', 'changes_requested') then
      raise exception 'invalid_decision' using errcode = 'check_violation';
    end if;
    if v_decision <> 'approved' and v_comment is null then
      raise exception 'comment_required' using errcode = 'check_violation';
    end if;

    select * into v_rev
      from public.estimate_revisions
     where id = (v_item ->> 'revision_id')::uuid
       for update;
    if not found then
      raise exception 'revision_not_found' using errcode = 'P0002';
    end if;
    if v_rev.decision <> 'pending' then
      raise exception 'revision_already_decided' using errcode = 'check_violation';
    end if;
    if v_rev.submitted_by = v_actor then
      raise exception 'self_approval_not_allowed' using errcode = '42501';
    end if;

    v_task := app.lock_task(v_rev.task_id);

    update public.estimate_revisions
       set decision = v_decision, decided_by = v_actor, decided_at = now(),
           decision_comment = v_comment
     where id = v_rev.id;

    if v_decision = 'approved' then
      update public.tasks
         set status = 'approved',
             approved_revision_id = v_rev.id,
             limit_minutes = v_rev.max_minutes,
             first_approved_at = coalesce(first_approved_at, now()),
             first_approved_on = coalesce(first_approved_on, app.org_today())
       where id = v_task.id;
    else
      update public.tasks set status = v_decision where id = v_task.id;
    end if;

    if v_comment is not null then
      insert into public.task_comments (task_id, author_id, kind, body)
      values (v_task.id, v_actor, 'decision', v_comment);
    end if;

    perform app.log_event('estimate.decided', v_task.id, v_task.project_id, v_rev.submitted_by, v_rev.id,
      jsonb_build_object('decision', v_decision, 'comment', v_comment,
                         'min_minutes', v_rev.min_minutes, 'max_minutes', v_rev.max_minutes,
                         'proposal_id', v_rev.proposal_id));

    v_proposals := array_append(v_proposals, v_rev.proposal_id);
  end loop;

  update public.proposals p
     set completed_at = now()
   where p.id = any(v_proposals)
     and p.completed_at is null
     and not exists (select 1 from public.estimate_revisions r
                      where r.proposal_id = p.id and r.decision = 'pending');
end;
$$;

create or replace function public.approve_all_remaining(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_decisions jsonb;
begin
  perform app.require_admin();

  select jsonb_agg(jsonb_build_object('revision_id', r.id, 'decision', 'approved'))
    into v_decisions
    from public.estimate_revisions r
   where r.proposal_id = p_proposal_id and r.decision = 'pending';

  if v_decisions is null then
    raise exception 'nothing_pending' using errcode = 'check_violation';
  end if;

  perform public.decide_estimates(v_decisions);
end;
$$;

-- ---------------------------------------------------------------------------
-- Extra hours (PRD §5.4, §6.6)
-- ---------------------------------------------------------------------------
create or replace function public.request_extra_hours(p_task_id uuid, p_minutes integer, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_task  public.tasks := app.lock_task(p_task_id);
  v_id    uuid;
begin
  perform app.require_assignee(v_task, v_actor);
  perform app.require_task_status(v_task, 'approved', 'in_progress', 'on_hold');
  if exists (select 1 from public.extra_hours_requests
              where task_id = p_task_id and status = 'pending') then
    raise exception 'extra_hours_pending' using errcode = 'check_violation';
  end if;

  insert into public.extra_hours_requests (task_id, requested_by, minutes, reason)
  values (p_task_id, v_actor, p_minutes, btrim(p_reason))
  returning id into v_id;

  perform app.log_event('extra_hours.requested', p_task_id, v_task.project_id, v_actor, v_id,
    jsonb_build_object('minutes', p_minutes, 'reason', btrim(p_reason)));
  return v_id;
end;
$$;

create or replace function public.decide_extra_hours(p_request_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := app.require_admin();
  v_request public.extra_hours_requests;
  v_task    public.tasks;
begin
  select * into v_request from public.extra_hours_requests where id = p_request_id for update;
  if not found then
    raise exception 'extra_hours_not_found' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'extra_hours_already_decided' using errcode = 'check_violation';
  end if;
  if v_request.requested_by = v_actor then
    raise exception 'self_approval_not_allowed' using errcode = '42501';
  end if;
  if not p_approve and nullif(btrim(p_reason), '') is null then
    raise exception 'comment_required' using errcode = 'check_violation';
  end if;

  v_task := app.lock_task(v_request.task_id);
  perform app.require_task_status(v_task, 'approved', 'in_progress', 'on_hold', 'done');

  update public.extra_hours_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = v_actor, decided_at = now(),
         decision_reason = nullif(btrim(p_reason), '')
   where id = p_request_id;

  if p_approve then
    update public.tasks set limit_minutes = limit_minutes + v_request.minutes where id = v_task.id;
    perform app.recount_task(v_task.id);
  end if;

  perform app.log_event('extra_hours.decided', v_task.id, v_task.project_id, v_request.requested_by,
    p_request_id, jsonb_build_object('approved', p_approve, 'minutes', v_request.minutes,
                                     'reason', nullif(btrim(p_reason), '')));
end;
$$;

-- ---------------------------------------------------------------------------
-- Holding, resuming, cancelling (PRD §5.1)
-- ---------------------------------------------------------------------------
create or replace function public.hold_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  perform app.require_not_own_task(v_task, v_actor);
  perform app.require_task_status(v_task, 'approved', 'in_progress');
  perform app.auto_stop_timers('task put on hold', p_task_id => p_task_id);
  update public.tasks set status = 'on_hold' where id = p_task_id;
  perform app.log_event('task.held', p_task_id, v_task.project_id, v_task.assignee_id, p_task_id, '{}'::jsonb);
end;
$$;

create or replace function public.resume_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  perform app.require_not_own_task(v_task, v_actor);
  perform app.require_task_status(v_task, 'on_hold');
  update public.tasks
     set status = case when exists (select 1 from public.time_entries where task_id = p_task_id)
                       then 'in_progress' else 'approved' end
   where id = p_task_id;
  perform app.log_event('task.resumed', p_task_id, v_task.project_id, v_task.assignee_id, p_task_id, '{}'::jsonb);
end;
$$;

create or replace function public.cancel_task(p_task_id uuid, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  perform app.require_not_own_task(v_task, v_actor);
  perform app.require_task_status(v_task, 'draft', 'pending_approval', 'changes_requested',
    'approved', 'in_progress', 'on_hold', 'done');

  perform app.auto_stop_timers('task cancelled', p_task_id => p_task_id);

  update public.estimate_revisions
     set decision = 'withdrawn', decided_by = v_actor, decided_at = now()
   where task_id = p_task_id and decision = 'pending';
  update public.extra_hours_requests
     set status = 'cancelled', decided_by = v_actor, decided_at = now()
   where task_id = p_task_id and status = 'pending';

  update public.tasks set status = 'cancelled' where id = p_task_id;

  if nullif(btrim(p_comment), '') is not null then
    insert into public.task_comments (task_id, author_id, kind, body)
    values (p_task_id, v_actor, 'decision', btrim(p_comment));
  end if;

  update public.proposals p
     set completed_at = now()
   where p.completed_at is null
     and p.id in (select r.proposal_id from public.estimate_revisions r where r.task_id = p_task_id)
     and not exists (select 1 from public.estimate_revisions r
                      where r.proposal_id = p.id and r.decision = 'pending');

  perform app.log_event('task.cancelled', p_task_id, v_task.project_id, v_task.assignee_id, p_task_id,
    jsonb_build_object('previous_status', v_task.status, 'comment', nullif(btrim(p_comment), '')));
end;
$$;

-- ---------------------------------------------------------------------------
-- Completion and acceptance (PRD §6.7)
-- ---------------------------------------------------------------------------
create or replace function public.mark_task_done(p_task_id uuid, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  perform app.require_assignee(v_task, v_actor);
  perform app.require_task_status(v_task, 'in_progress');
  if exists (select 1 from public.timers where task_id = p_task_id and stopped_at is null) then
    raise exception 'timer_running_on_task' using errcode = 'check_violation';
  end if;

  update public.tasks set status = 'done' where id = p_task_id;
  if nullif(btrim(p_comment), '') is not null then
    insert into public.task_comments (task_id, author_id, kind, body)
    values (p_task_id, v_actor, 'comment', btrim(p_comment));
  end if;
  perform app.log_event('task.done', p_task_id, v_task.project_id, v_actor, p_task_id,
    jsonb_build_object('comment', nullif(btrim(p_comment), '')));
end;
$$;

create or replace function public.accept_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  perform app.require_not_own_task(v_task, v_actor);
  perform app.require_task_status(v_task, 'done');
  if exists (select 1 from public.extra_hours_requests where task_id = p_task_id and status = 'pending') then
    raise exception 'extra_hours_pending' using errcode = 'check_violation';
  end if;

  update public.tasks set status = 'accepted' where id = p_task_id;
  perform app.log_event('task.accepted', p_task_id, v_task.project_id, v_task.assignee_id, p_task_id, '{}'::jsonb);
end;
$$;

create or replace function public.return_task(p_task_id uuid, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_task  public.tasks := app.lock_task(p_task_id);
begin
  perform app.require_not_own_task(v_task, v_actor);
  perform app.require_task_status(v_task, 'done');
  if nullif(btrim(p_comment), '') is null then
    raise exception 'comment_required' using errcode = 'check_violation';
  end if;

  update public.tasks set status = 'in_progress' where id = p_task_id;
  insert into public.task_comments (task_id, author_id, kind, body)
  values (p_task_id, v_actor, 'decision', btrim(p_comment));
  perform app.log_event('task.returned', p_task_id, v_task.project_id, v_task.assignee_id, p_task_id,
    jsonb_build_object('comment', btrim(p_comment)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Comments and links (PRD §6.9)
-- ---------------------------------------------------------------------------
create or replace function app.require_task_participant(p_task public.tasks, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() and p_task.assignee_id is distinct from p_actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.add_comment(p_task_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_task  public.tasks := app.lock_task(p_task_id);
  v_id    uuid;
begin
  perform app.require_task_participant(v_task, v_actor);

  insert into public.task_comments (task_id, author_id, body)
  values (p_task_id, v_actor, btrim(p_body))
  returning id into v_id;

  perform app.log_event('comment.created', p_task_id, v_task.project_id, v_task.assignee_id, v_id,
    jsonb_build_object('excerpt', left(btrim(p_body), 140)));
  return v_id;
end;
$$;

create or replace function public.edit_comment(p_comment_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := app.require_active();
  v_comment public.task_comments;
begin
  select * into v_comment from public.task_comments where id = p_comment_id for update;
  if not found or v_comment.author_id <> v_actor or v_comment.kind <> 'comment' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  perform app.lock_task(v_comment.task_id);   -- still able to see the task

  update public.task_comments set body = btrim(p_body), edited_at = now() where id = p_comment_id;
  perform app.log_event('comment.updated', v_comment.task_id, null, null, p_comment_id,
    jsonb_build_object('from', v_comment.body, 'to', btrim(p_body)));
end;
$$;

create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := app.require_active();
  v_comment public.task_comments;
begin
  select * into v_comment from public.task_comments where id = p_comment_id for update;
  if not found or v_comment.author_id <> v_actor or v_comment.kind <> 'comment' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  perform app.lock_task(v_comment.task_id);   -- still able to see the task

  delete from public.task_comments where id = p_comment_id;
  perform app.log_event('comment.deleted', v_comment.task_id, null, null, p_comment_id,
    jsonb_build_object('body', v_comment.body));
end;
$$;

create or replace function public.add_task_link(p_task_id uuid, p_url text, p_label text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_task  public.tasks := app.lock_task(p_task_id);
  v_id    uuid;
begin
  perform app.require_task_participant(v_task, v_actor);

  insert into public.task_links (task_id, url, label, created_by)
  values (p_task_id, btrim(p_url), nullif(btrim(p_label), ''), v_actor)
  returning id into v_id;

  perform app.log_event('link.added', p_task_id, v_task.project_id, v_task.assignee_id, v_id,
    jsonb_build_object('url', btrim(p_url), 'label', nullif(btrim(p_label), '')));
  return v_id;
end;
$$;

create or replace function public.remove_task_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_link  public.task_links;
  v_task  public.tasks;
begin
  select * into v_link from public.task_links where id = p_link_id for update;
  if not found then
    raise exception 'link_not_found' using errcode = 'P0002';
  end if;
  v_task := app.lock_task(v_link.task_id);
  perform app.require_task_participant(v_task, v_actor);

  delete from public.task_links where id = p_link_id;
  perform app.log_event('link.removed', v_task.id, v_task.project_id, v_task.assignee_id, p_link_id,
    jsonb_build_object('url', v_link.url));
end;
$$;
