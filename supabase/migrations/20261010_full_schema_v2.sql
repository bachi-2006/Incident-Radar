-- ==============================================================================
-- INCIDENT RADAR v2 — COMPLETE SCHEMA & SEED MIGRATION
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/xaqorfvcgowdhnyrtiig/sql)
-- Safe & Idempotent (Uses IF NOT EXISTS and ON CONFLICT DO NOTHING / UPDATE)
-- ==============================================================================

create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. ENUMS
-- ==============================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type org_role as enum ('member', 'admin', 'owner');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_role') then
    create type project_role as enum ('viewer', 'responder', 'maintainer');
  end if;
end $$;

-- ==============================================================================
-- 2. BASE INCIDENT RADAR TABLES (If not already present)
-- ==============================================================================
create table if not exists public.incidents (
  id text primary key,
  title text not null,
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  confidence double precision not null default 0 check (confidence >= 0 and confidence <= 100),
  status text not null default 'active' check (status in ('active', 'investigating', 'resolved', 'mitigated')),
  service text not null,
  description text,
  root_cause text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  correlated_count integer not null default 0,
  affected_services text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key,
  incident_id text references public.incidents(id) on delete set null,
  service text not null,
  source text not null,
  event_type text not null,
  message text not null,
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  timestamp timestamptz not null default now(),
  metric text,
  value double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.event_relationships (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null references public.incidents(id) on delete cascade,
  from_event_id text not null,
  to_event_id text not null,
  relationship_type text not null default 'PRECEDES' check (relationship_type in ('PRECEDES', 'CAUSES', 'CORRELATES_WITH', 'BLOCKS')),
  confidence double precision not null default 1.0,
  description text,
  created_at timestamptz not null default now(),
  unique (incident_id, from_event_id, to_event_id, relationship_type)
);

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null,
  severity text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  incident_id text references public.incidents(id) on delete cascade,
  model text not null,
  analysis_type text not null,
  summary text,
  recommendations jsonb default '[]'::jsonb,
  raw_response jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 3. RUNS & AUDIT LOG (Phase 0)
-- ==============================================================================
create table if not exists public.runs (
  id text primary key,
  project_id text,
  incident_id text references public.incidents(id) on delete set null,
  scenario text,
  decision text,
  rule_id text,
  status text not null default 'running',
  required_role text,
  approval_token_hash text,
  approved_by text,
  verify_samples jsonb not null default '[]'::jsonb,
  receipt_sha256 text,
  poll_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigserial primary key,
  project_id text,
  actor text not null,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_runs_status on public.runs(status);
create index if not exists idx_runs_updated_at on public.runs(updated_at desc);
create index if not exists idx_audit_log_target on public.audit_log(target, created_at desc);

-- ==============================================================================
-- 4. ORCHESTRATION & AGENT EXECUTION LAYER
-- ==============================================================================
create table if not exists public.settings (
  id text primary key default 'global_settings',
  kill_switch boolean not null default false,
  dry_run boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.settings (id, kill_switch, dry_run)
values ('global_settings', false, false)
on conflict (id) do nothing;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null references public.incidents(id) on delete cascade,
  scenario text,
  status text not null default 'created'
    check (status in ('created', 'triaging', 'policy_decided', 'executing', 'awaiting_approval', 'verifying', 'resolved', 'escalated', 'failed', 'cancelled')),
  mode text not null default 'LIVE'
    check (mode in ('LIVE', 'DRY_RUN', 'SIMULATION', 'REPLAY')),
  policy_version text,
  rule_ids text[],
  decision text check (decision in ('ACT', 'ASK', 'NOTIFY', null)),
  triage_json jsonb,
  workato_job_id text,
  idempotency_key text not null unique,
  outcome text,
  receipt_hash text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  step_key text not null,
  actor text not null,
  action text not null,
  status text not null,
  reason text,
  summary jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now(),
  unique (run_id, step_key)
);

create table if not exists public.action_executions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  action_type text not null,
  role text not null check (role in ('primary', 'fallback')),
  idempotency_key text not null unique,
  status text not null default 'authorized'
    check (status in ('authorized', 'executing', 'succeeded', 'failed', 'blocked', 'simulated')),
  auth_snapshot jsonb,
  result text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  action_type text not null,
  summary text,
  evidence_ids text[],
  policy_version text,
  request_time timestamptz not null default now(),
  expiry_time timestamptz not null,
  decision_time timestamptz,
  decision text check (decision in ('approved', 'rejected', null)),
  approver_identity text,
  created_at timestamptz not null default now()
);

create table if not exists public.recovery_samples (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  sequence_number integer not null,
  timestamp timestamptz not null default now(),
  error_rate double precision not null,
  p95_latency double precision not null,
  health_status text not null check (health_status in ('healthy', 'unhealthy', 'unknown')),
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_runs_incident on public.agent_runs (incident_id);
create index if not exists idx_runs_agent_status on public.agent_runs (status);
create index if not exists idx_steps_run on public.agent_steps (run_id);
create index if not exists idx_executions_run on public.action_executions (run_id);
create index if not exists idx_approvals_run on public.approvals (run_id);
create index if not exists idx_samples_run on public.recovery_samples (run_id);

-- ==============================================================================
-- 5. WORKSPACES, PROFILES & TEAMS
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  github_login text unique,
  github_id bigint unique,
  display_name text,
  avatar_url text,
  slack_user_id text unique,
  timezone text not null default 'Asia/Kolkata',
  work_start smallint not null default 9,
  work_end smallint not null default 19,
  out_of_office boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  github_org_login text,
  github_installation_id bigint unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role org_role not null default 'member',
  primary key (org_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  website_url text,
  slack_channel_id text,
  ingest_key text unique not null default encode(gen_random_bytes(16), 'hex'),
  allowed_origins text[] not null default '{}',
  lead_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role project_role not null default 'viewer',
  on_call boolean not null default false,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  github_login text,
  email text,
  org_role org_role not null default 'member',
  project_roles jsonb not null default '[]'::jsonb,
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);

create table if not exists public.issue_categories (
  key text primary key,
  label text not null,
  path_patterns text[] not null default '{}',
  signal_rules jsonb not null default '{}'::jsonb
);

create table if not exists public.member_expertise (
  user_id uuid references public.profiles(id) on delete cascade,
  category text references public.issue_categories(key),
  level smallint not null check (level between 0 and 5),
  primary key (user_id, category)
);

-- ==============================================================================
-- 6. GITHUB, REPOSITORIES, COMMITS & DEPLOYS
-- ==============================================================================
create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null default 'github',
  full_name text not null,
  default_branch text not null default 'main',
  github_repo_id bigint unique,
  unique (provider, full_name)
);

create table if not exists public.commits (
  sha text primary key,
  repository_id uuid references public.repositories(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  author_login text,
  message text,
  committed_at timestamptz not null,
  files jsonb not null default '[]'::jsonb,
  symbols text[] not null default '{}',
  patch_excerpt text,
  risk_score double precision,
  caused_incident_id text references public.incidents(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ci_runs (
  id bigint primary key,
  project_id uuid references public.projects(id) on delete cascade,
  repository_id uuid references public.repositories(id) on delete cascade,
  head_sha text,
  branch text,
  workflow_name text,
  status text,
  conclusion text,
  started_at timestamptz,
  completed_at timestamptz,
  html_url text
);

create table if not exists public.deployments (
  id bigint primary key,
  project_id uuid references public.projects(id) on delete cascade,
  sha text,
  environment text,
  state text,
  created_at timestamptz not null,
  updated_at timestamptz,
  previous_good_sha text
);

create index if not exists idx_commits_project_date on public.commits(project_id, committed_at desc);
create index if not exists idx_ci_runs_project_date on public.ci_runs(project_id, completed_at desc);
create index if not exists idx_deployments_project_date on public.deployments(project_id, created_at desc);

-- ==============================================================================
-- 7. README QUALITY CHECKS
-- ==============================================================================
create table if not exists public.readme_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  repository_id uuid references public.repositories(id) on delete cascade,
  commit_sha text,
  trigger text not null default 'manual',
  readme_path text default 'README.md',
  readme_sha256 text,
  structural jsonb not null default '{}'::jsonb,
  repo_facts jsonb not null default '{}'::jsonb,
  semantic jsonb,
  verdict text not null default 'pending',
  score double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_readme_checks_project_created on public.readme_checks(project_id, created_at desc);

-- ==============================================================================
-- 8. ASSIGNMENT, CLASSIFICATION, SLA & REMINDERS
-- ==============================================================================
create table if not exists public.project_category_owners (
  project_id uuid references public.projects(id) on delete cascade,
  category text references public.issue_categories(key),
  rank smallint not null default 1,
  user_id uuid references public.profiles(id),
  confidence double precision,
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  primary key (project_id, category, rank)
);

create table if not exists public.issue_classifications (
  incident_id text primary key references public.incidents(id) on delete cascade,
  category text not null references public.issue_categories(key),
  secondary_category text references public.issue_categories(key),
  category_confidence double precision not null,
  probabilities jsonb not null,
  rule_scores jsonb not null,
  genie_probabilities jsonb,
  rationale text,
  computed_at timestamptz not null default now()
);

create table if not exists public.sla_policies (
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null,
  ack_minutes int not null,
  resolve_minutes int not null,
  business_hours boolean not null default false,
  primary key (project_id, kind)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null default 'incident' check (kind in ('incident', 'readme_fix', 'project_ownership')),
  incident_id text references public.incidents(id) on delete cascade,
  category text references public.issue_categories(key),
  role_in_assignment text not null default 'primary',
  assignee_id uuid references public.profiles(id),
  confidence double precision,
  breakdown jsonb not null default '{}'::jsonb,
  candidates jsonb not null default '[]'::jsonb,
  decision text not null,
  status text not null default 'proposed',
  ack_due_at timestamptz,
  due_at timestamptz,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  on_time boolean,
  extension_count smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id bigserial primary key,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  kind text not null,
  due_at timestamptz not null,
  sent_at timestamptz,
  channel text,
  slack_ts text,
  unique (assignment_id, kind)
);

create index if not exists idx_assignments_assignee_status on public.assignments(assignee_id, status);
create index if not exists idx_assignments_status_due on public.assignments(status, due_at);
create index if not exists idx_reminders_sent_due on public.reminders(sent_at, due_at);

-- ==============================================================================
-- 9. SYNTHETIC MONITORS & PROBE RESULTS
-- ==============================================================================
create table if not exists public.monitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  url text not null,
  method text not null default 'GET',
  expected_status int not null default 200,
  must_contain text,
  must_not_contain text,
  timeout_ms int not null default 10000,
  interval_min int not null default 15,
  enabled boolean not null default true,
  last_run_at timestamptz
);

create table if not exists public.probe_results (
  id bigserial primary key,
  monitor_id uuid references public.monitors(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  checked_at timestamptz not null default now(),
  ok boolean not null,
  status_code int,
  latency_ms int,
  failure_reason text,
  cold_start boolean not null default false,
  run_id text
);

create table if not exists public.hourly_stats (
  project_id uuid references public.projects(id) on delete cascade,
  hour timestamptz not null,
  uptime_pct double precision,
  p95_latency_ms double precision,
  probe_count int,
  probe_failures int,
  client_error_count int,
  new_fingerprints int,
  ci_runs int,
  ci_pass_rate double precision,
  ci_avg_duration_s double precision,
  deploys int,
  failed_deploys int,
  incidents_opened int,
  incidents_resolved int,
  mttr_minutes double precision,
  assignments_overdue int,
  computed_at timestamptz not null default now(),
  primary key (project_id, hour)
);

create index if not exists idx_probe_results_project_checked on public.probe_results(project_id, checked_at desc);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.runs enable row level security;
alter table public.audit_log enable row level security;
alter table public.settings enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;
alter table public.action_executions enable row level security;
alter table public.approvals enable row level security;
alter table public.recovery_samples enable row level security;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invitations enable row level security;
alter table public.issue_categories enable row level security;
alter table public.member_expertise enable row level security;
alter table public.repositories enable row level security;
alter table public.commits enable row level security;
alter table public.ci_runs enable row level security;
alter table public.deployments enable row level security;
alter table public.readme_checks enable row level security;
alter table public.project_category_owners enable row level security;
alter table public.issue_classifications enable row level security;
alter table public.sla_policies enable row level security;
alter table public.assignments enable row level security;
alter table public.reminders enable row level security;
alter table public.monitors enable row level security;
alter table public.probe_results enable row level security;
alter table public.hourly_stats enable row level security;

-- Drop and recreate service-role policies to allow full backend access
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop policy if exists "Allow service role all access on %I" on public.%I;', t, t);
    execute format('create policy "Allow service role all access on %I" on public.%I for all using (true) with check (true);', t, t);
  end loop;
end $$;

-- Public read policies for dashboard and client access
create policy "Allow public read on settings" on public.settings for select using (true);
create policy "Allow public read on agent_runs" on public.agent_runs for select using (true);
create policy "Allow public read on agent_steps" on public.agent_steps for select using (true);
create policy "Allow public read on action_executions" on public.action_executions for select using (true);
create policy "Allow public read on approvals" on public.approvals for select using (true);
create policy "Allow public read on recovery_samples" on public.recovery_samples for select using (true);
create policy "Allow public read on profiles" on public.profiles for select using (true);
create policy "Allow public read on projects" on public.projects for select using (true);
create policy "Allow public read on issue_categories" on public.issue_categories for select using (true);
create policy "Allow public read on assignments" on public.assignments for select using (true);

-- ==============================================================================
-- 11. SEED DATA & TEAMS SETUP
-- ==============================================================================

-- Categories
insert into public.issue_categories (key, label, path_patterns) values
  ('system_architecture', 'System Architecture', array['infra/**', 'cluster/**']),
  ('frontend', 'Frontend', array['src/components/**', 'src/app/**/page.tsx', '**/*.css', 'public/**']),
  ('backend', 'Backend', array['src/app/api/**', 'src/lib/**', 'server/**', '**/*.java', '**/*.py']),
  ('database', 'Database', array['supabase/**', '**/*.sql', '**/migrations/**']),
  ('devops', 'DevOps', array['.github/workflows/**', 'Dockerfile', 'render.yaml', 'infra/**', '**/*.tf']),
  ('security', 'Security', array['**/auth/**', 'middleware.ts'])
on conflict (key) do nothing;

-- Workspace & Project
insert into public.organizations (id, slug, name)
values ('00000000-0000-0000-0000-000000000001', 'xyz', 'XYZ Corporation')
on conflict (id) do nothing;

insert into public.projects (id, org_id, slug, name, ingest_key, allowed_origins)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'demo',
  'Incident Radar Production',
  'ik_demo_default_dev',
  array['https://incident-radar-live.web.app', 'https://incident-radar-live.firebaseapp.com', 'https://incident-radar.onrender.com', 'http://localhost:3000']
)
on conflict (id) do update set
  allowed_origins = excluded.allowed_origins;

-- SLA Policies
insert into public.sla_policies (project_id, kind, ack_minutes, resolve_minutes, business_hours) values
  ('00000000-0000-0000-0000-000000000002', 'incident_critical', 15, 240, false),
  ('00000000-0000-0000-0000-000000000002', 'incident_high', 30, 1440, false),
  ('00000000-0000-0000-0000-000000000002', 'incident_medium', 240, 4320, true),
  ('00000000-0000-0000-0000-000000000002', 'incident_low', 1440, 10080, true),
  ('00000000-0000-0000-0000-000000000002', 'readme_fix', 1440, 4320, true)
on conflict (project_id, kind) do nothing;

-- Team Profiles
insert into public.profiles (id, github_login, display_name, slack_user_id, timezone, work_start, work_end, out_of_office)
values
  ('11111111-1111-1111-1111-111111111111', 'rohith-admin', 'Rohith D (Admin / Project Lead)', 'U01ROHITHADMIN', 'Asia/Kolkata', 9, 19, false),
  ('22222222-2222-2222-2222-222222222222', 'dachepally-frontend', 'Dachepally (Frontend Developer)', 'U02DACHEPALLY', 'Asia/Kolkata', 9, 19, false),
  ('33333333-3333-3333-3333-333333333333', 'nithish-system-designer', 'Nithish (System Designer)', 'U03NITHISHSYS', 'Asia/Kolkata', 9, 19, false),
  ('44444444-4444-4444-4444-444444444444', 'rahul-backend', 'Rahul Verma (Backend Specialist)', 'U04RAHULBACK', 'Asia/Kolkata', 9, 19, false),
  ('55555555-5555-5555-5555-555555555555', 'sam-devops', 'Sam Taylor (DevOps Specialist)', 'U05SAMDEVOPS', 'Asia/Kolkata', 9, 19, false)
on conflict (id) do update set
  display_name = excluded.display_name,
  slack_user_id = excluded.slack_user_id;

-- Project Members
insert into public.project_members (project_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'maintainer'),
  ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'responder'),
  ('00000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'responder'),
  ('00000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'responder'),
  ('00000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'responder')
on conflict (project_id, user_id) do update set
  role = excluded.role;

-- Member Expertise Matrix
insert into public.member_expertise (user_id, category, level)
values
  -- Rohith D (Admin / Project Lead)
  ('11111111-1111-1111-1111-111111111111', 'system_architecture', 5),
  ('11111111-1111-1111-1111-111111111111', 'backend', 4),
  ('11111111-1111-1111-1111-111111111111', 'devops', 5),
  ('11111111-1111-1111-1111-111111111111', 'security', 5),
  -- Dachepally (Frontend Developer)
  ('22222222-2222-2222-2222-222222222222', 'frontend', 5),
  ('22222222-2222-2222-2222-222222222222', 'security', 3),
  -- Nithish (System Designer)
  ('33333333-3333-3333-3333-333333333333', 'system_architecture', 5),
  ('33333333-3333-3333-3333-333333333333', 'backend', 4),
  ('33333333-3333-3333-3333-333333333333', 'database', 4),
  -- Rahul Verma (Backend Specialist)
  ('44444444-4444-4444-4444-444444444444', 'backend', 5),
  ('44444444-4444-4444-4444-444444444444', 'database', 4),
  -- Sam Taylor (DevOps Specialist)
  ('55555555-5555-5555-5555-555555555555', 'devops', 5),
  ('55555555-5555-5555-5555-555555555555', 'system_architecture', 4)
on conflict (user_id, category) do update set
  level = excluded.level;

-- Seed Repositories
insert into public.repositories (id, project_id, provider, full_name, default_branch)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'github',
  'bachi-2006/Incident-Radar',
  'main'
)
on conflict (provider, full_name) do nothing;
