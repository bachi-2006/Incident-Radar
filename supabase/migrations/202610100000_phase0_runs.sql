-- ==============================================================================
-- INCIDENT RADAR v2 — MIGRATION 000: RUNS & AUDIT LOG
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

-- RLS Enablement
alter table public.runs enable row level security;
alter table public.audit_log enable row level security;

-- Open policies for early phases / service role access
drop policy if exists "Allow service role all access on runs" on public.runs;
create policy "Allow service role all access on runs" on public.runs for all using (true) with check (true);

drop policy if exists "Allow service role all access on audit_log" on public.audit_log;
create policy "Allow service role all access on audit_log" on public.audit_log for all using (true) with check (true);
