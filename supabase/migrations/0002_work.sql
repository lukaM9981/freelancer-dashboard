-- 0002_work.sql
-- Projects, membership, tasks, proposals, estimate revisions, extra-hours
-- requests, comments, and links.

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null check (length(btrim(name)) between 1 and 120),
  description       text        not null default '',
  status            text        not null default 'active'
                      check (status in ('active', 'on_hold', 'archived')),
  status_changed_at timestamptz not null default now(),
  created_by        uuid        not null references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index projects_status_idx on public.projects (status);
create index projects_created_by_idx on public.projects (created_by);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function app.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- project_members
-- `role` has a single value today. 'manager' is reserved for the project
-- manager role postponed in PRD §3, so adding it later is a constraint change.
-- ---------------------------------------------------------------------------
create table public.project_members (
  project_id uuid        not null references public.projects (id) on delete restrict,
  user_id    uuid        not null references public.profiles (id) on delete restrict,
  role       text        not null default 'member' check (role in ('member')),
  added_by   uuid        not null references public.profiles (id),
  added_at   timestamptz not null default now(),

  primary key (project_id, user_id)
);

create index project_members_user_idx on public.project_members (user_id);
create index project_members_added_by_idx on public.project_members (added_by);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id                   uuid        primary key default gen_random_uuid(),
  project_id           uuid        not null references public.projects (id) on delete restrict,
  title                text        not null check (length(btrim(title)) between 1 and 200),
  description          text        not null default '',
  status               text        not null default 'draft' check (status in (
                         'draft', 'pending_approval', 'changes_requested', 'approved',
                         'in_progress', 'on_hold', 'done', 'accepted', 'rejected', 'cancelled')),

  assignee_id          uuid        references public.profiles (id),
  assigned_at          timestamptz,                -- start of the assignee's visible history
  created_by           uuid        not null references public.profiles (id),

  -- working estimate, edited by the assignee while Draft or Changes requested
  estimate_min_minutes integer     check (estimate_min_minutes > 0 and estimate_min_minutes % 15 = 0),
  estimate_max_minutes integer     check (estimate_max_minutes > 0 and estimate_max_minutes % 15 = 0),
  estimate_note        text,

  -- set by approval
  approved_revision_id uuid,                       -- FK added below
  first_approved_at    timestamptz,
  first_approved_on    date,                       -- org-local; earliest allowed work date
  limit_minutes        integer     check (limit_minutes > 0),

  -- maintained by app.recount_task()
  counted_minutes      integer     not null default 0 check (counted_minutes >= 0),
  over_limit_minutes   integer     not null default 0 check (over_limit_minutes >= 0),

  ever_submitted       boolean     not null default false,
  status_changed_at    timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint tasks_estimate_order check (
    estimate_min_minutes is null or estimate_max_minutes is null
    or estimate_min_minutes <= estimate_max_minutes),
  constraint tasks_assignment_pair check ((assignee_id is null) = (assigned_at is null)),
  constraint tasks_needs_assignee check (status = 'draft' or assignee_id is not null),
  constraint tasks_working_states_have_limit check (
    status not in ('approved', 'in_progress', 'on_hold', 'done', 'accepted')
    or (limit_minutes is not null and approved_revision_id is not null and first_approved_on is not null))
);

create index tasks_project_status_idx on public.tasks (project_id, status);
create index tasks_assignee_status_idx on public.tasks (assignee_id, status);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_waiting_idx on public.tasks (status_changed_at)
  where status in ('pending_approval', 'done');

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function app.tg_set_updated_at();

-- Backstop for the state machine in PRD §5.1. Command functions perform the
-- transitions; this trigger guarantees nothing else can.
create or replace function app.tg_tasks_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.ever_submitted then
      raise exception 'task_was_submitted' using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    new.assigned_at := case when new.assignee_id is null then null else now() end;
    return new;
  end if;

  if new.status is distinct from old.status then
    if (old.status, new.status) not in (
      ('draft', 'pending_approval'), ('draft', 'cancelled'),
      ('pending_approval', 'approved'), ('pending_approval', 'changes_requested'),
      ('pending_approval', 'rejected'), ('pending_approval', 'draft'),
      ('pending_approval', 'cancelled'),
      ('changes_requested', 'pending_approval'), ('changes_requested', 'draft'),
      ('changes_requested', 'cancelled'),
      ('approved', 'in_progress'), ('approved', 'on_hold'), ('approved', 'draft'),
      ('approved', 'cancelled'),
      ('in_progress', 'on_hold'), ('in_progress', 'done'), ('in_progress', 'cancelled'),
      ('in_progress', 'draft'),   -- reassign after every entry was deleted
      ('on_hold', 'approved'), ('on_hold', 'in_progress'), ('on_hold', 'cancelled'),
      ('on_hold', 'draft'),       -- reassign, only while no time exists
      ('done', 'accepted'), ('done', 'in_progress'), ('done', 'cancelled')
    ) then
      raise exception 'invalid_status_transition'
        using errcode = 'check_violation', detail = old.status || ' -> ' || new.status;
    end if;
    new.status_changed_at := now();
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    new.assigned_at := case when new.assignee_id is null then null else now() end;
  end if;

  return new;
end;
$$;

create trigger tasks_guard
  before insert or update or delete on public.tasks
  for each row execute function app.tg_tasks_guard();

-- ---------------------------------------------------------------------------
-- proposals: the unit of approval (PRD §5.3)
-- ---------------------------------------------------------------------------
create table public.proposals (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references public.projects (id) on delete restrict,
  submitted_by uuid        not null references public.profiles (id),
  submitted_at timestamptz not null default now(),
  completed_at timestamptz                         -- set once no item is pending
);

create index proposals_open_idx on public.proposals (submitted_at) where completed_at is null;
create index proposals_submitter_idx on public.proposals (submitted_by, submitted_at desc);
create index proposals_project_idx on public.proposals (project_id);

-- ---------------------------------------------------------------------------
-- estimate_revisions: every submitted estimate, kept forever (PRD §5.2)
-- ---------------------------------------------------------------------------
create table public.estimate_revisions (
  id               uuid        primary key default gen_random_uuid(),
  task_id          uuid        not null references public.tasks (id) on delete restrict,
  proposal_id      uuid        not null references public.proposals (id) on delete restrict,
  revision_number  integer     not null check (revision_number > 0),
  min_minutes      integer     not null check (min_minutes > 0 and min_minutes % 15 = 0),
  max_minutes      integer     not null check (max_minutes > 0 and max_minutes % 15 = 0),
  note             text,
  submitted_by     uuid        not null references public.profiles (id),
  submitted_at     timestamptz not null default now(),
  decision         text        not null default 'pending' check (decision in (
                     'pending', 'approved', 'rejected', 'changes_requested', 'withdrawn')),
  decided_by       uuid        references public.profiles (id),
  decided_at       timestamptz,
  decision_comment text,

  constraint estimate_revisions_order check (min_minutes <= max_minutes),
  constraint estimate_revisions_number_key unique (task_id, revision_number),
  constraint estimate_revisions_decided check (
    (decision = 'pending') = (decided_at is null)
    and (decision = 'pending') = (decided_by is null)),
  constraint estimate_revisions_comment_required check (
    decision not in ('rejected', 'changes_requested')
    or length(btrim(coalesce(decision_comment, ''))) > 0),
  constraint estimate_revisions_no_self_decision check (
    decision in ('pending', 'withdrawn') or decided_by <> submitted_by)
);

create unique index estimate_revisions_one_pending
  on public.estimate_revisions (task_id) where decision = 'pending';
create index estimate_revisions_proposal_idx on public.estimate_revisions (proposal_id);
create index estimate_revisions_submitter_idx on public.estimate_revisions (submitted_by);
create index estimate_revisions_decider_idx on public.estimate_revisions (decided_by);

alter table public.tasks
  add constraint tasks_approved_revision_fk
  foreign key (approved_revision_id) references public.estimate_revisions (id);
create index tasks_approved_revision_idx on public.tasks (approved_revision_id);

-- ---------------------------------------------------------------------------
-- extra_hours_requests (PRD §5.4, §6.6)
-- ---------------------------------------------------------------------------
create table public.extra_hours_requests (
  id              uuid        primary key default gen_random_uuid(),
  task_id         uuid        not null references public.tasks (id) on delete restrict,
  requested_by    uuid        not null references public.profiles (id),
  minutes         integer     not null check (minutes > 0 and minutes % 15 = 0),
  reason          text        not null check (length(btrim(reason)) between 1 and 2000),
  status          text        not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by      uuid        references public.profiles (id),
  decided_at      timestamptz,
  decision_reason text,
  created_at      timestamptz not null default now(),

  constraint extra_hours_decided check ((status = 'pending') = (decided_at is null)),
  constraint extra_hours_reject_reason check (
    status <> 'rejected' or length(btrim(coalesce(decision_reason, ''))) > 0),
  constraint extra_hours_no_self_decision check (
    status in ('pending', 'cancelled') or decided_by <> requested_by)
);

create unique index extra_hours_one_pending
  on public.extra_hours_requests (task_id) where status = 'pending';
create index extra_hours_task_idx on public.extra_hours_requests (task_id);
create index extra_hours_requester_idx on public.extra_hours_requests (requested_by);
create index extra_hours_decider_idx on public.extra_hours_requests (decided_by);

-- ---------------------------------------------------------------------------
-- task_comments and task_links
-- ---------------------------------------------------------------------------
create table public.task_comments (
  id         uuid        primary key default gen_random_uuid(),
  task_id    uuid        not null references public.tasks (id) on delete cascade,
  author_id  uuid        not null references public.profiles (id),
  kind       text        not null default 'comment' check (kind in ('comment', 'decision')),
  body       text        not null check (length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);

create index task_comments_task_idx on public.task_comments (task_id, created_at);
create index task_comments_author_idx on public.task_comments (author_id);

create table public.task_links (
  id         uuid        primary key default gen_random_uuid(),
  task_id    uuid        not null references public.tasks (id) on delete cascade,
  url        text        not null check (url ~* '^https?://\S+$' and length(url) <= 2000),
  label      text        check (label is null or length(btrim(label)) between 1 and 120),
  created_by uuid        not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index task_links_task_idx on public.task_links (task_id);
create index task_links_created_by_idx on public.task_links (created_by);
