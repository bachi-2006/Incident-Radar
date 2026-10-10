-- ==============================================================================
-- INCIDENT RADAR v2 — MIGRATION 002: ASSIGNMENT, CLASSIFICATION, SLA & REMINDERS
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
  incident_id text primary key,
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

-- Seed default SLA policy for demo project
insert into public.sla_policies (project_id, kind, ack_minutes, resolve_minutes, business_hours) values
  ('00000000-0000-0000-0000-000000000002', 'incident_critical', 15, 240, false),
  ('00000000-0000-0000-0000-000000000002', 'incident_high', 30, 1440, false),
  ('00000000-0000-0000-0000-000000000002', 'incident_medium', 240, 4320, true),
  ('00000000-0000-0000-0000-000000000002', 'incident_low', 1440, 10080, true),
  ('00000000-0000-0000-0000-000000000002', 'readme_fix', 1440, 4320, true)
on conflict do nothing;

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null default 'incident' check (kind in ('incident', 'readme_fix', 'project_ownership')),
  incident_id text,
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

alter table public.project_category_owners enable row level security;
alter table public.issue_classifications enable row level security;
alter table public.sla_policies enable row level security;
alter table public.assignments enable row level security;
alter table public.reminders enable row level security;

create policy "Allow service role all access on project_category_owners" on public.project_category_owners for all using (true) with check (true);
create policy "Allow service role all access on issue_classifications" on public.issue_classifications for all using (true) with check (true);
create policy "Allow service role all access on sla_policies" on public.sla_policies for all using (true) with check (true);
create policy "Allow service role all access on assignments" on public.assignments for all using (true) with check (true);
create policy "Allow service role all access on reminders" on public.reminders for all using (true) with check (true);
