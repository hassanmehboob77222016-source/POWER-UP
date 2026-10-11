# PowerUp Supabase setup

PowerUp's landing page, backup wizard, appliance planner, calculations, rule-based advice, results, AI chat, demo dashboard, and approved community feedback are public. Supabase provides optional accounts, private saved plans, moderated feedback, and the rate-limited AI Edge Function. OpenAI credentials stay in Edge Function secrets and are never sent to the browser. The Unit Monitoring view remains demo data and is not connected to hardware.

## Configure a Supabase project

1. Create a Supabase project.
2. In **Project Settings → API**, copy the project URL and the publishable key (or legacy `anon` key).
3. Copy `.env.example` to `.env.local` and set:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

   These are browser-safe values. Never put a service-role key in a `VITE_*` variable or frontend file. Restart the Vite server after editing environment variables.

4. Apply the migrations in timestamp order. For a new project, run all four files in the Supabase SQL Editor:
   - `supabase/migrations/20261011000000_powerup_accounts_plans_feedback.sql`
   - `supabase/migrations/20261011010000_feedback_admin_moderation.sql`
   - `supabase/migrations/20261011020000_ai_backup_chat_quota.sql`
   - `supabase/migrations/20261011030000_ai_guest_chat_quota.sql`
   Apply only migrations that have not already been applied. Do not rerun an already-applied migration; the original schema file creates triggers and policies without idempotent guards.
5. Under **Authentication → URL Configuration**, add the local app origin (for example `http://localhost:5173`) to the Site URL / Redirect URLs. Add the deployed origin too when you deploy.
6. Configure email delivery and the email verification template in **Authentication → Providers → Email**. Signup can require email confirmation; users see a confirmation message and can sign in after verifying.
7. The password reset link redirects to `/?screen=reset`; ensure that path is accepted by the same origin's redirect allow list. The Vite SPA serves this through `index.html`.

## Deploy the AI Backup Advisor

The AI chat is available to guests and signed-in users. The Edge Function validates account sessions itself and applies a quota of 30 requests per hour and 100 per day to signed-in users. Guests are rate-limited to 5 requests per hour and 20 per day per network fingerprint. A keyed HMAC of the platform-provided network IP and request timestamps are stored for quota enforcement; raw IP addresses and chat history are not stored by PowerUp. The model extracts facts and explains results; PowerUp's existing browser calculation engine remains the numeric source of truth.

Chat message text and the extracted setup are sent to OpenAI for processing. PowerUp does not store chat history; the `ai_chat_usage` table stores only the authenticated user ID and request timestamp for quota enforcement.

1. Configure `OPENAI_API_KEY` and a strong random `AI_GUEST_RATE_LIMIT_SECRET` (at least 32 random bytes) in **Supabase Dashboard → Edge Functions → Secrets**. Optionally set `OPENAI_MODEL`; the default is `gpt-4o-mini`. Never use a `VITE_*` variable for these secrets.
2. Apply the guest quota migration above. Supabase Edge Functions provide `SUPABASE_SERVICE_ROLE_KEY` to the function runtime; the service key is used only server-side to call the quota RPC and must never be copied into the frontend.
3. Deploy `supabase/functions/ai-backup-advisor` with `supabase functions deploy ai-backup-advisor`. Gateway JWT verification is disabled for this one endpoint so guest requests can reach it; the function still validates signed-in sessions itself, recognizes only the configured public project key as a guest, and requires the server-side quota check before calling OpenAI.
4. For local development, put the OpenAI and guest rate-limit secrets in `supabase/functions/.env` and run `supabase start`; do not commit that file. The frontend also needs its `.env.local` Supabase URL and publishable/anon key.
5. Start PowerUp and open **AI Chat** without signing in. Guest conversations stay in the current page session and are not saved by PowerUp. If configuration or the deployed function is missing, the chat returns a clear service error.

## Schema and access rules

The migrations create `profiles`, `backup_plans`, `feedback`, a database-only `admin_users` allowlist, and protected authenticated and guest AI quota tables, including foreign keys, indexes, constraints, updated timestamps, and Row Level Security. New auth users receive a private profile row from a database trigger. Users can read and edit their own plans and feedback. Anonymous visitors can read only approved feedback, and the API grants only public feedback columns (no user IDs or email addresses). Feedback submission, editing, and deletion still require authentication; feedback starts as `pending`, and owners cannot change moderation status. Each account is limited to five feedback submissions per hour. Guest quota data is written only through a service-role-only security-definer RPC; clients cannot read the quota table or invoke that RPC.

### Assign the first administrator safely

1. Create and verify the intended administrator's account through the normal signup flow.
2. In **Authentication → Users**, copy that account's UUID. Confirm it belongs to the person you intend to authorize.
3. As the trusted Supabase project owner, run this statement in the SQL Editor, replacing the UUID:

   ```sql
   insert into public.admin_users (user_id)
   values ('00000000-0000-0000-0000-000000000000')
   on conflict (user_id) do nothing;
   ```

   The browser roles have no table privileges or RLS policy that can add or read administrator rows. Never expose a secret/service-role key or project-owner SQL access to ordinary users. Remove an administrator with a trusted SQL Editor command: `delete from public.admin_users where user_id = '<verified-uuid>';`.
4. Have the administrator sign out and back in, or use **Recheck access** on the moderation page. UI visibility is only a convenience; database functions and RLS authorize every moderation query and update.

Admins can list feedback and change only its moderation status. Database triggers prevent users from changing their status and prevent moderators from rewriting comment content or ownership.

## Verify a migration

After applying the migrations, confirm the tables exist, RLS is enabled, and `is_feedback_admin()` plus its policies are present. Test with two accounts: user A must not see, update, or delete user B's plans or submissions. A regular user's attempt to change `feedback.status` must fail; an authorized admin's action should change status and update the public feed.

### Hosted manual verification

Use a configured local or staging project with working email delivery, deployed AI Edge Function, and an OpenAI API key secret. Do not use production user data for cross-account checks.

1. Create account A and account B with different email addresses. Verify each email, sign in, refresh the page, and confirm the session remains active. Sign out and confirm private pages require sign-in.
2. Open **AI Chat** as a signed-out visitor and confirm it asks for sign-in. Sign in and send the provided Hinglish example; verify extraction of 4 hours, 24V, 150Ah, LiFePO₄, 1500W, fans, lights, fridge, and TV. Confirm a reply identifies missing facts rather than showing a plan too early.
3. Complete the chat with a known preset load, then generate a plan. Confirm the results reuse the same PowerUp calculator, that the conversational explanation reflects those outputs, and **Open detailed PowerUp plan** opens the existing results dashboard. Try the `I don't know` paths and confirm unknown battery/runtime and inverter-headroom values are labeled unavailable. A custom appliance without a preset wattage must be priced by the user or explicitly excluded.
4. From the calculator, enter a plan and open sign-in before saving. Sign in and confirm the same calculated plan returns. Save it, open **My Plans**, reopen it, rename it, update it from the results page, and delete it. Repeat with account B and confirm each account sees only its own plan.
5. Request a password reset, open the email link in the app origin, set a new password, then sign out and sign in with the new password. Confirm a regular login returns to the screen that initiated sign-in.
6. Submit feedback as account A. Confirm it appears under **Your submissions** with `pending`, and is absent from the public list. Edit and delete it; then submit again for moderation. Verify a sixth submission in one hour is rejected with a rate-limit message.
7. As account B, try to access A's submissions through **Your submissions** and attempt to update/delete A's feedback or plan by using A's record ID in the API request. Each operation must return no row or a permission error and must not change A's data.
8. Assign account A as administrator using the trusted SQL Editor process above. Refresh the moderation page or recheck access, approve one pending item and reject another. Confirm approved feedback appears publicly and rejected feedback stays private. As account B, verify the moderation page denies access and attempts to set `status` through the API fail.
9. Edit an approved feedback item as its owner; it should disappear from the public list and return to `pending` until reviewed again.

For automated database contract checks, install the Supabase CLI and Docker, start a local stack with `supabase start`, then run `supabase db reset` followed by `supabase test db`. This runs `supabase/tests/security_contract.test.sql` against a fresh schema and simulates two authenticated users, an allowlisted administrator, and an anonymous visitor. It checks RLS isolation, grants, private feedback columns, RPC privileges, moderation behavior, AI usage table protection, and quota RPC access. These tests do not exercise a hosted project, OpenAI responses, or email delivery.

## Local development

```sh
npm install
npm run dev
```

Without `.env.local`, the backup planner remains usable as a guest. Sign-in, plan persistence, and feedback submission remain unavailable until Supabase is configured. The app does not claim remote authentication or database flows are operational until a real project is configured and those flows are exercised.
