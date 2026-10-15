01. Always Validate on the Server
Relying only on client-side validation is a top beginner mistake. Attackers can send requests directly to your API, bypassing frontend checks entirely.
Your server should validate:
- Data types and required fields
- String length, allowed values, email formats
- File types/sizes, usernames
- Authorization requirements
Rule: Client-side validation = UX. Server-side validation = the actual security boundary. Use both.
02. Protect Login With Rate Limiting
Without rate limiting, an attacker can send thousands of login attempts for credential stuffing or password guessing.
Base limits on:
- IP address
- Account identifier
- Device/session signals
- Time window
Also layer in: CAPTCHA/bot detection, MFA, risk signals, delays, and credential-stuffing detection.
Goal: Make automated attacks expensive, not lock out real users.
03. Never Store Passwords in Plain Text
Passwords should not simply be "encrypted" — use a purpose-built password-hashing algorithm. Store the hash, never the original password. Salts make large-scale cracking far harder after a leak.
Flow: Password entered → hashing/verification → compare with stored hash → allow or reject.
Prefer Argon2id for new apps; bcrypt is a solid alternative. Never invent your own algorithm.
04. Don't Leak Information Through Errors
"Email doesn't exist" lets attackers enumerate valid accounts. Use "Invalid email or password" instead — it reveals nothing about which part was wrong.
Also avoid exposing:
- Database errors & stack traces
- API keys & internal file paths
- Framework/debug information
- Sensitive user information
Dev vs. Prod: Detailed errors are fine in development. In production, show safe messages; keep diagnostics in protected server logs.
05. Don't Build Authentication From Scratch If You Don't Have To
Login → verify → create session looks simple, but secure authentication involves many moving parts where small mistakes become serious vulnerabilities.
Involves:
- Password hashing, session management, cookies
- CSRF protection, MFA, password reset
- Email verification, account recovery
- Session expiration, token handling, OAuth/OIDC, brute-force protection
Consider: Firebase Authentication, Clerk, Auth0, or an established library for your stack. Using a provider doesn't make you secure automatically — you still must configure authorization, APIs, database access, secrets, and sessions correctly.