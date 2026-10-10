-- ==============================================================================
-- INCIDENT RADAR v2 — MIGRATION 005: GITHUB, REPOS, COMMITS, CI & DEPLOYS
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
  caused_incident_id text,
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

alter table public.repositories enable row level security;
alter table public.commits enable row level security;
alter table public.ci_runs enable row level security;
alter table public.deployments enable row level security;

create policy "Allow service role all access on repositories" on public.repositories for all using (true) with check (true);
create policy "Allow service role all access on commits" on public.commits for all using (true) with check (true);
create policy "Allow service role all access on ci_runs" on public.ci_runs for all using (true) with check (true);
create policy "Allow service role all access on deployments" on public.deployments for all using (true) with check (true);
