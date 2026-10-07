-- 0010_grants_realtime.sql
-- Command functions are callable by signed-in people only (each one checks
-- roles itself). Outbox functions stay with the service role.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.proname not in ('claim_email_batch', 'complete_email_batch')
  loop
    execute format('revoke execute on function %s from public, anon', f.signature);
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end;
$$;

-- Belt and braces: whatever role ran the earlier migrations, no helper in `app`
-- stays executable except the ones that policies and views call.
revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on function
  app.viewer_id(), app.is_admin(), app.can_see_project(uuid), app.assigned_since(uuid),
  app.org_time_zone(), app.local_date(timestamptz), app.org_today(), app.month_start(date),
  app.ceiling_minutes(integer, numeric)
to authenticated;

-- Realtime: the timer bar on every device, "Tracking now", and the bell.
-- Postgres Changes applies RLS to inserts and updates; neither table is ever
-- deleted from, so no unfiltered delete events exist.
alter publication supabase_realtime add table public.timers, public.notifications;
