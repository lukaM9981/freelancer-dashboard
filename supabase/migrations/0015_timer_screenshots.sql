-- 0015_timer_screenshots.sql
-- Screen sharing on the timer (PRD §5.5, §6.8). A run is one or more segments.
-- Pausing closes the open segment; the gap is not counted. Screenshots stay
-- after the time is discarded. A freelancer can hide their own screenshot;
-- the file remains for Admins, who are notified.

alter table public.timers
  add column paused_at timestamptz,
  add column share_seen_at timestamptz,
  add constraint timers_pause_state check (
    (stopped_at is null and paused_at is null)
    or (stopped_at is null and paused_at is not null)
    or (stopped_at is not null and paused_at is null)
  );

create table public.timer_segments (
  id         uuid        primary key default gen_random_uuid(),
  timer_id   uuid        not null references public.timers (id) on delete cascade,
  started_at timestamptz not null,
  ended_at   timestamptz,
  constraint timer_segments_order check (ended_at is null or ended_at >= started_at)
);

create unique index timer_segments_one_open on public.timer_segments (timer_id) where ended_at is null;
create index timer_segments_timer_idx on public.timer_segments (timer_id, started_at);

-- A timer that is already running becomes one open segment, so stopping it
-- still behaves as a single range.
insert into public.timer_segments (timer_id, started_at)
select id, started_at from public.timers where stopped_at is null;

update public.timers
   set share_seen_at = started_at
 where stopped_at is null;

create table public.timer_screenshots (
  id           uuid        primary key default gen_random_uuid(),
  timer_id     uuid        not null references public.timers (id) on delete restrict,
  user_id      uuid        not null references public.profiles (id),
  task_id      uuid        not null references public.tasks (id) on delete restrict,
  captured_at  timestamptz not null default now(),
  storage_path text        not null,
  deleted_at   timestamptz,
  deleted_by   uuid        references public.profiles (id),
  created_at   timestamptz not null default now(),
  constraint timer_screenshots_path check (
    storage_path = user_id::text || '/' || id::text || '.jpg'
  ),
  constraint timer_screenshots_deleted check ((deleted_at is null) = (deleted_by is null))
);

create index timer_screenshots_timer_idx on public.timer_screenshots (timer_id, captured_at);
create index timer_screenshots_task_idx on public.timer_screenshots (task_id, captured_at);
create index timer_screenshots_user_idx on public.timer_screenshots (user_id);

-- ---------------------------------------------------------------------------
-- One local-day slice of a segment, the same split app.save_timer already uses.
-- ---------------------------------------------------------------------------
create or replace function app.insert_timer_span(
  p_timer       public.timers,
  p_started_at  timestamptz,
  p_ended_at    timestamptz,
  p_description text,
  p_auto_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz    text := app.org_time_zone();
  v_seg   record;
  v_total integer := 0;
begin
  for v_seg in
    select g.d::date as work_date,
           greatest(p_started_at, g.d at time zone v_tz) as seg_start,
           least(p_ended_at, (g.d + interval '1 day') at time zone v_tz) as seg_end
      from generate_series(
             (p_started_at at time zone v_tz)::date::timestamp,
             (p_ended_at at time zone v_tz)::date::timestamp,
             interval '1 day') as g(d)
  loop
    continue when v_seg.seg_end <= v_seg.seg_start;
    continue when v_seg.seg_end - v_seg.seg_start < interval '1 minute';

    insert into public.time_entries
      (task_id, user_id, work_date, duration_minutes, description, source,
       started_at, ended_at, timer_id, auto_stopped_reason)
    values
      (p_timer.task_id, p_timer.user_id, v_seg.work_date,
       round(extract(epoch from v_seg.seg_end - v_seg.seg_start) / 60)::integer,
       p_description, 'timer', v_seg.seg_start, v_seg.seg_end, p_timer.id, p_auto_reason);

    v_total := v_total + round(extract(epoch from v_seg.seg_end - v_seg.seg_start) / 60)::integer;
  end loop;

  return v_total;
end;
$$;

revoke execute on function app.insert_timer_span(public.timers, timestamptz, timestamptz, text, text)
  from public, anon, authenticated;

create or replace function app.save_timer(
  p_timer_id    uuid,
  p_started_at  timestamptz,
  p_ended_at    timestamptz,
  p_description text,
  p_auto_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timer  public.timers;
  v_task   public.tasks;
  v_open   integer;
  v_closed integer;
  v_piece  record;
  v_total  integer := 0;
  v_first  timestamptz;
  v_last   timestamptz;
begin
  select * into v_timer from public.timers where id = p_timer_id for update;
  if not found or v_timer.stopped_at is not null then
    raise exception 'timer_not_running' using errcode = 'check_violation';
  end if;
  if p_started_at < v_timer.started_at or p_ended_at > now() then
    raise exception 'timer_range_invalid' using errcode = 'check_violation';
  end if;

  select count(*) filter (where ended_at is null),
         count(*) filter (where ended_at is not null)
    into v_open, v_closed
    from public.timer_segments
   where timer_id = p_timer_id;

  select * into v_task from public.tasks where id = v_timer.task_id for update;

  -- One open segment and no pause: the review may shorten that single range.
  -- Tests and a run that was never paused take this path.
  if coalesce(v_open, 0) + coalesce(v_closed, 0) = 0
     or (v_open = 1 and v_closed = 0) then
    if p_ended_at <= p_started_at then
      raise exception 'timer_range_invalid' using errcode = 'check_violation';
    end if;

    v_total := app.insert_timer_span(v_timer, p_started_at, p_ended_at, p_description, p_auto_reason);
    if v_open = 1 then
      update public.timer_segments
         set started_at = p_started_at, ended_at = p_ended_at
       where timer_id = p_timer_id and ended_at is null;
    end if;
    v_first := p_started_at;
    v_last := p_ended_at;
  else
    update public.timer_segments
       set ended_at = least(p_ended_at, now())
     where timer_id = p_timer_id
       and ended_at is null
       and least(p_ended_at, now()) > started_at;

    delete from public.timer_segments
     where timer_id = p_timer_id and ended_at is null;

    update public.timer_segments s
       set started_at = p_started_at
     where s.timer_id = p_timer_id
       and s.id = (
         select id from public.timer_segments
          where timer_id = p_timer_id
          order by started_at, id
          limit 1
       )
       and p_started_at > s.started_at
       and p_started_at < s.ended_at;

    update public.timer_segments s
       set ended_at = p_ended_at
     where s.timer_id = p_timer_id
       and s.id = (
         select id from public.timer_segments
          where timer_id = p_timer_id
          order by started_at desc, id desc
          limit 1
       )
       and p_ended_at < s.ended_at
       and p_ended_at > s.started_at;

    delete from public.timer_segments
     where timer_id = p_timer_id and ended_at <= started_at;

    for v_piece in
      select started_at, ended_at
        from public.timer_segments
       where timer_id = p_timer_id
       order by started_at
    loop
      v_total := v_total + app.insert_timer_span(
        v_timer, v_piece.started_at, v_piece.ended_at, p_description, p_auto_reason);
    end loop;

    select min(started_at), max(ended_at)
      into v_first, v_last
      from public.timer_segments
     where timer_id = p_timer_id;
    v_first := coalesce(v_first, p_started_at);
    v_last := coalesce(v_last, p_ended_at);
  end if;

  update public.timers
     set stopped_at = now(),
         paused_at = null,
         outcome = case when p_auto_reason is null then 'saved' else 'auto_saved' end,
         auto_reason = p_auto_reason
   where id = v_timer.id;

  if v_total > 0 and v_task.status = 'approved' then
    update public.tasks set status = 'in_progress' where id = v_task.id;
  end if;

  perform app.recount_task(v_task.id);

  perform app.log_event(
    case when p_auto_reason is null then 'timer.stopped' else 'timer.auto_stopped' end,
    v_task.id, v_task.project_id, v_timer.user_id, v_timer.id,
    jsonb_build_object('minutes', v_total, 'started_at', v_first,
                       'ended_at', v_last, 'reason', p_auto_reason));

  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Commands
-- ---------------------------------------------------------------------------
create or replace function public.start_timer(p_task_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_task  public.tasks := app.lock_task(p_task_id);
  v_id    uuid;
  v_now   timestamptz := now();
begin
  perform app.require_trackable(v_task, v_actor);
  if exists (select 1 from public.timers where user_id = v_actor and stopped_at is null) then
    raise exception 'timer_already_running' using errcode = 'check_violation';
  end if;

  insert into public.timers (user_id, task_id, started_at, share_seen_at)
  values (v_actor, p_task_id, v_now, v_now)
  returning id into v_id;

  insert into public.timer_segments (timer_id, started_at) values (v_id, v_now);

  perform app.log_event('timer.started', p_task_id, v_task.project_id, v_actor, v_id, '{}'::jsonb);
  return v_id;
end;
$$;

-- Closes the open segment. A stale share heartbeat ends the segment at the
-- last heartbeat, so time after the browser died is not counted. Calling it
-- again while already paused returns the same moment.
create or replace function public.pause_timer()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor     uuid := app.require_active();
  v_timer     public.timers;
  v_task      public.tasks;
  v_end       timestamptz;
  v_seg_start timestamptz;
begin
  select * into v_timer
    from public.timers
   where user_id = v_actor and stopped_at is null
   for update;
  if not found then
    raise exception 'timer_not_running' using errcode = 'check_violation';
  end if;
  if v_timer.paused_at is not null then
    return v_timer.paused_at;
  end if;

  select started_at into v_seg_start
    from public.timer_segments
   where timer_id = v_timer.id and ended_at is null
   for update;

  v_end := now();
  if v_timer.share_seen_at is not null
     and v_timer.share_seen_at < v_end - interval '45 seconds' then
    v_end := v_timer.share_seen_at;
  end if;
  if v_seg_start is not null and v_end < v_seg_start then
    v_end := v_seg_start;
  end if;

  update public.timer_segments
     set ended_at = v_end
   where timer_id = v_timer.id and ended_at is null;

  update public.timers
     set paused_at = v_end
   where id = v_timer.id;

  select * into v_task from public.tasks where id = v_timer.task_id;
  perform app.log_event(
    'timer.paused', v_task.id, v_task.project_id, v_actor, v_timer.id,
    jsonb_build_object('paused_at', v_end));
  return v_end;
end;
$$;

create or replace function public.resume_timer()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_timer public.timers;
  v_task  public.tasks;
  v_now   timestamptz := now();
begin
  select * into v_timer
    from public.timers
   where user_id = v_actor and stopped_at is null
   for update;
  if not found then
    raise exception 'timer_not_running' using errcode = 'check_violation';
  end if;
  if v_timer.paused_at is null then
    raise exception 'timer_not_paused' using errcode = 'check_violation';
  end if;

  v_task := app.lock_task(v_timer.task_id);
  perform app.require_trackable(v_task, v_actor);

  insert into public.timer_segments (timer_id, started_at) values (v_timer.id, v_now);
  update public.timers
     set paused_at = null, share_seen_at = v_now
   where id = v_timer.id;

  perform app.log_event(
    'timer.resumed', v_task.id, v_task.project_id, v_actor, v_timer.id, '{}'::jsonb);
end;
$$;

-- The sharing tab calls this while the screen stays shared. No history row:
-- it would be one event every few seconds.
create or replace function public.touch_timer_share()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
begin
  update public.timers
     set share_seen_at = now()
   where user_id = v_actor
     and stopped_at is null
     and paused_at is null;
end;
$$;

create or replace function public.discard_timer()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_timer public.timers;
  v_task  public.tasks;
begin
  update public.timers
     set stopped_at = now(), paused_at = null, outcome = 'discarded'
   where user_id = v_actor and stopped_at is null
  returning * into v_timer;
  if not found then
    raise exception 'timer_not_running' using errcode = 'check_violation';
  end if;

  update public.timer_segments
     set ended_at = coalesce(ended_at, v_timer.stopped_at)
   where timer_id = v_timer.id and ended_at is null;

  select * into v_task from public.tasks where id = v_timer.task_id;
  perform app.log_event('timer.discarded', v_task.id, v_task.project_id, v_actor, v_timer.id,
    jsonb_build_object('started_at', v_timer.started_at, 'stopped_at', v_timer.stopped_at));
end;
$$;

create or replace function public.create_timer_screenshot(p_timer_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_timer public.timers;
  v_task  public.tasks;
  v_id    uuid := gen_random_uuid();
  v_path  text;
begin
  select * into v_timer
    from public.timers
   where id = p_timer_id and user_id = v_actor and stopped_at is null and paused_at is null
   for update;
  if not found then
    raise exception 'timer_not_running' using errcode = 'check_violation';
  end if;

  v_path := v_actor::text || '/' || v_id::text || '.jpg';
  insert into public.timer_screenshots (id, timer_id, user_id, task_id, storage_path)
  values (v_id, v_timer.id, v_actor, v_timer.task_id, v_path);

  select * into v_task from public.tasks where id = v_timer.task_id;
  perform app.log_event(
    'screenshot.captured', v_task.id, v_task.project_id, v_actor, v_id,
    jsonb_build_object('captured_at', now()));
  return v_path;
end;
$$;

-- A failed upload removes the row. A stored image is not removed here.
create or replace function public.discard_unstored_screenshot(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_path  text;
begin
  select storage_path into v_path
    from public.timer_screenshots
   where id = p_id
     and user_id = v_actor
     and deleted_at is null
     and created_at > now() - interval '2 minutes';
  if not found then
    return;
  end if;
  if exists (
    select 1 from storage.objects
     where bucket_id = 'timer-screenshots' and name = v_path
  ) then
    return;
  end if;

  delete from public.timer_screenshots where id = p_id;
end;
$$;

-- Hides the image from the freelancer. The file stays, and Admins are told.
create or replace function public.delete_timer_screenshot(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_shot  public.timer_screenshots;
  v_task  public.tasks;
begin
  select * into v_shot
    from public.timer_screenshots
   where id = p_id and user_id = v_actor and deleted_at is null
   for update;
  if not found then
    raise exception 'screenshot_not_found' using errcode = 'P0002';
  end if;

  update public.timer_screenshots
     set deleted_at = now(), deleted_by = v_actor
   where id = p_id;

  select * into v_task from public.tasks where id = v_shot.task_id;
  perform app.log_event(
    'screenshot.deleted', v_task.id, v_task.project_id, v_actor, v_shot.id,
    jsonb_build_object('captured_at', v_shot.captured_at));
end;
$$;

revoke execute on function
  public.pause_timer(),
  public.resume_timer(),
  public.touch_timer_share(),
  public.create_timer_screenshot(uuid),
  public.discard_unstored_screenshot(uuid),
  public.delete_timer_screenshot(uuid)
from public, anon;
grant execute on function
  public.pause_timer(),
  public.resume_timer(),
  public.touch_timer_share(),
  public.create_timer_screenshot(uuid),
  public.discard_unstored_screenshot(uuid),
  public.delete_timer_screenshot(uuid)
to authenticated;

-- start_timer and discard_timer were already granted. Replacing them keeps that.

-- ---------------------------------------------------------------------------
-- Notify Admins when a screenshot is deleted (PRD §6.12).
-- ---------------------------------------------------------------------------
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

    when 'screenshot.deleted' then
      perform app.notify_admins(new, true);

    else
      null;
  end case;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Read access. Writes stay inside the commands above.
-- ---------------------------------------------------------------------------
alter table public.timer_segments enable row level security;
alter table public.timer_screenshots enable row level security;

create policy timer_segments_select on public.timer_segments
  for select to authenticated
  using (
    (select app.is_admin())
    or exists (
      select 1 from public.timers t
       where t.id = timer_id and t.user_id = (select app.viewer_id())
    )
  );

create policy timer_screenshots_select on public.timer_screenshots
  for select to authenticated
  using (
    (select app.is_admin())
    or (user_id = (select app.viewer_id()) and deleted_at is null)
  );

revoke all on public.timer_segments, public.timer_screenshots from public, anon, authenticated;
grant select on public.timer_segments, public.timer_screenshots to authenticated;
grant all on public.timer_segments, public.timer_screenshots to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'timer-screenshots',
  'timer-screenshots',
  false,
  2097152,
  array['image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Admins read every object, including one the freelancer has hidden.
-- A freelancer reads only a screenshot they have not deleted.
create policy timer_screenshots_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'timer-screenshots'
    and (select app.viewer_id()) is not null
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    and (
      (select app.is_admin())
      or exists (
        select 1 from public.timer_screenshots s
         where s.storage_path = name
           and s.user_id = (select app.viewer_id())
           and s.deleted_at is null
      )
    )
  );

create policy timer_screenshots_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'timer-screenshots'
    and exists (
      select 1 from public.timer_screenshots s
       where s.storage_path = name
         and s.user_id = (select app.viewer_id())
         and s.deleted_at is null
    )
  );
