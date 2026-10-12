# PowerUp Supabase setup

PowerUp's landing page, backup calculator, appliance planner, runtime and inverter calculations, rule-based recommendations, and community feedback work with or without a Supabase project. Supabase adds optional accounts, private saved plans, private manual readings, and moderated feedback. Monitoring uses a user's saved backup plan as its system configuration. It displays only manually entered readings and does not connect to hardware or provide live telemetry.

## Configure a Supabase project

1. Create a Supabase project.
2. In **Project Settings → API**, copy the project URL and publishable key (or legacy `anon` key).
3. Create `.env.local` in the project root with these browser-safe settings:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

   Never put a service-role key in a `VITE_*` variable or frontend file. Restart Vite after changing environment variables.
4. Link the Supabase CLI to the project and apply the repository migrations in timestamp order with `supabase db push`. For an existing database, first compare the migration history with the hosted project's migration ledger. Do not rerun SQL migrations manually if they have already been applied.
5. Under **Authentication → URL Configuration**, allow the local app origin (for example `http://localhost:5173`) and the deployed app origin.
6. Configure email delivery and the email verification template under **Authentication → Providers → Email**. Signup can require email confirmation.
7. Password reset returns to `/?screen=reset`; allow that app origin in the redirect URL list.

## AI quota cleanup migration

The `20261012000000_remove_ai_backup_advisor.sql` migration removes two request-quota tables and their functions that are no longer used by the application. It preserves historical migrations and all account, saved-plan, and feedback objects. The quota tables contain request timestamps and guest fingerprints; applying the cleanup migration deletes those records. For a hosted database, review its migration history and check for dependencies and records before applying it. Do not run it until that review is complete and the database owner has approved the change. The migration intentionally omits `CASCADE`, so unexpected dependencies will stop it.

## AI Advisor service foundation

The new `ai-backup-advisor` Edge Function and Advisor UI are in the repository, but the function has not been deployed. The UI calls it through the browser-safe Supabase client and shows a manual-calculator fallback when the service is unavailable. The results page calculates with the shared deterministic engine, then accepts an explanation only if the Edge Function returns the same confirmed inputs, engine version, and calculated results. AI prose is not saved with plans; reopening a saved plan recalculates from its saved configuration and offers an explicit explanation request. Its request and response types are in `src/lib/ai-advisor-contract.ts`. The additive `20261012040000_add_ai_advisor_request_quota.sql` migration creates a short-lived request-counter table and one privileged quota function. It stores keyed actor hashes and timestamps, never prompts or model replies. This migration has **not** been applied to the hosted project. Review the target project and migration history, then obtain separate approval before any hosted migration or function deployment.

For local provider testing, add `GROQ_API_KEY` and `AI_RATE_LIMIT_SECRET` (at least 32 random characters) to the ignored `supabase/functions/.env` file. `GROQ_MODEL` is optional and defaults to `openai/gpt-oss-20b`. Never put these values in a `VITE_*` variable or commit the secret file. The function reads Supabase's injected public and secret keys at runtime; it does not require a browser service-role key. Run `npm run test:ai-advisor` to exercise validation, provider error handling, deterministic calculation, and fallback behavior with a mocked provider. Run `npm run verify:groq` for one live provider intake request using the local secret; the script prints only pass/fail status, not the key or model reply. This check does not verify Supabase authentication, quota storage, or a deployed function.

Guest AI access needs `AI_TRUSTED_IP_HEADER` set to a header that the serving gateway demonstrably overwrites with the client address (`cf-connecting-ip` or `x-real-ip`). Until this is verified for the actual deployment and configured server-side, guest AI requests fail closed and the manual calculator remains available. The function does not use caller-provided `x-forwarded-for`. Signed-in users are verified through Supabase Auth. `verify_jwt = false` is set only for this function so guests can reach its own auth and quota checks.

The function cannot be exercised end to end until its quota migration is present in a test/local database, the provider key is configured, and a Supabase Edge Function runtime is available. Do not use production plans or accounts for a first test. No remote resources are changed by the repository files alone.

### Advisor release checks and deployment sequence

1. Run `npm run test:ai-advisor`, `npm run test:backup-upgrades`, `npm run test:monitoring-data`, and `npm run build`. These use a mocked provider or local calculation and do not prove a live Groq response.
2. With Docker and the Supabase CLI installed, run `npx supabase start`, `npx supabase db reset`, and `npx supabase test db` **only against the local stack**. The SQL contract includes owner isolation, plan and reading permissions, and AI quota RLS, grants, and limits. Do not use `db reset` with a linked hosted database.
3. Put a rotated `GROQ_API_KEY` in the ignored `supabase/functions/.env` file. Set `AI_RATE_LIMIT_SECRET` there to a random value of at least 32 characters for local Edge Function testing. `GROQ_MODEL` is optional. Run `npm run verify:groq` only after a real key is configured; this makes one live provider request and does not test Supabase auth or the quota RPC. Never copy these values into `.env.local` or a `VITE_*` setting.
4. Before any hosted operation, verify the intended project reference, linked CLI reference, migration history, function list, and `npx supabase db push --dry-run` output. Stop if the target or pending set differs from the reviewed plan. The additive `20261012040000_add_ai_advisor_request_quota.sql` migration is the AI-specific change required by this Edge Function; its table stores keyed request timestamps only. Obtain separate approval before applying it.
5. After separate approval, configure `GROQ_API_KEY` and `AI_RATE_LIMIT_SECRET` as **server-side Edge Function secrets** for the verified project. Supabase's runtime must provide `SUPABASE_URL`, a public project key, and a server-side secret/service-role key for the quota RPC. `GROQ_MODEL` may be set to `openai/gpt-oss-20b` or `openai/gpt-oss-120b`. Do not expose any server-side key to the browser.
6. Keep guest AI access closed until the hosting gateway is verified to overwrite either `cf-connecting-ip` or `x-real-ip` with the actual client address; only then set `AI_TRUSTED_IP_HEADER` to that header. An unverified or caller-controlled address would undermine guest quotas.
7. After separate approval, deploy only `ai-backup-advisor` to the verified project. Its `verify_jwt = false` setting permits guests to reach the function; the function itself checks the public project key, verifies signed-in tokens, and applies the quota before calling Groq. Test the deployed intake, explanation, manual fallback, and owner-only plan flow with dedicated test accounts. Do not use production customer records for the first smoke test.

On 2026-10-12, two consecutive `npm run verify:groq` requests returned structured intake responses accepted by PowerUp's contract. This confirms that one local intake example works with the configured provider key; it does not verify authenticated or guest requests through a deployed Edge Function, quota storage, or explanation responses. Keep the key only in the ignored local file or server-side secrets; do not record its value in test output.

The Step 6 source review found that the quota table has RLS enabled and no browser-role grants; the quota RPC is granted only to `service_role`. The Edge Function checks the project public key, validates a signed-in token through Supabase Auth, and fails closed for guests unless a trusted address header is configured. It does not log request bodies, model replies, or provider keys. The quota function enforces guest, user, and project-wide limits atomically. CORS currently allows all origins because guests can call the endpoint; the public key is not a secret, so quotas and a verified gateway address are essential. These are source-level findings, not proof of hosted configuration. The local SQL contract and actual Edge Function authorization remain unverified until a local Supabase runtime is available.

On 2026-10-12, the approved push of `20261012040000_add_ai_advisor_request_quota.sql` to `nywhnxptqycunbpyusst` stopped at statement 0 because `public.ai_advisor_request_usage` already existed. The CLI still showed that migration as pending afterward. Do not retry the push, force migration history, or edit the applied migrations until the existing table, quota function, grants, indexes, RLS, and row count have been inspected read-only and compared with this migration. No Edge Function was deployed in this attempt.

## Schema and access rules

The migrations create private `profiles` and `backup_plans` tables, a protected `admin_users` allowlist, and moderated `feedback`. New auth users receive a profile row from a database trigger. Users can access only their own plans and submissions. Anonymous visitors can read approved feedback, and the API does not expose submitter IDs or email addresses. Feedback submissions require authentication, start as `pending`, and are rate-limited to five per account per hour. Only allowlisted administrators can moderate feedback.

The `20261012010000_add_manual_system_readings.sql` migration adds `system_readings`, linked to a saved plan and its owner with a composite foreign key. Row-level security and database constraints keep readings private to that owner and validate measurement ranges. A database trigger rejects battery or solar fields that do not apply to the saved system. Apply this migration after checking the hosted migration ledger; do not duplicate an already-applied migration. Saving a new plan uses a stable client-generated ID; if a retry finds that ID already owned by the user, it updates the existing row. Editing a saved plan also updates its existing row. Manual readings use a stable UUID so retries do not add duplicate rows.

Monitoring supports observed battery charge, battery voltage, load, and solar generation measurements where they apply to the saved system. Battery capacity, appliance load, and solar nameplate capacity shown in the system overview are derived from saved specifications. Solar nameplate capacity is not a generation forecast. Weather, fleet counts, operating efficiency, inverter telemetry, and live status are not provided.

The Monitoring explanation button requests advice only for the selected saved plan after the user clicks it. It does not send manual measurements or notes to the AI service. Explanation responses are tied to the selected plan, so switching plans discards an in-flight or previous explanation. The Edge Function still requires a separately approved deployment before this action can return live AI advice.

### Assign the first administrator safely

1. Create and verify the intended administrator account through the normal signup flow.
2. In **Authentication → Users**, copy the account UUID and confirm it belongs to the intended person.
3. As the trusted Supabase project owner, run this in the SQL Editor, replacing the UUID:

   ```sql
   insert into public.admin_users (user_id)
   values ('00000000-0000-0000-0000-000000000000')
   on conflict (user_id) do nothing;
   ```

   Browser roles cannot add or read administrator rows. Never expose a service-role key or project-owner SQL access to ordinary users. Remove an administrator with a trusted SQL Editor command: `delete from public.admin_users where user_id = '<verified-uuid>';`.
4. Have the administrator sign out and back in, or choose **Recheck access** on the moderation page.

Administrators can list feedback and change its moderation status. Database triggers and row-level security prevent submitters from changing status or moderators from rewriting comment content or ownership.

## Verify the database

After applying migrations, confirm that the account, plan, reading, and feedback tables exist with row-level security enabled, and that the admin helper and policies are present. Test with two accounts: user A must not read, update, or delete user B's plans, readings, or feedback, and must not attach a reading to user B's system. A regular user's attempt to change feedback status must fail; an authorized administrator's action should update the public feed.

For local database contract checks, install Docker and the Supabase CLI, run `supabase start`, then `supabase db reset` and `supabase test db`. The SQL contract checks access isolation for plans, readings, and feedback, reading constraints, moderation, and rate limits. They do not exercise a hosted project or email delivery. Run `npm run test:monitoring-data` for monitoring validation and actual-reading trend tests.

## Local development

```sh
npm install
npm run dev
```

Without `.env.local`, backup planning remains available as a guest. Sign-in, saved plans, and feedback submission require a configured Supabase project and working email delivery.
