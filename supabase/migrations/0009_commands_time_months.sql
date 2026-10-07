-- 0009_commands_time_months.sql
-- Timer, time entries, month close and reopen, notifications.

-- ---------------------------------------------------------------------------
-- Shared checks for tracking time (PRD §6.8, rule 5)
-- ---------------------------------------------------------------------------
create or replace function app.require_trackable(p_task public.tasks, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_assignee(p_task, p_actor);
  perform app.require_task_status(p_task, 'approved', 'in_progress');
  if (select p.status from public.projects p where p.id = p_task.project_id) <> 'active' then
    raise exception 'project_not_active' using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function app.require_valid_work_date(p_task public.tasks, p_work_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_work_date > app.org_today() then
    raise exception 'work_date_in_future' using errcode = 'check_violation';
  end if;
  if p_work_date < p_task.first_approved_on then
    raise exception 'work_date_before_approval' using errcode = 'check_violation';
  end if;
  -- Not in a closed month, and not before the most recently closed one either
  -- (months without time are never closed, so they must not receive any).
  if exists (select 1 from public.month_closures c where c.month >= app.month_start(p_work_date)) then
    raise exception 'month_closed' using errcode = 'check_violation';
  end if;
end;
$$;

-- Only the dates the current command touched are checked, so a day pushed over
-- 24 hours by an automatic stop never blocks work on other days.
create or replace function app.require_daily_cap(p_user_id uuid, p_dates date[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.time_entries e
              where e.user_id = p_user_id
                and e.work_date = any(p_dates)
              group by e.work_date
             having sum(e.duration_minutes) > 1440) then
    raise exception 'daily_limit_exceeded' using errcode = 'check_violation';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Timer (PRD §5.5, §6.8)
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
begin
  perform app.require_trackable(v_task, v_actor);
  if exists (select 1 from public.timers where user_id = v_actor and stopped_at is null) then
    -- the UI first asks to review and stop the running timer
    raise exception 'timer_already_running' using errcode = 'check_violation';
  end if;

  insert into public.timers (user_id, task_id) values (v_actor, p_task_id) returning id into v_id;
  perform app.log_event('timer.started', p_task_id, v_task.project_id, v_actor, v_id, '{}'::jsonb);
  return v_id;
end;
$$;

-- The review dialog may shorten the run (a later start or an earlier end), never
-- extend it. Time before the timer started is added as a manual entry.
create or replace function public.stop_timer(
  p_started_at  timestamptz,
  p_ended_at    timestamptz,
  p_description text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := app.require_active();
  v_timer   uuid;
  v_minutes integer;
begin
  select id into v_timer from public.timers
   where user_id = v_actor and stopped_at is null
     for update;
  if not found then
    raise exception 'timer_not_running' using errcode = 'check_violation';
  end if;

  v_minutes := app.save_timer(v_timer, p_started_at, p_ended_at, btrim(p_description));
  perform app.require_daily_cap(v_actor, array(
    select d::date from generate_series(app.local_date(p_started_at)::timestamp,
                                        app.local_date(p_ended_at)::timestamp,
                                        interval '1 day') as g(d)));
  return v_minutes;
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
     set stopped_at = now(), outcome = 'discarded'
   where user_id = v_actor and stopped_at is null
  returning * into v_timer;
  if not found then
    raise exception 'timer_not_running' using errcode = 'check_violation';
  end if;

  select * into v_task from public.tasks where id = v_timer.task_id;
  perform app.log_event('timer.discarded', v_task.id, v_task.project_id, v_actor, v_timer.id,
    jsonb_build_object('started_at', v_timer.started_at, 'stopped_at', v_timer.stopped_at));
end;
$$;

-- ---------------------------------------------------------------------------
-- Manual entries and edits
-- ---------------------------------------------------------------------------
create or replace function public.add_time_entry(
  p_task_id     uuid,
  p_work_date   date,
  p_minutes     integer,
  p_description text
)
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
  perform app.require_trackable(v_task, v_actor);
  perform app.require_valid_work_date(v_task, p_work_date);

  insert into public.time_entries (task_id, user_id, work_date, duration_minutes, description, source)
  values (p_task_id, v_actor, p_work_date, p_minutes, btrim(p_description), 'manual')
  returning id into v_id;

  perform app.require_daily_cap(v_actor, array[p_work_date]);

  if v_task.status = 'approved' then
    update public.tasks set status = 'in_progress' where id = p_task_id;
  end if;
  perform app.recount_task(p_task_id);

  perform app.log_event('time_entry.created', p_task_id, v_task.project_id, v_actor, v_id,
    jsonb_build_object('work_date', p_work_date, 'minutes', p_minutes, 'source', 'manual'));
  return v_id;
end;
$$;

-- Manual entries change date and minutes; timed entries change start and end
-- (within one organization-local day). Changing time needs a task that still
-- accepts time; correcting only the description is allowed at any task status
-- while the month is open (for example after an automatic stop).
create or replace function public.update_time_entry(
  p_entry_id    uuid,
  p_description text,
  p_work_date   date default null,
  p_minutes     integer default null,
  p_started_at  timestamptz default null,
  p_ended_at    timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := app.require_active();
  v_entry   public.time_entries;
  v_task    public.tasks;
  v_date    date;
  v_minutes integer;
  v_started timestamptz;
  v_ended   timestamptz;
begin
  select * into v_entry from public.time_entries where id = p_entry_id for update;
  if not found or v_entry.user_id <> v_actor then
    raise exception 'entry_not_found' using errcode = 'P0002';
  end if;

  v_task := app.lock_task(v_entry.task_id);

  if v_entry.source = 'timer' then
    v_started := coalesce(p_started_at, v_entry.started_at);
    v_ended := coalesce(p_ended_at, v_entry.ended_at);
    if v_ended <= v_started then
      raise exception 'timer_range_invalid' using errcode = 'check_violation';
    end if;
    v_date := app.local_date(v_started);
    if app.local_date(v_ended - interval '1 microsecond') <> v_date then
      raise exception 'entry_spans_midnight' using errcode = 'check_violation';
    end if;
    v_minutes := round(extract(epoch from v_ended - v_started) / 60)::integer;
  else
    v_date := coalesce(p_work_date, v_entry.work_date);
    v_minutes := coalesce(p_minutes, v_entry.duration_minutes);
  end if;

  if v_date <> v_entry.work_date
     or v_minutes <> v_entry.duration_minutes
     or v_started is distinct from v_entry.started_at
     or v_ended is distinct from v_entry.ended_at then
    perform app.require_trackable(v_task, v_actor);
    perform app.require_valid_work_date(v_task, v_date);
  end if;

  update public.time_entries
     set work_date = v_date,
         duration_minutes = v_minutes,
         description = btrim(p_description),
         started_at = v_started,
         ended_at = v_ended
   where id = p_entry_id;

  perform app.require_daily_cap(v_actor, array[v_date]);
  perform app.recount_task(v_task.id);

  perform app.log_event('time_entry.updated', v_task.id, v_task.project_id, v_actor, p_entry_id,
    jsonb_build_object(
      'from', jsonb_build_object('work_date', v_entry.work_date, 'minutes', v_entry.duration_minutes,
                                 'description', v_entry.description, 'started_at', v_entry.started_at,
                                 'ended_at', v_entry.ended_at),
      'to',   jsonb_build_object('work_date', v_date, 'minutes', v_minutes,
                                 'description', btrim(p_description), 'started_at', v_started,
                                 'ended_at', v_ended)));
end;
$$;

create or replace function public.delete_time_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_entry public.time_entries;
  v_task  public.tasks;
begin
  select * into v_entry from public.time_entries where id = p_entry_id for update;
  if not found or v_entry.user_id <> v_actor then
    raise exception 'entry_not_found' using errcode = 'P0002';
  end if;

  v_task := app.lock_task(v_entry.task_id);
  perform app.require_trackable(v_task, v_actor);

  delete from public.time_entries where id = p_entry_id;
  perform app.recount_task(v_task.id);

  perform app.log_event('time_entry.deleted', v_task.id, v_task.project_id, v_actor, p_entry_id,
    jsonb_build_object('work_date', v_entry.work_date, 'minutes', v_entry.duration_minutes,
                       'description', v_entry.description, 'source', v_entry.source,
                       'started_at', v_entry.started_at, 'ended_at', v_entry.ended_at));
end;
$$;

-- ---------------------------------------------------------------------------
-- Month close and reopen (PRD §5.6, §6.10)
-- ---------------------------------------------------------------------------
create or replace function public.close_month(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor       uuid := app.require_admin();
  v_month       date := app.month_start(p_month);
  v_next        date := (app.month_start(p_month) + interval '1 month')::date;
  v_task        uuid;
  v_freelancers jsonb;
begin
  -- No time can be written anywhere while a month is being closed, so nothing
  -- saved at the same moment can slip past the frozen report.
  lock table public.time_entries in share mode;

  if exists (select 1 from public.month_closures where month = v_month) then
    raise exception 'month_already_closed' using errcode = 'check_violation';
  end if;
  if v_next > app.org_today() then
    raise exception 'month_not_ended' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.time_entries e
              where e.month < v_month
                and not exists (select 1 from public.month_closures c where c.month = e.month)) then
    raise exception 'earlier_month_open' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.timers t
              where t.stopped_at is null and app.local_date(t.started_at) < v_next) then
    raise exception 'timer_running_in_month' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.extra_hours_requests r
              where r.status = 'pending'
                and exists (select 1 from public.time_entries e
                             where e.task_id = r.task_id and e.month = v_month
                               and e.over_limit_minutes > 0)) then
    raise exception 'open_extra_hours_request' using errcode = 'check_violation';
  end if;

  -- make sure every split reflects the current limits and tolerance
  for v_task in select distinct task_id from public.time_entries where month = v_month loop
    perform app.recount_task(v_task);
  end loop;

  if exists (select 1 from public.time_entries e
              where e.month = v_month and e.counted_minutes > 0
                and app.rate_id_for(e.user_id, e.work_date) is null) then
    raise exception 'missing_rate' using errcode = 'check_violation';
  end if;

  -- Freeze the live preview exactly as it stands (the FK to month_closures is
  -- deferred, so the lines can be written before the closure row).
  insert into public.month_report_lines
    (month, user_id, project_id, task_id, project_name, task_title, rate_id, hourly_rate,
     currency, counted_minutes, over_limit_minutes, amount)
  select l.month, l.user_id, l.project_id, l.task_id, l.project_name, l.task_title, l.rate_id,
         l.hourly_rate, l.currency, l.counted_minutes, l.over_limit_minutes, l.amount
    from public.report_lines l
   where l.month = v_month and not l.is_final;

  insert into public.month_closures (month, closed_by) values (v_month, v_actor);

  select coalesce(jsonb_agg(distinct e.user_id), '[]'::jsonb)
    into v_freelancers
    from public.time_entries e
   where e.month = v_month;

  perform app.log_event('month.closed', null, null, null, null,
    jsonb_build_object('month', v_month, 'freelancer_ids', v_freelancers));
end;
$$;

create or replace function public.reopen_month(p_month date, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor       uuid := app.require_admin();
  v_month       date := app.month_start(p_month);
  v_freelancers jsonb;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'comment_required' using errcode = 'check_violation';
  end if;
  if v_month is distinct from (select max(month) from public.month_closures) then
    raise exception 'month_not_latest_closed' using errcode = 'check_violation';
  end if;

  delete from public.month_closures where month = v_month;   -- lines cascade

  select coalesce(jsonb_agg(distinct e.user_id), '[]'::jsonb)
    into v_freelancers
    from public.time_entries e
   where e.month = v_month;

  perform app.log_event('month.reopened', null, null, null, null,
    jsonb_build_object('month', v_month, 'reason', btrim(p_reason), 'freelancer_ids', v_freelancers));
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications (PRD §6.12)
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
begin
  update public.notifications
     set read_at = now()
   where recipient_id = v_actor
     and read_at is null
     and (p_ids is null or id = any(p_ids));
end;
$$;
