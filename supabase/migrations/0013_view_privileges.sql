-- 0013_view_privileges.sql
-- 0005 revoked the project's default privileges before 0006 and 0012 created the views,
-- so anon and authenticated kept every privilege on them. Nothing leaked (the views are
-- security_invoker and none is updatable), but DB.md §7.2 says anon has nothing and
-- authenticated only reads. The pgTAP isolation checks hold every view to that.

revoke all on public.task_progress, public.report_lines, public.approval_queue, public.audit_log
  from anon, authenticated;

grant select on public.task_progress, public.report_lines, public.approval_queue, public.audit_log
  to authenticated;
