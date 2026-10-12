# PowerUp Product Requirements Document

**Status:** Product target and implementation gap  
**Product:** PowerUp Home Backup Planner  
**Last updated:** 2026-10-12

## 1. Product summary

PowerUp helps households make a practical, safer plan for backup power during outages. The **AI Backup Advisor is the primary product experience**: it guides people through describing their home, outage, backup equipment, and essential loads; asks for missing information; and explains a tailored plan in plain language. A deterministic calculation engine supplies all load, energy, capacity, and runtime figures. AI organizes and explains the plan; it must not invent technical specifications or replace the calculation engine.

People can use the planner as guests. Signing in enables private plan storage, plan management, and manually entered monitoring readings. Monitoring describes saved equipment configuration and recorded observations; it does not claim a live hardware connection.

## 2. Problem and opportunity

Households often do not know which appliances their inverter or battery can support, how long a battery may last, or which specifications they need to check. Technical forms can be hard to complete, while generic chat answers can make unsupported assumptions. PowerUp combines a conversational guide with explicit user confirmation and transparent, deterministic calculations.

## 3. Product principles

1. **AI guides the journey.** The advisor is visible from the home experience through planning and explanation, not an unrelated add-on chatbot.
2. **Numbers are calculated, not generated.** AI may explain deterministic outputs but cannot supply or alter calculated watts, watt-hours, capacities, or runtimes.
3. **Unknown stays unknown.** Ask a question or explain the limitation; never silently invent battery, appliance, inverter, solar, or outage values.
4. **Users control their data.** Guest sessions are not saved to the database. An authenticated user saves a plan explicitly and can reopen, update, rename, or delete their own records.
5. **No false telemetry.** Manual readings are labeled with their source and timestamp. There is no live equipment data unless a real integration is implemented and verified.
6. **Safe and understandable.** Show assumptions and uncertainty. Do not give instructions for unsafe wiring, repair, or equipment modification.

## 4. Users

- **Household planner:** Wants to know what can run during an outage without learning electrical engineering.
- **Technically informed owner:** Knows some battery and inverter specifications and wants detailed calculations and comparisons.
- **Guest user:** Wants to try planning without creating an account.
- **Returning account holder:** Wants saved plans, monitoring readings, and access from a later session.
- **PowerUp moderator:** Reviews feedback and controls whether it appears in the public community feed.

## 5. Goals and measures

### Goals

- Make an AI-guided backup plan the clearest and most useful path through the product.
- Produce reproducible calculations from confirmed user inputs.
- Make it easy to save and revisit a plan without duplicate records.
- Let users compare actual manually entered readings with their saved system configuration.
- Preserve guest access to calculations and clear explanations of missing specifications.

### Proposed measures

These are product measures to add only with privacy-conscious analytics; the current app does not implement product analytics.

- Advisor conversation completion rate.
- Share of plans with the required inputs confirmed by the user.
- Successful calculation and explicit plan-save rates.
- Rate of AI responses rejected by output validation or corrected by the user.
- Return rate to saved plans and manual-reading completion rate.
- Support reports related to misleading estimates or privacy.

## 6. Scope

### In scope

- AI-guided intake and follow-up questions for backup type, outage duration, appliances, quantities, wattage, usage hours, priority, battery, inverter, and solar details.
- A review/edit step before calculation or saving.
- Deterministic calculation of load, energy, usable battery capacity, runtime estimates, and sizing suggestions where inputs support them.
- AI explanations and rule-based operating recommendations grounded in confirmed inputs and calculated results.
- Guest planning, optional account creation, and private saved plans.
- My Plans list, reopen, edit, rename, and delete actions.
- Monitoring of saved plans with a selector for multiple plans and optional manual readings.
- Feedback submission and administrator moderation.
- Responsive, keyboard-accessible UI following the existing PowerUp visual direction in [Design.md](Design.md).

### Out of scope for this release

- Direct inverter, battery-management, solar-controller, MQTT, or vendor API integrations.
- Live telemetry, forecasts, weather, fleet dashboards, or automated fault diagnosis.
- AI-generated electrical installation or repair instructions.
- AI making a save, delete, purchase, or equipment-control decision for the user.
- Public exposure of private plans, user identities, or raw AI conversations.

## 7. Functional requirements

### 7.1 AI-first planning experience

**PR-01.** Home must introduce the AI Backup Advisor and offer a clear action to begin a guided backup-planning conversation.

**PR-02.** The advisor must collect or confirm:

- Backup type: inverter, solar, generator, or no installed system.
- Typical outage duration.
- Appliance name, quantity, wattage, expected operating hours, must-run status, and priority.
- Battery availability, chemistry, capacity, voltage, and amp-hours when known.
- Inverter continuous and surge ratings when known.
- Solar panel count and wattage when applicable and known.

**PR-03.** The advisor must ask focused follow-up questions when required information is missing or ambiguous. It must offer “unknown” where appropriate and preserve unknowns as null/unknown values.

**PR-04.** Before calculating, the product must let the user review and edit the structured facts extracted from conversation. AI-extracted values must not become confirmed facts without user confirmation.

**PR-05.** AI explanations must cite the relevant values supplied by the user or produced by the calculator, distinguish assumptions from facts, and return a safe fallback if the model is unavailable or returns invalid output.

### 7.2 Calculations and recommendations

**PR-06.** Calculate connected load, estimated energy, planned energy, and battery/inverter sizing only from validated inputs and the deterministic calculation engine.

**PR-07.** Estimate runtime only when battery capacity and chemistry provide enough information to derive usable capacity. Label runtime and sizing as estimates, never guarantees.

**PR-08.** Explain the calculation assumptions, including the current engine's 85% inverter efficiency, chemistry-specific depth-of-discharge assumptions, and 20% nominal battery planning margin. Make clear that real equipment behavior can differ.

**PR-09.** Provide rule-based recommendations for appliance priority, load limits, missing surge information, and comparisons where supported. A larger battery must not be recommended as a fix for inverter overload.

### 7.3 Guest and account behavior

**PR-10.** Guests can complete a plan and see calculations without an account. Guest plans must not be written to Supabase. If a guest chooses to sign in to save, preserve the current draft through the authentication flow and request an explicit save afterward.

**PR-11.** Signup, email verification, login, logout, password reset, and password update must use Supabase Auth. The UI must explain when email verification is required.

**PR-12.** Only authenticated users can save plans, submit feedback, and access their private saved plans and readings.

### 7.4 Saved plans

**PR-13.** A saved plan contains a stable ID, owner ID, name, confirmed input configuration, appliance snapshot, calculation result snapshot, and timestamps.

**PR-14.** Saving creates one owned plan. Retrying a request with the same stable ID must update/recover the same plan rather than create a duplicate.

**PR-15.** Editing an opened plan updates its existing record. Users can reopen, rename, and delete their own plans. Delete must clearly disclose that linked readings are deleted with their plan.

**PR-16.** A user must never read, change, or delete another user's plan.

### 7.5 Monitoring

**PR-17.** Monitoring must load saved plans for the authenticated user and provide a working selector when multiple plans exist. The selected plan's saved configuration is the canonical system configuration.

**PR-18.** Display plan name, backup type, available battery/inverter/solar specifications, appliances, and calculated load/energy. Label calculations separately from entered specifications.

**PR-19.** Allow users to enter manual readings with an observed timestamp, battery percentage, voltage, load, solar generation when applicable, and notes. Require at least one valid measurement and enforce ranges.

**PR-20.** Show history and trends only from persisted readings. Show “No readings available yet” when none exist. Never fabricate sample readings or present manual readings as live telemetry.

### 7.6 Feedback

**PR-21.** Signed-in users can submit a 5–2,000-character comment, optional 1–5 rating, and category. New submissions begin pending review and are limited to five per account per hour.

**PR-22.** Public users can view only approved feedback. Users can view and edit their own submissions; edits to reviewed feedback return it to pending. Only allowlisted administrators can moderate status.

## 8. Non-functional requirements

- **Privacy/security:** Enforce ownership through Supabase RLS. Do not put provider secrets or service-role keys in browser variables or code. Send only the minimum data required for an AI request.
- **AI reliability:** Validate request and response schemas, set request timeouts and size limits, handle provider errors, and show a useful non-AI fallback. Never treat model output as executable SQL or trusted authorization.
- **Accuracy:** Use the calculation engine as the numeric authority; preserve null/missing values; make assumptions visible.
- **Accessibility:** Support keyboard navigation, visible focus, semantic form labels, sufficient contrast, and reduced-motion preferences.
- **Responsive design:** Support narrow mobile, tablet, and desktop layouts.
- **Availability:** Core deterministic planning remains available if the AI provider is unavailable. Saving and account-dependent functions require Supabase.
- **Performance:** Keep conversational response time bounded with loading, cancellation/retry behavior, and clear error states.

## 9. Acceptance criteria

1. A guest can start an advisor session, provide appliance and system details, review structured inputs, and calculate a plan.
2. Unknown battery capacity or chemistry never produces a fabricated runtime.
3. AI explanations match deterministic calculator values and identify missing information.
4. If AI is unavailable, the user can continue through the existing form/calculator path without losing confirmed inputs.
5. An authenticated user can save, refresh, reopen, update, rename, and delete their own plan without creating duplicate records.
6. A second account cannot access the first account's plan or readings.
7. Monitoring uses the selected saved plan and shows only stored manual readings.
8. Feedback submission queues for moderation; users cannot set status or view another user's private submissions.
9. No UI implies live hardware monitoring without a verified device integration.

## 10. Current implementation gap

The current repository contains a structured setup wizard, deterministic calculator, rule-based advice, saved plans, manual monitoring, Supabase Auth, and moderated feedback. The conversational AI UI and its Edge Function were removed; the AI quota migrations are historical and their quota objects were later cleaned up. Therefore, the AI-first requirements above are the intended product direction, **not a claim that AI currently runs in the app**. The AI intake UI, server-side AI endpoint, provider configuration, response validation, abuse controls, and AI-specific tests remain to be implemented.

## 11. Decisions to resolve before AI implementation

- Select the model provider, model, budget, and data-retention terms.
- Decide whether guests receive AI access and what rate/abuse controls apply.
- Approve what conversational data may be sent to the provider and whether any transcript is saved.
- Decide whether to keep the existing wizard as an alternate/manual mode or progressively replace it with advisor-led intake.
- Define the first release's language/localization needs and supported appliance catalog regions.
