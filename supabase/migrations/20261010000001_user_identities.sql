-- ==============================================================================
-- USER IDENTITY MAPPING
-- Enables Person-Wise Slack Notifications by mapping App Users to Slack IDs
-- ==============================================================================

create table if not exists public.user_identities (
  user_id uuid primary key, -- In a real app, this would reference auth.users(id)
  slack_user_id text unique not null, -- The 'UXXXXXXXX' ID from Slack
  slack_email text,
  display_name text,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_identities enable row level security;

-- Allow users to read their own identity and the system to read all
create policy "Allow users to read own identity" on public.user_identities
  for select using (true); -- Simplified for hackathon; normally would use auth.uid()

-- Seed a few mock identities for the demo so person-wise messages work immediately
insert into public.user_identities (user_id, slack_user_id, slack_email, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'U01ROHITHADMIN', 'rohith@example.com', 'Rohith D (Admin)'),
  ('22222222-2222-2222-2222-222222222222', 'U02DACHEPALLY', 'dachepally@example.com', 'Dachepally (Frontend)'),
  ('33333333-3333-3333-3333-333333333333', 'U03NITHISHSYS', 'nithish@example.com', 'Nithish (System Designer)'),
  ('00000000-0000-0000-0000-000000000001', 'U_ROHITH_ID', 'rohith@example.com', 'Rohith D'),
  ('00000000-0000-0000-0000-000000000002', 'U_NITHISH_ID', 'nithish@example.com', 'Nithish G'),
  ('00000000-0000-0000-0000-000000000003', 'U_DACHEPALLY_ID', 'dachepally@example.com', 'Dachepally R')
on conflict (slack_user_id) do nothing;
