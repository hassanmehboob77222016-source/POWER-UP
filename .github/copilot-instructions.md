# Copilot instructions for PowerUp

PowerUp is a Vite + React + TypeScript app for household backup power planning. The frontend lives in `frontend/` (setup wizard, deterministic calculations in `frontend/src/lib/calculations.ts`). The backend lives in `backend/supabase/` (migrations, Edge Function, SQL tests). The AI advisor contract is `frontend/src/lib/ai-advisor-contract.ts`.

**Read [DOCUMENTATION.md](../DOCUMENTATION.md) first** for product rules, schema, AI policy, design tokens, and the gated implementation roadmap.

## Commands

Run from the repository root after `npm install` in `frontend/`, or from `frontend/` directly:

- `npm install` (in `frontend/`) · `npm run dev` · `npm run build`
- `npm run test:backup-upgrades` · `npm run test:monitoring-data` · `npm run test:ai-advisor` · `npm run verify:groq`
- Single test: `node --test frontend/scripts/test-backup-upgrades.mjs`

No lint script; use build + validation scripts.

## Architecture (entry points)

- `frontend/src/App.tsx` — screens and orchestration
- `frontend/src/components/setup/backup-wizard.tsx` — manual intake
- `frontend/src/lib/calculations.ts` — numeric source of truth
- `frontend/src/context/auth-context.tsx`, `frontend/src/lib/supabase.ts` — auth and client
- `backend/supabase/migrations/`, `backend/supabase/functions/ai-backup-advisor/` — backend

Prefer pure logic in `frontend/src/lib`, typed domain models, `@/*` imports. Never put provider or service-role secrets in `VITE_*` or the browser bundle. Run Supabase CLI with working directory `backend/`.
