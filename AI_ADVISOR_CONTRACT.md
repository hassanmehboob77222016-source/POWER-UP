# PowerUp AI Advisor contract (v1)

**Status:** Step 1 decision record with locally implemented service, intake, calculation-grounded explanation, and Step 6 evaluation cases, 2026-10-12. Hosted AI behavior is not verified.

## Provider decision

Use **Groq** with `openai/gpt-oss-20b` for the first implementation. Groq documents strict JSON Schema output for this model, an OpenAI-compatible API, and a free plan. The model's structured output fits fact extraction and concise explanations. Keep the HTTP call behind a provider adapter so the app can switch models or providers without changing the UI contract. Do not enable provider web search, code execution, or other tools for this feature.

The published free-plan base limit for this model is 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute, and 200,000 tokens/day; the account's actual limits may differ. This is a development allowance, not a production capacity guarantee. Groq says ordinary inference inputs and outputs are not retained by default, with limited exceptions for reliability and abuse investigation; confirm the account's Data Controls before rollout.

- [Groq model and capabilities](https://console.groq.com/docs/model/openai/gpt-oss-20b)
- [Strict structured output support](https://console.groq.com/docs/structured-outputs)
- [Free-plan limits](https://console.groq.com/docs/rate-limits)
- [Data handling](https://console.groq.com/docs/your-data)

The Edge Function will read `GROQ_API_KEY` and an optional `GROQ_MODEL` from server-side secrets. No provider key belongs in a `VITE_*` variable, the browser bundle, or a saved plan. **No API key is needed for Step 1.**

## Access and data policy

- Guests may use the advisor without signing in. Their drafts stay in browser memory/session state, and no guest plan or conversation is saved to Supabase.
- Signed-in users may use the advisor, but an AI response never saves a plan. Saving remains the existing explicit action against their owned `backup_plans` row.
- The first release supports English and Urdu text, including mixed-language input. The UI falls back to English if language detection is uncertain.
- Send only the latest bounded conversation turns, confirmed plan fields needed for intake, and the server's calculation results when explaining a plan. Do not send account IDs, email addresses, plan IDs, physical addresses, feedback, or Monitoring readings in the planning request.
- Never persist prompts, assistant replies, or full transcripts. Store only short-lived quota metadata. Avoid logging request bodies, provider responses, and identifying user text.
- Guest quota: at most 5 model calls/hour and 20/day per server-derived, keyed network fingerprint. Signed-in quota: at most 20/hour and 60/day per verified user. Also cap the project at 20 calls/minute and 800/day to leave room below Groq's published base limits. Both intake and explanation calls count. These are initial protective limits and should be revisited after observing real usage.
- Derive the guest fingerprint only from a trusted platform-supplied network address. Do not trust a client-supplied forwarding header. If the trusted address or fingerprint secret is unavailable, return a bounded error and offer the manual wizard. Do not store raw addresses.
- The historical `ai_chat_usage` and `ai_guest_chat_usage` tables and quota functions were created, then dropped by `20261012000000_remove_ai_backup_advisor.sql`. Step 2 must inspect the actual local and hosted schema before proposing a **new** versioned quota migration. Historical migrations must remain unchanged.

## Request limits and failure behavior

Accept POST JSON only. Limit the body to 20 KiB, at most 8 conversation turns, at most 1,000 characters per turn and 5,000 characters total, and at most 30 appliances. Reject unsupported fields and invalid units or ranges before calling the provider. Use a 15-second provider deadline and at most 1,200 output tokens for intake or 600 for explanation. Return stable `400` validation, `401` authentication, `413` size, `429` quota/provider limit, `502` invalid provider output, and `503` missing service configuration responses. Never expose provider response bodies or credentials in errors.

The user can retry a failed turn or continue with the manual wizard using the confirmed draft. An unavailable provider cannot block deterministic calculations.

## Versioned application contract

The HTTP interface is `POST /functions/v1/ai-backup-advisor`. `version` must be `1`. The exact request, response, proposal, and error types now live in [`src/lib/ai-advisor-contract.ts`](src/lib/ai-advisor-contract.ts). They derive field names and units from `SetupInputs` and `CalculationResults` in `src/lib/calculations.ts`. The provider request excludes free-form plan notes. `confirmedInputs` may be incomplete during intake. Fields absent from it are unknown; zero-valued legacy fields such as `voltage` are treated as **not supplied**, never inferred from the model. A complete `AdvisorSetupInputs` is required before calculation.

`AdvisorFieldProposal.field` is limited to named `SetupInputs` fields at the type level; Step 2 must enforce the same allowlist at runtime. Appliance proposals use a typed upsert operation with a stable draft item ID. A proposal never mutates `confirmedInputs`. The UI must show the proposed value and evidence, then require the user to confirm it before it enters `SetupInputs` or is saved. Catalog wattages are labeled preset values, not claims that the user stated them. Ambiguous battery-bank voltage/Ah, unknown chemistry, unknown appliance wattage, and unspecified operating hours stay unknown and trigger a question or explicit limitation.

The Edge Function validates all request and provider output fields. Intake model output can contain only a message, one follow-up question, proposed changes, and safety notes. The model cannot return a plan ID, owner ID, database operation, calculated wattage/energy/runtime, or a confirmed input update. Numeric setup-field proposals now require quoted evidence with the same number and unit; ambiguous or converted values must be reviewed manually. Explanation model output is checked against the server's calculated results; unsupported numeric claims or detected unsafe electrical instructions cause a safe rule-based fallback. The response's `explanationSource` is `ai` or `rules`, so a fallback is never presented as a model answer. Local Step 6 cases cover conflicting facts, unknown specifications, wrong units, prompt injection output, unsafe electrical advice, malformed output, and provider failures. These deterministic checks cannot prove that every natural-language response is safe; a live model and user review remain necessary.

## One numerical source of truth

`calculateBackupPlan()` and the appliance catalog are pure TypeScript shared by Vite and the Supabase Edge Function. `CALCULATION_ENGINE_VERSION` identifies the calculation contract. The Edge Function calculates `calculatedResults` from validated, confirmed `SetupInputs`; it does not accept browser-supplied totals. The browser compares the returned version, confirmed inputs, and calculated results with its local calculation before displaying model prose. The existing browser results and saved-plan flow use that same module. The model receives only the confirmed inputs and the resulting calculation needed to explain the plan. It cannot supply authoritative numbers.

No new table is needed for plans or conversations. `backup_plans` remains the owned, stable-ID source used by My Plans and Monitoring. Any new quota storage in Step 2 is request metadata only.

## Decisions carried into Step 2

The first implementation uses Groq, allows bounded guest and signed-in access, retains no transcripts, and keeps the manual wizard available. Step 2 has focused local tests that use a mocked provider. A real provider request needs a Groq API key configured as a Supabase Edge Function secret. The additive `20261012040000_add_ai_advisor_request_quota.sql` migration is present locally and has **not** been applied to a hosted project. Hosted guest access additionally needs confirmation that the selected IP header is overwritten by the trusted Supabase gateway; without that setting, guest AI access fails closed and the manual wizard remains available.
