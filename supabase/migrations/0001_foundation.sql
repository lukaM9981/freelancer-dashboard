-- 0001_foundation.sql
-- Internal schema, organization settings, people, invitations, core helpers.

-- `app` holds helpers and trigger functions. It is not in the Data API's
-- exposed schemas, so nothing in it can be called over HTTP.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- New functions are not executable by everyone by default. This has to be the
-- global form: a per-schema default privilege cannot take away the global
-- EXECUTE-to-PUBLIC default. 0010 revokes again after the last function.
alter default privileges revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function app.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- organization_settings: exactly one row
-- ---------------------------------------------------------------------------
create table public.organization_settings (
  id                smallint     primary key default 1 check (id = 1),
  name              text         not null default 'Olifant Digital'
                      check (length(btrim(name)) between 1 and 120),
  time_zone         text         not null default 'Europe/Budapest',
  tolerance_percent numeric(5,2) not null default 10
                      check (tolerance_percent >= 0 and tolerance_percent <= 100),
  default_currency  text         not null default 'EUR'
                      check (default_currency in ('EUR', 'USD')),
  updated_at        timestamptz  not null default now()
);

insert into public.organization_settings (id) values (1);

create trigger organization_settings_set_updated_at
  before update on public.organization_settings
  for each row execute function app.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles: one row per person who accepted an invitation
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid        primary key references auth.users (id) on delete restrict,
  full_name      text        not null check (length(btrim(full_name)) between 1 and 120),
  email          text        not null,
  role           text        not null check (role in ('admin', 'freelancer')),
  status         text        not null default 'active'
                   check (status in ('active', 'deactivated')),
  deactivated_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint profiles_deactivated_has_time
    check ((status = 'deactivated') = (deactivated_at is not null))
);

create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_role_status_idx on public.profiles (role, status);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- invitations: the only way in (there is no public sign-up)
-- ---------------------------------------------------------------------------
create table public.invitations (
  id               uuid        primary key default gen_random_uuid(),
  email            text        not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name        text        not null check (length(btrim(full_name)) between 1 and 120),
  role             text        not null check (role in ('admin', 'freelancer')),
  token_hash       text        not null unique,       -- sha256 of the emailed token, hex
  expires_at       timestamptz not null,
  invited_by       uuid        references public.profiles (id),  -- null only for the bootstrap admin
  accepted_at      timestamptz,
  accepted_user_id uuid        references public.profiles (id),
  revoked_at       timestamptz,
  last_sent_at     timestamptz not null default now(),
  send_count       integer     not null default 1 check (send_count > 0),
  last_send_error  text,
  created_at       timestamptz not null default now(),

  constraint invitations_one_outcome
    check (not (accepted_at is not null and revoked_at is not null)),
  constraint invitations_accepted_has_user
    check ((accepted_at is null) = (accepted_user_id is null))
);

create unique index invitations_pending_email_key
  on public.invitations (lower(email))
  where accepted_at is null and revoked_at is null;
create index invitations_invited_by_idx on public.invitations (invited_by);
create index invitations_accepted_user_idx on public.invitations (accepted_user_id);

-- ---------------------------------------------------------------------------
-- Identity helpers. All access checks go through viewer_id(): it returns the
-- signed-in person only while their profile is active, so a deactivated
-- person's still-valid JWT reaches nothing.
-- ---------------------------------------------------------------------------
create or replace function app.viewer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
    from public.profiles p
   where p.id = (select auth.uid())
     and p.status = 'active';
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = (select auth.uid())
       and p.status = 'active'
       and p.role = 'admin'
  );
$$;

create or replace function app.require_active()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := app.viewer_id();
begin
  if v_id is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

create or replace function app.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  return (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Time zone helpers. Every "date" in the product is an organization-local date.
-- ---------------------------------------------------------------------------
create or replace function app.org_time_zone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.time_zone from public.organization_settings s where s.id = 1;
$$;

create or replace function app.local_date(p_at timestamptz)
returns date
language sql
stable
set search_path = ''
as $$
  select (p_at at time zone app.org_time_zone())::date;
$$;

create or replace function app.org_today()
returns date
language sql
stable
set search_path = ''
as $$
  select app.local_date(now());
$$;

create or replace function app.month_start(p_date date)
returns date
language sql
immutable
set search_path = ''
as $$
  select date_trunc('month', p_date::timestamp)::date;
$$;

-- ---------------------------------------------------------------------------
-- Profile creation. Fires when the invitation flow creates the auth user.
-- Refuses any auth user without a valid invitation, so even an accidentally
-- enabled public sign-up cannot create an account.
-- ---------------------------------------------------------------------------
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations;
begin
  select *
    into v_invitation
    from public.invitations i
   where lower(i.email) = lower(new.email)
     and i.accepted_at is null
     and i.revoked_at is null
     and i.expires_at > now()
     for update;

  if not found then
    raise exception 'no_valid_invitation' using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (new.id, v_invitation.full_name, new.email, v_invitation.role);

  update public.invitations
     set accepted_at = now(),
         accepted_user_id = new.id
   where id = v_invitation.id;

  perform app.log_event(
    'person.activated', null, null, new.id, v_invitation.id,
    jsonb_build_object('role', v_invitation.role)
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
