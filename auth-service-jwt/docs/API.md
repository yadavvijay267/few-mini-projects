# Authentication Service — API Documentation

Base URL: `http://localhost:3002`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register. Body `{ name, email, password, role? }`. Returns user + access/refresh tokens + a verification token (demo: returned once; in production it is emailed via Nodemailer/Ethereal). |
| POST | `/api/auth/login` | — | Log in. Returns user + token pair. 5 failed attempts lock the account for 15 minutes. |
| POST | `/api/auth/refresh` | refresh token in body | **Rotates**: issues a new pair and revokes the old refresh token. Reusing an old token returns 401. |
| POST | `/api/auth/logout` | refresh token in body | Revokes the refresh token (revocation list). |
| POST | `/api/auth/verify-email` | verification token | Marks the email verified. |
| POST | `/api/auth/forgot-password` | — | Always returns 200 (no email probing). Demo returns the reset token; production emails it. |
| POST | `/api/auth/reset-password` | reset token | Sets a new password and revokes **all** of the user's refresh tokens. |
| GET | `/api/auth/me` | Bearer access token | Current user profile. |
| GET | `/api/admin/users` | Bearer + `admin` role | List all users. Non-admins get 403. |
| GET | `/health` | — | Health check. |

## Token details

- **Access token**: JWT, HMAC-SHA256, 15-minute expiry, claims `sub`, `email`, `role`.
- **Refresh token**: random 48-byte token (SHA-256 hashed at rest), 7-day expiry,
  single-use — every refresh rotates it and revokes the previous one.
- Passwords: scrypt (64-byte) with a per-user salt. Tokens are never stored in
  plain text; only SHA-256 hashes of refresh/reset/verify tokens are kept.

## Example

```bash
curl -s -X POST localhost:3002/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Tester","email":"a@test.dev","password":"secret123"}'

curl localhost:3002/api/auth/me -H "Authorization: Bearer $ACCESS"
```

## Threat model

See [`docs/THREAT_MODEL.md`](THREAT_MODEL.md).
