# PowerUp

PowerUp helps households plan backup power for load-shedding. Enter your backup system and appliance list to calculate battery runtime, load, inverter and surge checks, and practical operating recommendations. The results also compare larger battery-bank scenarios when the current system falls short and the available specifications support a comparison.

## Features

- Backup setup for inverter, solar, generator, or no installed system
- Appliance presets and custom appliance entries
- Battery capacity, runtime, inverter-load, and surge calculations
- Rule-based outage recommendations and outage timeline
- Battery capacity upgrade comparisons
- Optional accounts, private saved plans, and moderated community feedback through Supabase
- Private monitoring for saved backup plans with optional manual readings and historical trends

## Run locally

```sh
npm install
npm run dev
```

Supabase is optional for guest calculations. To enable accounts, saved plans, manual system readings, and feedback, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, then follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Monitoring uses the saved plan as the system record; it does not connect to equipment or display live telemetry.

## Validation

```sh
npm run test:backup-upgrades
npm run test:monitoring-data
npm run test:ai-advisor
npm run build
```

The upgrade tests exercise the PowerUp calculation engine and its battery comparison scenarios. The Advisor tests use a mocked provider and cover input validation, confirmation boundaries, grounded explanations, and failure handling. Database contract tests require a local Supabase stack and Docker; see the setup guide.

The AI Advisor interface is available from Home and navigation. It gathers conversation details as suggestions, requires explicit confirmation, and passes reviewed inputs to the existing calculator wizard. The results page calculates locally and can request an AI explanation grounded in those results; an unavailable or mismatched explanation leaves the calculation and rule-based advice in place. Explicit plan saving still stores the confirmed inputs and local calculation in the existing `backup_plans` record. A hosted AI response requires the new Edge Function, its quota migration, and server-only secrets; these have not been deployed by the repository changes. The manual calculator remains available. See [AI_ADVISOR_CONTRACT.md](AI_ADVISOR_CONTRACT.md) and [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

Monitoring offers an explicit AI explanation for the selected saved plan. It sends only that plan's confirmed specifications to the advisor; manual readings and notes remain separate and are never sent for diagnosis. Switching systems reloads that system's stored readings and clears the previous explanation.
