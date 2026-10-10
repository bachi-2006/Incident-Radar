-- ==============================================================================
-- INCIDENT RADAR v2 — MIGRATION 004: MONITORS, PROBE RESULTS & HOURLY STATS
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

alter table public.monitors enable row level security;
alter table public.probe_results enable row level security;
alter table public.hourly_stats enable row level security;

create policy "Allow service role all access on monitors" on public.monitors for all using (true) with check (true);
create policy "Allow service role all access on probe_results" on public.probe_results for all using (true) with check (true);
create policy "Allow service role all access on hourly_stats" on public.hourly_stats for all using (true) with check (true);
