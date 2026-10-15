# PowerUp security status

This file records verified security work. It was empty before the first review on 2026-10-15. Deployment-specific findings below are limited to the responses and settings that were accessible during the review.

## Step 1 — Website response headers (2026-10-15)

**Status: production response headers verified; live login and AI Advisor functionality reported by the user.**

### Deployed baseline

A direct HTTPS request to `https://power-up-tau.vercel.app/` returned `200 OK` and `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. That response did not contain a Content Security Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`. Vercel's existing HSTS setting was left unchanged.

### Local implementation

Matching `vercel.json` files at the repository root and in `frontend/` define those five missing headers. Both locations are present because the Vercel project root setting could not be read: the detailed Vercel API returned 403 and the settings page required a login. Only the file in Vercel's configured project root is used.

The Content Security Policy permits production scripts from this site, the configured Supabase project's HTTPS and WebSocket endpoints for authentication, APIs, and the AI Advisor, and the Google stylesheet and font hosts used by the page. Existing React components use inline styles, so `style-src` currently permits inline styles. Inline scripts are not permitted. The policy blocks plugin objects and framing.

### Verification performed

- Both Vercel configuration files parsed as JSON, matched byte for byte, contained the expected headers and resource origins, and did not allow inline scripts.
- The production build completed with `npm --prefix frontend run build`.
- Existing automated tests passed: backup upgrades 10/10, monitoring data 3/3, AI Advisor 18/18.
- A local server applied the configured headers to the production build. Its response contained all five headers. The home and sign-in views rendered in a browser with no reported console warnings or errors during those checks.

### Pending verification and limits

- Header delivery on the public Vercel site was verified after deployment, as recorded below. This does not by itself prove that every signed-in workflow works under the policy.
- Signed-in Supabase authentication and a live AI Advisor request were not exercised in the local browser because no test account was available. The policy includes their confirmed Supabase origin, and the existing AI Advisor automated tests passed.
- If the production Supabase project URL changes, update the Content Security Policy in both Vercel files before deploying the new URL.
- Allowing inline styles supports the current React components but is less restrictive than a nonce or hash based style policy. Tightening it requires separate compatibility work.

### Pre-deployment recheck (2026-10-15)

- A second direct request to `https://power-up-tau.vercel.app/` returned `200 OK`. HSTS was still present with `max-age=63072000; includeSubDomains; preload`; the five new headers were still absent. The live fix is **not verified**.
- Local `main` was at the same commit as `origin/main` (`eaab7f1`). The two Vercel configuration files and this existing `SECURITY.md` were untracked. Other unrelated source edits were present, so only these three Step 1 files should be staged for a header-only deployment.
- The two Vercel configuration files were still identical and parsed as JSON. The configured project root in Vercel remains unverified because detailed Vercel access returned 403 and its settings page required login. The duplicate configuration covers the repository root and `frontend/` layouts.
- No deployment was performed during this recheck. A post-deployment header check and signed-in browser checks for Supabase authentication and AI Advisor requests remain pending.

### Production verification (2026-10-15)

- The user confirmed that Vercel's Root Directory setting is blank, meaning the repository root. The root `vercel.json` is therefore the intended Vercel configuration file. This setting was reported by the user; it was not independently visible through the Vercel connector.
- The repository was already clean at commit `6e3bb34` on both local `main` and `origin/main` when this verification began. That commit includes the two Vercel configuration files, this document, and other application edits. No commit, push, or deployment was performed by the security review agent.
- A direct HTTPS request to `https://power-up-tau.vercel.app/` returned `200 OK` with all five new headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`. The CSP value included the configured Supabase HTTPS and WebSocket origin and the Google Fonts origins.
- The existing `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` header was still present.
- The public home and sign-in views rendered in a browser with no reported console warnings or errors during those checks. The browser's asset inventory showed a request for the Google Fonts stylesheet. A Google font file download was not independently confirmed with the available browser instrumentation.
- The user reported that Supabase login worked on the live PowerUp site after the security headers went live. The security review agent did not independently complete a sign-in or inspect its authenticated network request.
- The user reported that the AI Advisor worked correctly on the live PowerUp site. This is a functional test result reported by the user; the security review agent did not independently perform an authenticated Advisor request.
- These functional results do **not** verify all security aspects of Supabase authentication or the AI Advisor, including authorization boundaries, request quotas, error handling, or data protection.

Steps 2 through 4 from the security assessment have not started.
