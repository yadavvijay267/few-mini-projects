# Authentication Service (JWT + Refresh Tokens)

A standalone auth microservice: register, login, refresh, logout, email
verification, password reset, and role-based access — built with **Node.js
built-ins only** (zero dependencies).

## Features

- **Access + refresh token rotation with revocation list** — every refresh
  issues a new pair and revokes the old token; reusing a revoked token fails
- Email verification and password-reset flow (tokens returned in the demo
  response; in production they are emailed — see docs)
- Role-based access control (`admin` / `user`) on `/api/admin/*`
- Brute-force protection: 5 failed logins lock the account for 15 minutes
- Real JWTs: HMAC-SHA256 signing/verification with `crypto`, 15-minute
  access tokens, 7-day refresh tokens
- Passwords hashed with scrypt + per-user salt; only SHA-256 hashes of
  refresh/reset/verify tokens are stored

## Tech stack

Node.js (built-in `http` + `crypto` only) · in-memory store (swap for
PostgreSQL) · scrypt · HMAC-SHA256 JWT

## How to run

```bash
node src/server.js          # http://localhost:3002
npm test                    # full lifecycle integration tests
```

Set `JWT_SECRET` in production (see `.env.example`).

## Quick demo

```bash
curl -s -X POST localhost:3002/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Tester","email":"a@test.dev","password":"secret123"}'
# -> { user, accessToken, refreshToken, verificationToken }

curl -X POST localhost:3002/api/auth/refresh -H 'Content-Type: application/json' \
  -d "{"refreshToken":"$REFRESH"}"
# -> new pair; the old refresh token is now revoked
```

Full docs: [`docs/API.md`](docs/API.md) · threat model:
[`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## Screenshots

See [`screenshots/`](screenshots/SCREENSHOTS.md).

## License

MIT — see [LICENSE](LICENSE).
