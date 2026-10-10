-- ==============================================================================
-- INCIDENT RADAR — PRODUCTION SUPABASE SCHEMA
-- ==============================================================================

create extension if not exists "pgcrypto";

-- Clean drop for clean from-scratch setup
drop table if exists public.event_relationships cascade;
drop table if exists public.events cascade;
drop table if exists public.incidents cascade;
drop table if exists public.services cascade;

-- ==============================================================================
-- 1. INCIDENTS TABLE
-- ==============================================================================
create table public.incidents (
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

-- ==============================================================================
-- 2. EVENTS TABLE
-- ==============================================================================
create table public.events (
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

-- ==============================================================================
-- 3. EVENT RELATIONSHIPS TABLE (Causal DAG edges)
-- ==============================================================================
create table public.event_relationships (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null references public.incidents(id) on delete cascade,
  from_event_id text not null,
  to_event_id text not null,
  relationship_type text not null default 'PRECEDES' check (relationship_type in ('PRECEDES', 'CAUSES', 'CORRELATES_WITH', 'BLOCKS')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (incident_id, from_event_id, to_event_id, relationship_type)
);

-- ==============================================================================
-- 4. SERVICES TABLE (Microservices Registry & Health Telemetry)
-- ==============================================================================
create table public.services (
  id text primary key,
  name text not null,
  health text not null default 'healthy' check (health in ('healthy', 'degraded', 'critical', 'unknown')),
  requests_per_min integer not null default 0,
  error_rate double precision not null default 0,
  latency_ms double precision not null default 0,
  active_incidents integer not null default 0,
  sparkline double precision[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ==============================================================================
create index if not exists idx_incidents_start_time on public.incidents (start_time desc);
create index if not exists idx_incidents_severity on public.incidents (severity);
create index if not exists idx_incidents_status on public.incidents (status);
create index if not exists idx_events_incident_id on public.events (incident_id);
create index if not exists idx_events_service on public.events (service);
create index if not exists idx_events_timestamp on public.events (timestamp desc);
create index if not exists idx_event_relationships_incident on public.event_relationships (incident_id);
create index if not exists idx_services_health on public.services (health);

-- ==============================================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.incidents enable row level security;
alter table public.events enable row level security;
alter table public.event_relationships enable row level security;
alter table public.services enable row level security;

-- Grant public read/write access for application & correlation agents
create policy "Allow public all access on incidents" on public.incidents
  for all using (true) with check (true);

create policy "Allow public all access on events" on public.events
  for all using (true) with check (true);

create policy "Allow public all access on event_relationships" on public.event_relationships
  for all using (true) with check (true);

create policy "Allow public all access on services" on public.services
  for all using (true) with check (true);

-- ==============================================================================
-- 7. AUTO-UPDATE TIMESTAMP TRIGGERS
-- ==============================================================================
create or replace function public.trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger incidents_updated_at
  before update on public.incidents
  for each row execute function public.trigger_set_updated_at();

create trigger services_updated_at
  before update on public.services
  for each row execute function public.trigger_set_updated_at();

-- ==============================================================================
-- 8. ONE-SHOT CORRELATION AGENT INGESTION RPC
-- ==============================================================================
create or replace function public.upsert_incident_bundle(payload jsonb)
returns text
language plpgsql
as $$
declare
  inc_id text;
  inc_title text;
  inc_severity text;
  inc_status text;
  inc_service text;
  inc_start timestamptz;
  inc_end timestamptz;
  inc_confidence double precision;
  inc_affected text[];
  evt_item jsonb;
  rel_from text;
  rel_to text;
  rel_type text;
begin
  inc_id := coalesce(payload->>'incident_id', payload->>'id', 'INC-' || to_char(now(), 'YYYYMMDDHH24MISS'));
  inc_title := coalesce(payload->>'incident_title', payload->>'title', 'Untitled Incident');
  inc_severity := lower(coalesce(payload->>'severity', 'medium'));
  inc_status := lower(coalesce(payload->>'status', 'active'));
  inc_service := coalesce(payload->>'service', 'platform-service');
  inc_start := coalesce((payload->'time_window'->>'start')::timestamptz, (payload->>'startTime')::timestamptz, now());
  inc_end := nullif(coalesce(payload->'time_window'->>'end', payload->>'endTime'), '')::timestamptz;
  
  if payload->>'correlation_score' is not null then
    inc_confidence := greatest(0, least(100, (payload->>'correlation_score')::double precision * 100));
  elsif payload->>'confidence' is not null then
    inc_confidence := (payload->>'confidence')::double precision;
  else
    inc_confidence := 90;
  end if;

  if inc_severity not in ('critical', 'high', 'medium', 'low', 'info') then
    inc_severity := 'medium';
  end if;

  inc_affected := coalesce(array(select jsonb_array_elements_text(payload->'affected_services')), array[inc_service]::text[]);

  -- Upsert parent incident
  insert into public.incidents (
    id, title, severity, confidence, status, service,
    description, root_cause, start_time, end_time, correlated_count,
    affected_services, metadata
  )
  values (
    inc_id,
    inc_title,
    inc_severity,
    inc_confidence,
    inc_status,
    inc_service,
    coalesce(payload->>'description', 'Synthesized operational incident from correlation engine.'),
    coalesce(payload->>'rootCause', payload->>'root_cause', 'Automated root cause analysis pending or identified upstream.'),
    inc_start,
    inc_end,
    coalesce((payload->>'event_count')::int, (payload->>'correlatedCount')::int, jsonb_array_length(coalesce(payload->'events', '[]'::jsonb))),
    inc_affected,
    jsonb_build_object(
      'evidence', coalesce(payload->'evidence', '[]'::jsonb),
      'recommendations', coalesce(payload->'recommendations', '[]'::jsonb),
      'correlation_reasons', coalesce(payload->'correlation_reasons', '[]'::jsonb)
    )
  )
  on conflict (id) do update set
    title = excluded.title,
    severity = excluded.severity,
    confidence = excluded.confidence,
    status = excluded.status,
    service = excluded.service,
    description = excluded.description,
    root_cause = excluded.root_cause,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    correlated_count = excluded.correlated_count,
    affected_services = excluded.affected_services,
    metadata = excluded.metadata,
    updated_at = now();

  -- Upsert individual events
  for evt_item in select jsonb_array_elements(coalesce(payload->'events', '[]'::jsonb))
  loop
    insert into public.events (
      id, incident_id, service, source, event_type, message,
      severity, timestamp, metric, value, metadata
    )
    values (
      coalesce(evt_item->>'event_id', evt_item->>'id', inc_id || '-evt-' || gen_random_uuid()),
      inc_id,
      coalesce(evt_item->>'service', inc_service),
      coalesce(evt_item->>'source', 'Application Logs'),
      lower(replace(coalesce(evt_item->>'event_type', evt_item->>'eventType', 'log'), '.', '_')),
      coalesce(evt_item->>'message', 'Correlated operational signal'),
      lower(coalesce(evt_item->>'severity', 'info')),
      coalesce((evt_item->>'timestamp')::timestamptz, inc_start),
      evt_item->>'metric',
      case when evt_item->>'value' is null then null else (evt_item->>'value')::double precision end,
      jsonb_strip_nulls(jsonb_build_object(
        'metric', evt_item->'metric',
        'value', evt_item->'value'
      ))
    )
    on conflict (id) do update set
      incident_id = excluded.incident_id,
      service = excluded.service,
      source = excluded.source,
      event_type = excluded.event_type,
      message = excluded.message,
      severity = excluded.severity,
      timestamp = excluded.timestamp,
      metric = excluded.metric,
      value = excluded.value,
      metadata = excluded.metadata;
  end loop;

  -- Upsert causal relationships
  for evt_item in select jsonb_array_elements(coalesce(payload->'relationships', '[]'::jsonb))
  loop
    rel_from := coalesce(evt_item->>'from', evt_item->>'from_event');
    rel_to := coalesce(evt_item->>'to', evt_item->>'to_event');
    rel_type := coalesce(evt_item->>'type', evt_item->>'relationship', 'PRECEDES');

    if rel_from is not null and rel_to is not null then
      insert into public.event_relationships (
        incident_id, from_event_id, to_event_id, relationship_type, metadata
      )
      values (
        inc_id, rel_from, rel_to, rel_type, jsonb_build_object('source', 'correlation_agent')
      )
      on conflict (incident_id, from_event_id, to_event_id, relationship_type) do nothing;
    end if;
  end loop;

  return inc_id;
end;
$$;
