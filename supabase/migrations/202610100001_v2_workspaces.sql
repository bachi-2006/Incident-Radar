-- ==============================================================================
-- INCIDENT RADAR v2 — MIGRATION 001: WORKSPACES, ROLES & EXPERTISE
-- ==============================================================================

-- ============ ENUMS ============
do $$ begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type org_role as enum ('member', 'admin', 'owner');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_role') then
    create type project_role as enum ('viewer', 'responder', 'maintainer');
  end if;
end $$;

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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

-- ============ ORGANIZATIONS ============
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

-- ============ PROJECTS ============
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

-- ============ ISSUE CATEGORIES & EXPERTISE ============
create table if not exists public.issue_categories (
  key text primary key,
  label text not null,
  path_patterns text[] not null default '{}',
  signal_rules jsonb not null default '{}'::jsonb
);

insert into public.issue_categories (key, label, path_patterns) values
  ('system_architecture', 'System Architecture', array['infra/**', 'cluster/**']),
  ('frontend', 'Frontend', array['src/components/**', 'src/app/**/page.tsx', '**/*.css', 'public/**']),
  ('backend', 'Backend', array['src/app/api/**', 'src/lib/**', 'server/**', '**/*.java', '**/*.py']),
  ('database', 'Database', array['supabase/**', '**/*.sql', '**/migrations/**']),
  ('devops', 'DevOps', array['.github/workflows/**', 'Dockerfile', 'render.yaml', 'infra/**', '**/*.tf']),
  ('security', 'Security', array['**/auth/**', 'middleware.ts'])
on conflict (key) do nothing;

create table if not exists public.member_expertise (
  user_id uuid references public.profiles(id) on delete cascade,
  category text references public.issue_categories(key),
  level smallint not null check (level between 0 and 5),
  primary key (user_id, category)
);

-- ============ SEED DEFAULT WORKSPACE ============
insert into public.organizations (id, slug, name)
values ('00000000-0000-0000-0000-000000000001', 'xyz', 'XYZ Corporation')
on conflict (id) do nothing;

insert into public.projects (id, org_id, slug, name)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'demo', 'Demo Project')
on conflict (id) do nothing;

-- ============ RLS HELPERS ============
create or replace function public.has_project_role(p uuid, min_role project_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_members pm
    where pm.project_id = p and pm.user_id = auth.uid() and pm.role >= min_role
  ) or exists (
    select 1 from projects pr join org_members om on om.org_id = pr.org_id
    where pr.id = p and om.user_id = auth.uid() and om.role >= 'admin'
  );
$$;
