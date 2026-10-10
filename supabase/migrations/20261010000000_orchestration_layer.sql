-- ==============================================================================
-- INCIDENT RADAR — ORCHESTRATION & VERIFICATION LAYER
-- Milestone M3: Run Model and Local Test Harness
-- ==============================================================================

-- 1. GLOBAL SETTINGS (Singleton for Kill Switch and Dry Run)
create table if not exists public.settings (
  id text primary key default 'global_settings',
  kill_switch boolean not null default false,
  dry_run boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Initialize settings if empty
insert into public.settings (id, kill_switch, dry_run)
values ('global_settings', false, false)
on conflict (id) do nothing;

-- 2. AGENT RUNS
-- Tracks the lifecycle of a single remediation attempt
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null,
  scenario text, -- e.g., 'autonomous-recovery', 'low-evidence-approval'
  status text not null default 'created'
    check (status in ('created', 'triaging', 'policy_decided', 'executing', 'awaiting_approval', 'verifying', 'resolved', 'escalated', 'failed', 'cancelled')),
  mode text not null default 'LIVE'
    check (mode in ('LIVE', 'DRY_RUN', 'SIMULATION', 'REPLAY')),

  -- Policy/Triage Data
  policy_version text,
  rule_ids text[], -- IDs of the rules that triggered the decision
  decision text check (decision in ('ACT', 'ASK', 'NOTIFY', null)),
  triage_json jsonb, -- Store the structured output from the Genie

  -- Execution Tracking
  workato_job_id text,
  idempotency_key text not null unique,
  outcome text,
  receipt_hash text,

  start_time timestamptz not null default now(),
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. AGENT STEPS
-- Idempotent log of every transition in the run
create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  step_key text not null, -- e.g., 'workato.started', 'policy.decided', 'action.executed'
  actor text not null, -- e.g., 'system', 'workato', 'user:admin'
  action text not null,
  status text not null,
  reason text,
  summary jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now(),

  -- Ensure (run_id, step_key) is unique for idempotency
  unique (run_id, step_key)
);

-- 4. ACTION EXECUTIONS
-- Detailed audit of modifying actions
create table if not exists public.action_executions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  action_type text not null, -- e.g., 'rollback_latest_deploy'
  role text not null check (role in ('primary', 'fallback')),
  idempotency_key text not null unique,
  status text not null default 'authorized'
    check (status in ('authorized', 'executing', 'succeeded', 'failed', 'blocked', 'simulated')),

  auth_snapshot jsonb, -- Copy of policy/approval at moment of execution
  result text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  created_at timestamptz not null default now()
);

-- 5. APPROVALS
-- Human-in-the-loop management
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

  -- Ensure decisions are single-use via application logic;
  -- here we just store the result.
  created_at timestamptz not null default now()
);

-- 6. RECOVERY SAMPLES
-- Telemetry used by the verifier to prove recovery
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

-- ==============================================================================
-- INDEXES
-- ==============================================================================
create index if not exists idx_runs_incident on public.agent_runs (incident_id);
create index if not exists idx_runs_status on public.agent_runs (status);
create index if not exists idx_steps_run on public.agent_steps (run_id);
create index if not exists idx_executions_run on public.action_executions (run_id);
create index if not exists idx_approvals_run on public.approvals (run_id);
create index if not exists idx_samples_run on public.recovery_samples (run_id);

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================
alter table public.settings enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;
alter table public.action_executions enable row level security;
alter table public.approvals enable row level security;
alter table public.recovery_samples enable row level security;

-- Default: Public read, server-only write (via service role)
create policy "Allow public read on settings" on public.settings for select using (true);
create policy "Allow public read on runs" on public.agent_runs for select using (true);
create policy "Allow public read on steps" on public.agent_steps for select using (true);
create policy "Allow public read on executions" on public.action_executions for select using (true);
create policy "Allow public read on approvals" on public.approvals for select using (true);
create policy "Allow public read on samples" on public.recovery_samples for select using (true);
