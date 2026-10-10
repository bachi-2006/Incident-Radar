# Incident Radar — Frontend Prototype

Production-quality incident intelligence app backed by Supabase, with optional AI-assisted investigation flows.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS (dark-first)
- Lucide React
- Recharts
- Supabase

## Run

```bash
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` and provide:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` for server-side scripts and admin writes
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The current app reads live Supabase tables directly and does not rely on local mock fixtures.

## Routes

| Path | Page |
|------|------|
| `/` | Overview + production simulation |
| `/incidents` | Incident list |
| `/incidents/INC-001` | Investigation (timeline, evidence, AI hypothesis, actions) |
| `/events` | Operational event explorer |
| `/services` | Service health + dependency graph |
| `/simulation` | Scenario runner |

## Demo flow

1. Open Overview
2. Click **Run Production Simulation**
3. Watch events → candidates → critical incident surface
4. Click **Investigate** on Payment Service Degradation

## Architecture notes

- Supabase client setup: `src/lib/supabase.ts`
- Data access and UI mapping: `src/lib/api.ts`
- Ingest helpers: `src/lib/ingest.ts`
- Types: `src/types/`
- State: React context (simulation, toasts, sidebar)

