-- 0003_time.sql
-- Timers, time entries, rates, month closures, frozen report lines, and the
-- functions that count time against limits.

-- ---------------------------------------------------------------------------
-- timers: one row per timer run. Stopping updates the row instead of deleting
-- it, so Realtime subscribers only ever receive RLS-filtered inserts/updates.
-- ---------------------------------------------------------------------------
create table public.timers (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id),
  task_id     uuid        not null references public.tasks (id) on delete restrict,
  started_at  timestamptz not null default now(),
  stopped_at  timestamptz,
  outcome     text        check (outcome in ('saved', 'discarded', 'auto_saved')),
  auto_reason text,

  constraint timers_stopped_pair check ((stopped_at is null) = (outcome is null)),
  constraint timers_order check (stopped_at is null or stopped_at >= started_at)
);

create unique index timers_one_running_per_user on public.timers (user_id) where stopped_at is null;
create index timers_task_idx on public.timers (task_id);
create index timers_user_idx on public.timers (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- time_entries (PRD §5.5, §6.8)
-- ---------------------------------------------------------------------------
create table public.time_entries (
  id                  uuid        primary key default gen_random_uuid(),
  task_id             uuid        not null references public.tasks (id) on delete restrict,
  user_id             uuid        not null references public.profiles (id),
  work_date           date        not null,
  month               date        generated always as
                        (date_trunc('month', work_date::timestamp)::date) stored,
  -- 1500, not 1440: the autumn daylight-saving day has 25 hours. The 24-hour
  -- daily cap is a command rule (app.require_daily_cap).
  duration_minutes    integer     not null check (duration_minutes between 1 and 1500),
  description         text        not null check (length(btrim(description)) between 1 and 2000),
  source              text        not null check (source in ('timer', 'manual')),
  started_at          timestamptz,
  ended_at            timestamptz,
  timer_id            uuid        references public.timers (id),
  auto_stopped_reason text,

  -- maintained by app.recount_task()
  counted_minutes     integer     not null default 0 check (counted_minutes >= 0),
  over_limit_minutes  integer     not null default 0 check (over_limit_minutes >= 0),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint time_entries_split check (counted_minutes + over_limit_minutes = duration_minutes),
  constraint time_entries_source_fields check (
    (source = 'timer'  and started_at is not null and ended_at > started_at)
    or (source = 'manual' and started_at is null and ended_at is null and timer_id is null))
);

create index time_entries_task_order_idx on public.time_entries (task_id, work_date, created_at, id);
create index time_entries_user_date_idx on public.time_entries (user_id, work_date);
create index time_entries_month_idx on public.time_entries (month, user_id);
create index time_entries_timer_idx on public.time_entries (timer_id);

create trigger time_entries_set_updated_at
  before update on public.time_entries
  for each row execute function app.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- rates: append-only history per freelancer (PRD §5.7)
-- ---------------------------------------------------------------------------
create table public.rates (
  id             uuid          primary key default gen_random_uuid(),
  user_id        uuid          not null references public.profiles (id),
  hourly_rate    numeric(10,2) not null check (hourly_rate > 0),
  currency       text          not null check (currency in ('EUR', 'USD')),
  effective_from date          not null,
  created_by     uuid          not null references public.profiles (id),
  created_at     timestamptz   not null default now(),

  constraint rates_user_effective_key unique (user_id, effective_from)
);

create index rates_created_by_idx on public.rates (created_by);

-- ---------------------------------------------------------------------------
-- month_closures and the frozen report (PRD §5.6, §6.10)
-- ---------------------------------------------------------------------------
create table public.month_closures (
  month     date        primary key check (extract(day from month) = 1),
  closed_by uuid        not null references public.profiles (id),
  closed_at timestamptz not null default now()
);

create index month_closures_closed_by_idx on public.month_closures (closed_by);

create table public.month_report_lines (
  id                 uuid          primary key default gen_random_uuid(),
  month              date          not null references public.month_closures (month)
                                     on delete cascade deferrable initially deferred,
  user_id            uuid          not null references public.profiles (id),
  project_id         uuid          not null references public.projects (id),
  task_id            uuid          not null references public.tasks (id),
  project_name       text          not null,      -- frozen labels
  task_title         text          not null,
  rate_id            uuid          references public.rates (id),
  hourly_rate        numeric(10,2),
  currency           text          check (currency in ('EUR', 'USD')),
  counted_minutes    integer       not null check (counted_minutes >= 0),
  over_limit_minutes integer       not null check (over_limit_minutes >= 0),
  amount             numeric(14,2) not null default 0,

  constraint month_report_lines_priced check (
    counted_minutes = 0 or (rate_id is not null and hourly_rate is not null and currency is not null))
);

create index month_report_lines_month_user_idx on public.month_report_lines (month, user_id);
create index month_report_lines_user_idx on public.month_report_lines (user_id);
create index month_report_lines_project_idx on public.month_report_lines (project_id);
create index month_report_lines_task_idx on public.month_report_lines (task_id);
create index month_report_lines_rate_idx on public.month_report_lines (rate_id);

-- ---------------------------------------------------------------------------
-- time_entries guard: closed months, and everything before the most recently
-- closed month, are read-only. Every new or resized entry starts as fully
-- counted until app.recount_task() splits it.
-- ---------------------------------------------------------------------------
create or replace function app.tg_time_entries_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE')
     and exists (select 1 from public.month_closures c where c.month >= old.month) then
    raise exception 'month_closed' using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if exists (select 1 from public.month_closures c
              where c.month >= app.month_start(new.work_date)) then
    raise exception 'month_closed' using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' or new.duration_minutes <> old.duration_minutes then
    new.counted_minutes := new.duration_minutes;
    new.over_limit_minutes := 0;
  end if;

  return new;
end;
$$;

create trigger time_entries_guard
  before insert or update or delete on public.time_entries
  for each row execute function app.tg_time_entries_guard();

-- ---------------------------------------------------------------------------
-- Rate in effect for a person on a work date.
-- ---------------------------------------------------------------------------
create or replace function app.rate_id_for(p_user_id uuid, p_work_date date)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.id
    from public.rates r
   where r.user_id = p_user_id
     and r.effective_from <= p_work_date
   order by r.effective_from desc
   limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Ceiling = limit + tolerance, in whole minutes (rounded down).
-- ---------------------------------------------------------------------------
create or replace function app.ceiling_minutes(p_limit integer, p_tolerance numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_limit is null then 0
              else floor(p_limit * (100 + p_tolerance) / 100)::integer end;
$$;

-- ---------------------------------------------------------------------------
-- Recount a task's time against its ceiling (PRD §5.4).
-- Entries in closed months keep their frozen split and count first; entries in
-- open months are counted in order of work date, then creation.
-- ---------------------------------------------------------------------------
create or replace function app.recount_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task       public.tasks;
  v_ceiling    integer;
  v_running    integer;
  v_entry      record;
  v_counted    integer;
  v_new_total  integer;
  v_new_over   integer;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then
    return;
  end if;

  select app.ceiling_minutes(v_task.limit_minutes, s.tolerance_percent)
    into v_ceiling
    from public.organization_settings s
   where s.id = 1;

  select coalesce(sum(e.counted_minutes), 0)
    into v_running
    from public.time_entries e
   where e.task_id = p_task_id
     and exists (select 1 from public.month_closures c where c.month = e.month);

  for v_entry in
    select e.id, e.duration_minutes, e.counted_minutes
      from public.time_entries e
     where e.task_id = p_task_id
       and not exists (select 1 from public.month_closures c where c.month = e.month)
     order by e.work_date, e.created_at, e.id
  loop
    v_counted := greatest(0, least(v_entry.duration_minutes, v_ceiling - v_running));
    if v_counted <> v_entry.counted_minutes then
      update public.time_entries
         set counted_minutes = v_counted,
             over_limit_minutes = v_entry.duration_minutes - v_counted
       where id = v_entry.id;
    end if;
    v_running := v_running + v_counted;
  end loop;

  select coalesce(sum(e.counted_minutes), 0), coalesce(sum(e.over_limit_minutes), 0)
    into v_new_total, v_new_over
    from public.time_entries e
   where e.task_id = p_task_id;

  if (v_new_total, v_new_over) is distinct from (v_task.counted_minutes, v_task.over_limit_minutes) then
    update public.tasks
       set counted_minutes = v_new_total,
           over_limit_minutes = v_new_over
     where id = p_task_id;
  end if;

  if v_task.limit_minutes is not null then
    if v_task.counted_minutes < v_task.limit_minutes and v_new_total >= v_task.limit_minutes then
      -- logged as the system, so the assignee is notified even when their own
      -- entry crossed the line
      perform app.log_event('task.limit_reached', p_task_id, v_task.project_id, v_task.assignee_id,
        p_task_id, jsonb_build_object('limit_minutes', v_task.limit_minutes, 'counted_minutes', v_new_total),
        p_as_system => true);
    end if;
    if v_task.over_limit_minutes = 0 and v_new_over > 0 then
      perform app.log_event('task.over_limit', p_task_id, v_task.project_id, v_task.assignee_id,
        p_task_id, jsonb_build_object('over_limit_minutes', v_new_over), p_as_system => true);
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Turn a timer run into time entries, one per organization-local day.
-- Used by stop_timer() and by automatic stops. Returns the minutes saved.
-- ---------------------------------------------------------------------------
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
  v_timer public.timers;
  v_task  public.tasks;
  v_tz    text := app.org_time_zone();
  v_seg   record;
  v_total integer := 0;
begin
  select * into v_timer from public.timers where id = p_timer_id for update;
  if not found or v_timer.stopped_at is not null then
    raise exception 'timer_not_running' using errcode = 'check_violation';
  end if;
  if p_started_at < v_timer.started_at or p_ended_at > now() or p_ended_at <= p_started_at then
    raise exception 'timer_range_invalid' using errcode = 'check_violation';
  end if;

  select * into v_task from public.tasks where id = v_timer.task_id for update;

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
    continue when v_seg.seg_end - v_seg.seg_start < interval '1 minute';   -- under a minute is discarded

    insert into public.time_entries
      (task_id, user_id, work_date, duration_minutes, description, source,
       started_at, ended_at, timer_id, auto_stopped_reason)
    values
      (v_timer.task_id, v_timer.user_id, v_seg.work_date,
       round(extract(epoch from v_seg.seg_end - v_seg.seg_start) / 60)::integer,
       p_description, 'timer', v_seg.seg_start, v_seg.seg_end, v_timer.id, p_auto_reason);

    v_total := v_total + round(extract(epoch from v_seg.seg_end - v_seg.seg_start) / 60)::integer;
  end loop;

  update public.timers
     set stopped_at = now(),
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
    jsonb_build_object('minutes', v_total, 'started_at', p_started_at,
                       'ended_at', p_ended_at, 'reason', p_auto_reason));

  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Stop every running timer that matches, saving its time (PRD §6.8).
-- Called when a task or project is put on hold, a task is cancelled, or a
-- person is deactivated. Never fails because of the 24-hour daily cap.
-- ---------------------------------------------------------------------------
create or replace function app.auto_stop_timers(
  p_reason     text,
  p_task_id    uuid default null,
  p_project_id uuid default null,
  p_user_id    uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timer record;
begin
  for v_timer in
    select t.id, t.started_at
      from public.timers t
      join public.tasks k on k.id = t.task_id
     where t.stopped_at is null
       and (p_task_id is null or t.task_id = p_task_id)
       and (p_project_id is null or k.project_id = p_project_id)
       and (p_user_id is null or t.user_id = p_user_id)
     for update of t
  loop
    perform app.save_timer(v_timer.id, v_timer.started_at, now(),
                           'Stopped automatically: ' || p_reason, p_reason);
  end loop;
end;
$$;
