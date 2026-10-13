-- 0012_audit_log.sql
-- The Admin audit log (PRD §6.13). Comment edits and deletions are logged
-- without a project, so the project comes from the task when the event has
-- none; the project filter then finds every event on the project's tasks.
-- security_invoker, so the audit_events policy still decides who sees what.

create view public.audit_log
with (security_invoker = true) as
select e.id,
       e.occurred_at,
       e.txid,
       e.actor_id,
       e.event_type,
       coalesce(e.project_id, t.project_id) as project_id,
       e.task_id,
       e.subject_user_id,
       e.entity_id,
       e.data
  from public.audit_events e
  left join public.tasks t on t.id = e.task_id;

grant select on public.audit_log to authenticated;
