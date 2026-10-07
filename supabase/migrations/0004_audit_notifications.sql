-- 0004_audit_notifications.sql
-- Append-only history, notifications fanned out from it, and the email outbox.

-- ---------------------------------------------------------------------------
-- audit_events: every meaningful action (PRD §5.8, §6.13)
-- Ids are sequential: events are ordered, never exposed in URLs, and this is
-- the largest table. Referenced ids are plain columns (no foreign keys), so a
-- deleted draft task cannot be blocked by, or alter, its history.
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id              bigint      generated always as identity primary key,
  occurred_at     timestamptz not null default now(),
  txid            bigint      not null default (pg_current_xact_id()::text::bigint),
  actor_id        uuid        references public.profiles (id),   -- null = system
  event_type      text        not null,
  project_id      uuid,
  task_id         uuid,
  subject_user_id uuid,       -- the freelancer the event is about
  entity_id       uuid,
  data            jsonb       not null default '{}'::jsonb
);

create index audit_events_occurred_idx on public.audit_events (occurred_at desc);
create index audit_events_task_idx on public.audit_events (task_id, occurred_at) where task_id is not null;
create index audit_events_project_idx on public.audit_events (project_id, occurred_at desc) where project_id is not null;
create index audit_events_actor_idx on public.audit_events (actor_id, occurred_at desc);
create index audit_events_subject_idx on public.audit_events (subject_user_id, occurred_at desc);
create index audit_events_type_idx on public.audit_events (event_type, occurred_at desc);

create or replace function app.tg_audit_events_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_events_are_append_only' using errcode = 'check_violation';
end;
$$;

create trigger audit_events_no_update_delete
  before update or delete on public.audit_events
  for each row execute function app.tg_audit_events_immutable();

create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function app.tg_audit_events_immutable();

create or replace function app.log_event(
  p_event_type      text,
  p_task_id         uuid,
  p_project_id      uuid,
  p_subject_user_id uuid,
  p_entity_id       uuid,
  p_data            jsonb default '{}'::jsonb,
  p_as_system       boolean default false     -- true: no actor, so nobody is skipped
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into public.audit_events
    (actor_id, event_type, project_id, task_id, subject_user_id, entity_id, data)
  values
    (case when p_as_system then null else (select auth.uid()) end,
     p_event_type, p_project_id, p_task_id, p_subject_user_id,
     p_entity_id, coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- notifications: in-app list plus the email outbox (PRD §6.12)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id               uuid        primary key default gen_random_uuid(),
  recipient_id     uuid        not null references public.profiles (id),
  event_id         bigint      not null references public.audit_events (id),
  type             text        not null,
  task_id          uuid,
  project_id       uuid,
  txid             bigint      not null,      -- one email per recipient per action
  data             jsonb       not null default '{}'::jsonb,  -- recipient-safe copy of the event data
  read_at          timestamptz,
  email_status     text        not null default 'none'
                     check (email_status in ('none', 'pending', 'sending', 'sent', 'failed')),
  email_attempts   integer     not null default 0,
  email_claimed_at timestamptz,
  email_sent_at    timestamptz,
  email_last_error text,
  created_at       timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;
create index notifications_outbox_idx on public.notifications (created_at)
  where email_status in ('pending', 'sending', 'failed');
create index notifications_event_idx on public.notifications (event_id);

create or replace function app.notify_user(
  p_recipient uuid,
  p_event     public.audit_events,
  p_email     boolean
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications
    (recipient_id, event_id, type, task_id, project_id, txid, data, email_status)
  select p.id, p_event.id, p_event.event_type, p_event.task_id, p_event.project_id, p_event.txid,
         p_event.data - 'freelancer_ids' - 'previous_assignee_id',   -- never about other freelancers
         case when p_email then 'pending' else 'none' end
    from public.profiles p
   where p.id = p_recipient
     and p.status = 'active'
     and p.id is distinct from p_event.actor_id;   -- never notify the author
$$;

create or replace function app.notify_admins(p_event public.audit_events, p_email boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.notify_user(p.id, p_event, p_email)
     from public.profiles p
    where p.role = 'admin' and p.status = 'active';
end;
$$;

-- The PRD §6.12 table, translated: who hears about which event.
create or replace function app.tg_audit_fanout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case new.event_type
    when 'proposal.submitted', 'extra_hours.requested', 'task.done' then
      perform app.notify_admins(new, true);

    when 'estimate.decided', 'extra_hours.decided', 'task.accepted', 'task.returned',
         'task.held', 'task.resumed', 'task.cancelled' then
      perform app.notify_user(new.subject_user_id, new, true);

    when 'task.assigned', 'task.unassigned' then
      perform app.notify_user(new.subject_user_id, new, true);

    when 'project.status_changed' then
      if 'on_hold' in (new.data ->> 'from', new.data ->> 'to') then
        perform app.notify_user(m.user_id, new, true)
           from public.project_members m
          where m.project_id = new.project_id;
      end if;

    when 'timer.auto_stopped' then
      perform app.notify_user(new.subject_user_id, new, false);

    when 'task.limit_reached', 'task.over_limit' then
      perform app.notify_user(new.subject_user_id, new, false);
      perform app.notify_admins(new, false);

    when 'comment.created' then
      perform app.notify_user(new.subject_user_id, new, false);
      perform app.notify_user(a.id, new, false)
         from public.profiles a
        where a.role = 'admin' and a.status = 'active'
          and a.id is distinct from new.subject_user_id;

    when 'month.closed' then
      perform app.notify_user(f.id::uuid, new, true)
         from jsonb_array_elements_text(new.data -> 'freelancer_ids') as f(id);

    when 'month.reopened' then
      perform app.notify_user(f.id::uuid, new, false)
         from jsonb_array_elements_text(new.data -> 'freelancer_ids') as f(id);

    else
      null;
  end case;

  return null;
end;
$$;

create trigger audit_events_fanout
  after insert on public.audit_events
  for each row execute function app.tg_audit_fanout();

-- ---------------------------------------------------------------------------
-- Email outbox, used only by the dispatcher with the secret key.
-- claim: lock up to p_limit (recipient, action) groups that are due, mark them
-- 'sending', and return their notifications. 'sending' older than ten minutes
-- counts as abandoned and is claimable again. Five attempts at most.
-- ---------------------------------------------------------------------------
create or replace function public.claim_email_batch(p_limit integer default 20)
returns setof public.notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due_groups as (
    select g.recipient_id, g.txid
      from public.notifications g
     where (g.email_status in ('pending', 'failed')
            or (g.email_status = 'sending' and g.email_claimed_at < now() - interval '10 minutes'))
       and g.email_attempts < 5
     group by g.recipient_id, g.txid
     order by min(g.created_at)
     limit p_limit
  ),
  due as (
    select n.id
      from public.notifications n
      join due_groups d on d.recipient_id = n.recipient_id and d.txid = n.txid
     where (n.email_status in ('pending', 'failed')
            or (n.email_status = 'sending' and n.email_claimed_at < now() - interval '10 minutes'))
       and n.email_attempts < 5
       for update of n skip locked
  )
  update public.notifications n
     set email_status = 'sending',
         email_claimed_at = now(),
         email_attempts = n.email_attempts + 1
    from due
   where n.id = due.id
  returning n.*;
end;
$$;

create or replace function public.complete_email_batch(
  p_ids   uuid[],
  p_sent  boolean,
  p_error text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set email_status = case when p_sent then 'sent' else 'failed' end,
         email_sent_at = case when p_sent then now() else null end,
         email_last_error = case when p_sent then null else left(p_error, 1000) end
   where id = any(p_ids)
     and email_status = 'sending';
$$;
