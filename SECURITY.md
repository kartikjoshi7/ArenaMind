# Security Policy for ArenaMind

## Supported Versions
ArenaMind is currently in active development for the Virtual Prompt Wars Hackathon.
Only the `main` branch is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability
If you discover a security vulnerability within ArenaMind, please do NOT file a public issue.
Instead, please contact the maintainers directly via the Hack2Skill portal or via private email.

## AI Security & Watsonx Integration
ArenaMind strictly isolates its AI capabilities to the `ibm-watsonx-ai` SDK.
- **Prompt Injection:** We actively sanitize all incoming fan queries using regex bounds to strip `[<>{}[\]]` characters before they reach the Granite models.
- **Credentials:** Watsonx API keys and Project IDs are NEVER exposed to the React frontend. They remain strictly on the Render backend environment.
- **Rate Limiting:** IP-based rate limiting (SlowAPI) is enforced on all endpoints to prevent AI token exhaustion attacks.

## HTTP Header Security
All REST endpoints serve the following hardened security headers via custom FastAPI middleware:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
