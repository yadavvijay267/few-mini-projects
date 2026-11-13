# Threat Model

What this service protects against, and what it explicitly does **not** cover.

## Covered

| Threat | Mitigation |
|--------|-----------|
| Password theft from a database leak | scrypt hashing with per-user salt; passwords never logged or returned |
| Stolen refresh token | Rotation: a refresh token is single-use; reuse of an old token is detected (401) and the whole chain can be revoked |
| Stolen access token | Short 15-minute lifetime; logout/revocation list for refresh tokens; password reset revokes all sessions |
| Brute-force login guessing | 5 failed attempts -> 15-minute account lockout; generic "Invalid email or password" errors |
| Email enumeration via password reset | `/forgot-password` always returns 200, whether or not the email exists |
| Token forgery | HMAC-SHA256 with a server-side secret; `timingSafeEqual` on signature comparison |
| Privilege escalation | Role is embedded in the signed JWT and checked server-side on `/api/admin/*` |

## NOT covered (by design — production hardening needed)

- **Persistence**: all state is in memory; a restart wipes users and tokens.
  Production: PostgreSQL + Redis revocation list.
- **Email delivery**: verification/reset tokens are returned in the demo response;
  production must send them via Nodemailer (Ethereal for tests, real SMTP live)
  and never return them.
- **HTTPS**: tokens must only travel over TLS; this demo serves plain HTTP locally.
- **Secret management**: `JWT_SECRET` defaults to a dev value — set a long random
  secret via environment in production and rotate it with a key-version plan.
- **Distributed lockout**: login-attempt counters are per-process; production
  needs a shared store (Redis) behind multiple instances.
