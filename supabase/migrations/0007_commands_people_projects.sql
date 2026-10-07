-- 0007_commands_people_projects.sql
-- Command helpers, then commands for people, invitations, rates, settings,
-- projects, and membership.
--
-- Every command is SECURITY DEFINER with an empty search_path, starts by
-- resolving the caller (app.require_active / app.require_admin), checks every
-- rule itself, and logs one or more history events. Errors are raised with a
-- stable machine-readable message (Tech.md §12 maps them to UI text).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function app.lock_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  -- A task the caller may not see does not exist, as far as they can tell.
  if not found or not (app.is_admin() or v_task.assignee_id = app.viewer_id()) then
    raise exception 'task_not_found' using errcode = 'P0002';
  end if;
  -- Everything in an archived project is read-only (PRD §6.3).
  if (select p.status from public.projects p where p.id = v_task.project_id) = 'archived' then
    raise exception 'project_archived' using errcode = 'check_violation';
  end if;
  return v_task;
end;
$$;

create or replace function app.get_project(p_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;
  return v_project;
end;
$$;

create or replace function app.is_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.project_members m
                  where m.project_id = p_project_id and m.user_id = p_user_id);
$$;

create or replace function app.require_task_status(p_task public.tasks, variadic p_allowed text[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not (p_task.status = any(p_allowed)) then
    raise exception 'invalid_task_status' using errcode = 'check_violation', detail = p_task.status;
  end if;
end;
$$;

create or replace function app.require_assignee(p_task public.tasks, p_actor uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_task.assignee_id is distinct from p_actor then
    raise exception 'not_task_assignee' using errcode = '42501';
  end if;
end;
$$;

-- Admin acting on a task: never on a task assigned to themselves (PRD §4).
create or replace function app.require_not_own_task(p_task public.tasks, p_actor uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_task.assignee_id = p_actor then
    raise exception 'self_approval_not_allowed' using errcode = '42501';
  end if;
end;
$$;

create or replace function app.require_project_not_archived(p_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects := app.get_project(p_project_id);
begin
  if v_project.status = 'archived' then
    raise exception 'project_archived' using errcode = 'check_violation';
  end if;
  return v_project;
end;
$$;

-- Locks every active Admin row before counting, so two Admins demoting or
-- deactivating each other at the same moment cannot both pass.
create or replace function app.active_admin_count()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform 1 from public.profiles where role = 'admin' and status = 'active' for update;
  select count(*)::integer into v_count
    from public.profiles where role = 'admin' and status = 'active';
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitations (PRD §6.1). The server generates the token, emails it, and
-- passes only its sha256 hash here.
-- ---------------------------------------------------------------------------
create or replace function public.create_invitation(
  p_email      text,
  p_full_name  text,
  p_role       text,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_id    uuid;
begin
  if exists (select 1 from public.profiles p where lower(p.email) = lower(btrim(p_email))) then
    raise exception 'person_exists' using errcode = 'unique_violation';
  end if;
  if exists (select 1 from public.invitations i
              where lower(i.email) = lower(btrim(p_email))
                and i.accepted_at is null and i.revoked_at is null) then
    raise exception 'invitation_pending' using errcode = 'unique_violation';
  end if;

  insert into public.invitations (email, full_name, role, token_hash, expires_at, invited_by)
  values (btrim(p_email), btrim(p_full_name), p_role, p_token_hash, now() + interval '7 days', v_actor)
  returning id into v_id;

  perform app.log_event('person.invited', null, null, null, v_id,
    jsonb_build_object('email', btrim(p_email), 'role', p_role));
  return v_id;
end;
$$;

create or replace function public.renew_invitation(p_invitation_id uuid, p_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
begin
  update public.invitations
     set token_hash = p_token_hash,
         expires_at = now() + interval '7 days',
         last_sent_at = now(),
         send_count = send_count + 1,
         last_send_error = null
   where id = p_invitation_id
     and accepted_at is null
     and revoked_at is null;
  if not found then
    raise exception 'invitation_not_pending' using errcode = 'check_violation';
  end if;
  perform app.log_event('invitation.resent', null, null, null, p_invitation_id, '{}'::jsonb);
end;
$$;

create or replace function public.record_invitation_send_error(p_invitation_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
begin
  update public.invitations set last_send_error = left(p_error, 1000) where id = p_invitation_id;
end;
$$;

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
begin
  update public.invitations
     set revoked_at = now()
   where id = p_invitation_id and accepted_at is null and revoked_at is null;
  if not found then
    raise exception 'invitation_not_pending' using errcode = 'check_violation';
  end if;
  perform app.log_event('invitation.revoked', null, null, null, p_invitation_id, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- People (PRD §6.2)
-- ---------------------------------------------------------------------------
create or replace function public.update_my_profile(p_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
begin
  update public.profiles set full_name = btrim(p_full_name) where id = v_actor;
  perform app.log_event('person.updated', null, null, v_actor, v_actor,
    jsonb_build_object('full_name', btrim(p_full_name)));
end;
$$;

create or replace function public.set_person_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor  uuid := app.require_admin();
  v_person public.profiles;
begin
  select * into v_person from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'person_not_found' using errcode = 'P0002';
  end if;
  if v_person.role = p_role then
    return;
  end if;
  if v_person.role = 'admin' and v_person.status = 'active' and app.active_admin_count() <= 1 then
    raise exception 'last_admin' using errcode = 'check_violation';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  perform app.log_event('person.role_changed', null, null, p_user_id, p_user_id,
    jsonb_build_object('from', v_person.role, 'to', p_role));
end;
$$;

create or replace function public.deactivate_person(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor  uuid := app.require_admin();
  v_person public.profiles;
begin
  select * into v_person from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'person_not_found' using errcode = 'P0002';
  end if;
  if v_person.status = 'deactivated' then
    return;
  end if;
  if v_person.role = 'admin' and app.active_admin_count() <= 1 then
    raise exception 'last_admin' using errcode = 'check_violation';
  end if;

  perform app.auto_stop_timers('person deactivated', p_user_id => p_user_id);

  update public.profiles
     set status = 'deactivated', deactivated_at = now()
   where id = p_user_id;
  perform app.log_event('person.deactivated', null, null, p_user_id, p_user_id, '{}'::jsonb);
end;
$$;

create or replace function public.reactivate_person(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
begin
  update public.profiles
     set status = 'active', deactivated_at = null
   where id = p_user_id and status = 'deactivated';
  if found then
    perform app.log_event('person.reactivated', null, null, p_user_id, p_user_id, '{}'::jsonb);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rates (PRD §5.7, §6.2)
-- ---------------------------------------------------------------------------
create or replace function public.add_rate(
  p_user_id        uuid,
  p_hourly_rate    numeric,
  p_currency       text,
  p_effective_from date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_id    uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'person_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.month_closures c
              where p_effective_from < (c.month + interval '1 month')::date) then
    raise exception 'rate_in_closed_month' using errcode = 'check_violation';
  end if;

  insert into public.rates (user_id, hourly_rate, currency, effective_from, created_by)
  values (p_user_id, p_hourly_rate, p_currency, p_effective_from, v_actor)
  returning id into v_id;

  perform app.log_event('rate.added', null, null, p_user_id, v_id,
    jsonb_build_object('hourly_rate', p_hourly_rate, 'currency', p_currency,
                       'effective_from', p_effective_from));
  return v_id;
end;
$$;

create or replace function public.delete_rate(p_rate_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_rate  public.rates;
begin
  select * into v_rate from public.rates where id = p_rate_id for update;
  if not found then
    raise exception 'rate_not_found' using errcode = 'P0002';
  end if;
  if v_rate.effective_from <= app.org_today() then
    raise exception 'rate_not_deletable' using errcode = 'check_violation';
  end if;

  delete from public.rates where id = p_rate_id;
  perform app.log_event('rate.deleted', null, null, v_rate.user_id, p_rate_id,
    jsonb_build_object('hourly_rate', v_rate.hourly_rate, 'currency', v_rate.currency,
                       'effective_from', v_rate.effective_from));
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings (PRD §6.14). A tolerance change recounts every task that has time
-- in an open month.
-- ---------------------------------------------------------------------------
create or replace function public.update_settings(
  p_name              text,
  p_time_zone         text,
  p_tolerance_percent numeric,
  p_default_currency  text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_old   public.organization_settings;
  v_task  uuid;
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p_time_zone) then
    raise exception 'invalid_time_zone' using errcode = 'check_violation';
  end if;

  select * into v_old from public.organization_settings where id = 1 for update;

  update public.organization_settings
     set name = btrim(p_name),
         time_zone = p_time_zone,
         tolerance_percent = p_tolerance_percent,
         default_currency = p_default_currency
   where id = 1;

  if v_old.tolerance_percent <> p_tolerance_percent then
    for v_task in
      select distinct e.task_id
        from public.time_entries e
       where not exists (select 1 from public.month_closures c where c.month = e.month)
    loop
      perform app.recount_task(v_task);
    end loop;
  end if;

  perform app.log_event('settings.changed', null, null, null, null,
    jsonb_build_object('from', to_jsonb(v_old) - 'updated_at',
                       'to', jsonb_build_object('name', btrim(p_name), 'time_zone', p_time_zone,
                                                'tolerance_percent', p_tolerance_percent,
                                                'default_currency', p_default_currency)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Projects and membership (PRD §6.3)
-- ---------------------------------------------------------------------------
create or replace function public.create_project(p_name text, p_description text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_id    uuid;
begin
  insert into public.projects (name, description, created_by)
  values (btrim(p_name), coalesce(p_description, ''), v_actor)
  returning id into v_id;

  perform app.log_event('project.created', null, v_id, null, v_id,
    jsonb_build_object('name', btrim(p_name)));
  return v_id;
end;
$$;

create or replace function public.update_project(p_project_id uuid, p_name text, p_description text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
  v_old   public.projects := app.require_project_not_archived(p_project_id);
begin
  update public.projects
     set name = btrim(p_name), description = coalesce(p_description, '')
   where id = p_project_id;

  perform app.log_event('project.updated', null, p_project_id, null, p_project_id,
    jsonb_build_object('from', jsonb_build_object('name', v_old.name, 'description', v_old.description),
                       'to', jsonb_build_object('name', btrim(p_name), 'description', p_description)));
end;
$$;

create or replace function public.set_project_status(p_project_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := app.require_admin();
  v_project public.projects;
begin
  select * into v_project from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;
  if v_project.status = p_status then
    return;
  end if;

  if p_status = 'archived' and exists (
       select 1 from public.tasks t
        where t.project_id = p_project_id
          and t.status not in ('accepted', 'rejected', 'cancelled')
          and not (t.status = 'draft' and not t.ever_submitted)) then
    raise exception 'project_has_open_tasks' using errcode = 'check_violation';
  end if;

  if p_status = 'on_hold' then
    perform app.auto_stop_timers('project put on hold', p_project_id => p_project_id);
  end if;

  update public.projects
     set status = p_status, status_changed_at = now()
   where id = p_project_id;

  perform app.log_event('project.status_changed', null, p_project_id, null, p_project_id,
    jsonb_build_object('from', v_project.status, 'to', p_status));
end;
$$;

create or replace function public.add_project_member(p_project_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := app.require_admin();
  v_project public.projects := app.require_project_not_archived(p_project_id);
begin
  if not exists (select 1 from public.profiles where id = p_user_id and status = 'active') then
    raise exception 'person_not_active' using errcode = 'check_violation';
  end if;

  insert into public.project_members (project_id, user_id, added_by)
  values (p_project_id, p_user_id, v_actor)
  on conflict do nothing;

  if found then
    perform app.log_event('member.added', null, p_project_id, p_user_id, p_project_id, '{}'::jsonb);
  end if;
end;
$$;

create or replace function public.remove_project_member(p_project_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_admin();
begin
  if exists (select 1 from public.tasks t
              where t.project_id = p_project_id
                and t.assignee_id = p_user_id
                and t.status not in ('accepted', 'rejected', 'cancelled')) then
    raise exception 'member_has_open_tasks' using errcode = 'check_violation';
  end if;

  delete from public.project_members where project_id = p_project_id and user_id = p_user_id;
  if found then
    perform app.log_event('member.removed', null, p_project_id, p_user_id, p_project_id, '{}'::jsonb);
  end if;
end;
$$;
