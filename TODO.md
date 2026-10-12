# PowerUp Implementation TODO

## Agent operating rules

This is a gated implementation sequence for making the AI Backup Advisor central to PowerUp.

1. Read `PRD.md`, `TRD.md`, `README.md`, `SUPABASE_SETUP.md`, and the relevant source before starting a step.
2. Inspect `git status` first. The repository may contain the user's uncommitted work. Do not revert, overwrite, or reformat unrelated changes.
3. Work on **one step only** per approval cycle. A step is complete only when its acceptance checks pass and the user can test the result.
4. At the end of each step, report the change, exact files affected, checks run and results, known limitations, and concise instructions for the user to test it.
5. Then ask: **“Please test this step and tell me whether to continue to Step N.”** Stop there. Do not begin the next step until the user explicitly approves it.
6. Do not apply database migrations, deploy Edge Functions, change hosted Supabase settings/secrets, or write/delete hosted data without separate explicit approval for that specific operation.
7. Never request secrets in chat or put provider/service-role secrets in browser code or `VITE_*` variables. Tell the user where to configure server-side secrets without asking them to paste values.
8. Preserve the deterministic calculation engine, guest planning, authentication, saved-plan ownership/RLS, feedback, and manual Monitoring. Do not claim AI or live hardware behavior that has not been implemented and tested.

## Product direction

The AI Backup Advisor is the main product journey. It should guide users through describing their backup system and outage needs, ask questions when information is missing, let users review extracted facts, and explain a plan grounded in PowerUp's deterministic calculations. AI must not invent input values or calculate authoritative load, energy, capacity, or runtime results.

The existing wizard and calculation engine remain available as a non-AI fallback. Guest plan data must not be written to Supabase. Authenticated users explicitly save the same plan record used by My Plans and Monitoring.

## Sequence

### Step 1 — Confirm the AI integration contract and provider

**Goal:** Resolve only the product and technical choices that block a real AI implementation. Do not implement the provider call yet.

- Review the project and prior AI-related code/migration history; do not infer that old quota tables or secrets still exist.
- Recommend a model provider and model based on the advisor's structured intake and explanation needs. Keep the adapter replaceable.
- Propose guest versus signed-in AI access, abuse limits, timeout/token limits, what user data is sent, and whether conversations are ever retained. Default to no transcript persistence.
- Define a versioned request/response contract: confirmed `SetupInputs`, missing-information questions, proposed input changes requiring user confirmation, calculated results from the deterministic engine, grounded explanations, and safety notes.
- Identify the calculation module-sharing strategy between browser and Edge Function. Keep one numeric source of truth.
- Report decisions requiring user choice, then ask approval to proceed to Step 2. Do not add a provider dependency or secret in this step.

**Acceptance:** Provider and data policy are explicitly selected or approved; the API contract clearly separates confirmed inputs, AI suggestions, and deterministic results.

### Step 2 — Build the secure AI service foundation

**Goal:** Implement and locally validate the server-side AI request path without changing the main user journey yet.

- Add a Supabase Edge Function for the advisor using the approved contract and provider.
- Validate request size, message history, input fields, authenticated identity, and structured provider output. Treat all model output as untrusted.
- Keep provider credentials server-side. Return useful, bounded errors for missing configuration, timeouts, rate limits, and invalid model responses.
- Add abuse controls for the approved guest/authenticated policy. Inspect the current schema first; create a new versioned migration only if a table or function is genuinely required.
- Do not persist prompts or transcripts unless Step 1 explicitly approved retention.
- Add focused tests for input validation, malformed output, timeout/failure fallback, and authorization/rate-limit behavior where the local environment supports them.

**Acceptance:** The Edge Function returns the approved schema for valid requests, rejects invalid requests, does not expose provider secrets, and has no fake model responses in production code.

### Step 3 — Make AI-guided intake the primary interface

**Goal:** Add the Advisor experience to the app's main journey and connect it to the service from Step 2.

- Add an obvious AI Advisor start action on Home and a conversational intake surface.
- Collect backup type, outage duration, appliances, quantity, watts, operating hours, priorities, battery, inverter, and solar details when applicable.
- Ask focused follow-up questions for missing or ambiguous data. Represent unknown values explicitly.
- Show AI-extracted values as suggestions until the user confirms them; provide a review/edit step.
- Display waiting, retry, offline, and provider-error states. Keep the existing calculator wizard usable as a fallback.
- Preserve current visual style and keyboard/mobile accessibility.

**Acceptance:** A guest can complete an AI-guided intake, review/edit inputs, and recover to the manual wizard if the provider is unavailable; no data is saved to Supabase as a side effect.

### Step 4 — Ground AI advice in calculations and saved plans

**Goal:** Connect confirmed advisor data to the existing calculation, results, and save flows.

- Run confirmed inputs through the existing deterministic calculation engine; never accept model-supplied calculation totals as authoritative.
- Give the model only the confirmed inputs and calculated results needed to produce a concise explanation and recommendations.
- Validate output fields and show assumptions, uncertainty, and missing specifications.
- Allow guests to calculate without persistence. For signed-in users, save only after an explicit user action.
- Reuse `backup_plans` and its stable ID/owner behavior; do not create another system or conversation table as a substitute.
- Preserve retry-safe creation and update behavior. Verify that the saved configuration is the one reopened in My Plans and shown in Monitoring.

**Acceptance:** The displayed numbers match the calculator; unknown capacity never produces a runtime; guest calculations create no database rows; authenticated save/reopen/edit keeps one owned plan.

### Step 5 — Connect AI guidance to Monitoring without implying telemetry

**Goal:** Make Monitoring useful with the selected saved plan and its real manual readings.

- Confirm the selected system remains the user's saved plan and selector changes reload its measurements.
- Use AI only to explain the selected plan or observed history if an approved user action requests it; do not make automatic diagnoses from insufficient readings.
- Keep readings user-entered, timestamped, validated, and tied to the plan ID and owner.
- Keep empty states explicit and charts limited to stored readings.
- Do not add live status, weather, fleet, generation, or health metrics without a real verified source.

**Acceptance:** Switching plans changes the configuration and reading history shown; no sample readings appear; all AI statements distinguish observations, calculations, and unknowns.

### Step 6 — Complete evaluations, privacy, and release checks

**Goal:** Verify the complete AI-first workflow and its non-AI fallbacks before proposing deployment.

- Add evaluation cases for conflicting facts, unknown specifications, wrong units, prompt injection, unsupported electrical advice, malformed output, and provider failure.
- Verify model explanations against deterministic calculations and ensure user confirmation is required for extracted changes.
- Run existing unit tests, database contract tests on a local Supabase stack, type checks, and production build.
- Review RLS, grants, Edge Function authorization/CORS, logging, rate limiting, and secrets. Use dedicated test accounts for end-to-end account tests.
- Write precise local setup and deployment instructions. Do not deploy in this step.

**Acceptance:** Tests/build pass or failures are documented; no hosted data was changed; release instructions identify exactly which secrets and Edge Function deployment are required.

### Step 7 — Hosted rollout (separate explicit approval required)

**Goal:** Deploy the reviewed implementation only after the user has tested local steps and explicitly approves each hosted change.

- Before every remote operation, verify the exact Supabase project reference and pending migration/function changes.
- Explain any migration effects and ask for approval before applying migrations or deploying the Edge Function.
- Never reset the hosted database, modify migration history, or remove existing data/functions/secrets as part of this rollout.
- After approval, verify the deployed function, migration history, and safe health checks. Do not submit test content or create/delete production records without explicit approval.

**Acceptance:** Hosted changes match the approved diff and target project; remote verification evidence and any remaining manual user tests are reported.

## Progress tracker

- [x] Step 1 — AI contract and provider decision ([AI_ADVISOR_CONTRACT.md](AI_ADVISOR_CONTRACT.md))
- [x] Step 2 — Secure AI service foundation (local code and mocked-provider validation; hosted migration/function remain pending Step 7)
- [ ] Step 3 — AI-guided primary interface (local UI and wizard handoff implemented; live service acceptance pending deployment and user test)
- [ ] Step 4 — Calculation and saved-plan integration (local explanation UI and parity checks implemented; hosted flow and user acceptance pending)
- [ ] Step 5 — Monitoring integration (local selected-plan explanation and reading isolation implemented; live service and user acceptance pending)
- [ ] Step 6 — Evaluations and release checks (local tests/build pass and two live Groq intake checks pass; Docker SQL checks and user acceptance remain pending)
- [ ] Step 7 — Hosted rollout (approved quota migration attempt stopped: `public.ai_advisor_request_usage` already exists remotely while migration `20261012040000` remains unrecorded; inspect remote schema before any further write)

Update this tracker only for work actually completed. After every step, stop for user testing and approval before proceeding.
