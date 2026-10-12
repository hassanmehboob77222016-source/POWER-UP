# PowerUp

PowerUp helps households plan backup power for load-shedding: appliance load, battery runtime, inverter checks, upgrade comparisons, optional saved plans, manual monitoring, and an AI-guided advisor with a deterministic calculation engine.

## Layout

- `frontend/` — Vite + React app, calculation engine, and unit tests
- `backend/supabase/` — database migrations, Edge Functions, and SQL contract tests

## Quick start

```sh
cd frontend
npm install
npm run dev
```

From the repository root you can also run `npm run dev` after the frontend dependencies are installed.

Optional Supabase: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local`. Run Supabase CLI commands from `backend/` so they pick up `supabase/config.toml`.

## Validation

```sh
npm run test:backup-upgrades
npm run test:monitoring-data
npm run test:ai-advisor
npm run build
```

## Documentation

Product requirements, architecture, design tokens, Supabase and AI setup, implementation roadmap, and contributor guide:

**[DOCUMENTATION.md](DOCUMENTATION.md)**
