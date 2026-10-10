-- ==============================================================================
-- INCIDENT RADAR v2 — MIGRATION 003: README CHECKS
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

alter table public.readme_checks enable row level security;
create policy "Allow service role all access on readme_checks" on public.readme_checks for all using (true) with check (true);
