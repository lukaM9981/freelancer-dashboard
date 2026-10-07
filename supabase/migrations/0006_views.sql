-- 0006_views.sql
-- Read models for screens. All views are security_invoker, so the querying
-- person's row-level security applies to every table they read.

-- ---------------------------------------------------------------------------
-- task_progress: limit, ceiling, remaining time for the hours meter
-- ---------------------------------------------------------------------------
create view public.task_progress
with (security_invoker = true) as
select t.id                                                     as task_id,
       t.project_id,
       t.assignee_id,
       t.status,
       t.limit_minutes,
       app.ceiling_minutes(t.limit_minutes, s.tolerance_percent) as ceiling_minutes,
       t.counted_minutes,
       t.over_limit_minutes,
       greatest(coalesce(t.limit_minutes, 0) - t.counted_minutes, 0) as remaining_minutes,
       case when t.limit_minutes > 0
            then round(100.0 * t.counted_minutes / t.limit_minutes)::integer
       end                                                      as percent_used
  from public.tasks t
 cross join public.organization_settings s
 where s.id = 1;

-- ---------------------------------------------------------------------------
-- report_lines: frozen lines for closed months, live preview for open months.
-- The grouping and rounding here are exactly what close_month() freezes.
-- ---------------------------------------------------------------------------
create view public.report_lines
with (security_invoker = true) as
select l.month, l.user_id, l.project_id, l.task_id, l.project_name, l.task_title,
       l.rate_id, l.hourly_rate, l.currency, l.counted_minutes, l.over_limit_minutes,
       l.amount, true as is_final
  from public.month_report_lines l
union all
select e.month, e.user_id, t.project_id, e.task_id, p.name, t.title,
       r.id, r.hourly_rate, r.currency,
       sum(e.counted_minutes)::integer,
       sum(e.over_limit_minutes)::integer,
       coalesce(round(sum(e.counted_minutes) * r.hourly_rate / 60, 2), 0),
       false
  from public.time_entries e
  join public.tasks t on t.id = e.task_id
  join public.projects p on p.id = t.project_id
  left join lateral (
         select x.id, x.hourly_rate, x.currency
           from public.rates x
          where x.user_id = e.user_id
            and x.effective_from <= e.work_date
          order by x.effective_from desc
          limit 1
       ) r on true
 where not exists (select 1 from public.month_closures c where c.month = e.month)
 group by e.month, e.user_id, t.project_id, e.task_id, p.name, t.title,
          r.id, r.hourly_rate, r.currency;

-- ---------------------------------------------------------------------------
-- approval_queue: everything waiting for an Admin, oldest first (PRD §6.5)
-- ---------------------------------------------------------------------------
create view public.approval_queue
with (security_invoker = true) as
select 'proposal'::text            as kind,
       p.id                        as item_id,
       p.project_id,
       null::uuid                  as task_id,
       p.submitted_by              as requested_by,
       p.submitted_at              as waiting_since,
       count(r.id)::integer        as item_count,
       sum(r.min_minutes)::integer as min_minutes,
       sum(r.max_minutes)::integer as max_minutes
  from public.proposals p
  join public.estimate_revisions r on r.proposal_id = p.id and r.decision = 'pending'
 group by p.id
union all
select 'extra_hours', x.id, t.project_id, x.task_id, x.requested_by, x.created_at,
       1, x.minutes, x.minutes
  from public.extra_hours_requests x
  join public.tasks t on t.id = x.task_id
 where x.status = 'pending'
union all
select 'done_task', t.id, t.project_id, t.id, t.assignee_id, t.status_changed_at,
       1, null, null
  from public.tasks t
 where t.status = 'done';

grant select on public.task_progress, public.report_lines, public.approval_queue to authenticated;
