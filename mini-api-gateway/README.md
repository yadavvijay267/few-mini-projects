# Rate Limiter & API Gateway (Mini)

A small API gateway: routing, auth verification, per-key rate limiting, and request/response logging — built with Node.js built-ins only.

## Features
- Route table with per-route upstream services (two demo upstreams, genuinely proxied over HTTP)
- Token-bucket rate limiting per API key, with `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers and `Retry-After` on 429
- Auth check: `X-Api-Key` or HMAC-signed Bearer token (`POST /token` mints one)
- Structured access logs (`GET /logs`) and a health endpoint (`GET /health`)
- **Standout:** a live quota dashboard (`/`) showing per-key usage against its limit, updated in real time

## Tech Stack
Node.js built-ins only. Production path: Redis-backed buckets + JWT verification (see `docs/ARCHITECTURE.md`).

## How to Run
```bash
node src/gateway.js
# gateway on http://localhost:3003, upstreams on :3101 and :3102
```
```bash
curl -H "X-Api-Key: demo-key-123" localhost:3003/api/users
curl -H "X-Api-Key: demo-key-123" localhost:3003/api/posts
curl localhost:3003/quota
# 11 rapid requests with the demo key (burst 10) -> the 11th returns 429
```

## Tests
```bash
node tests/test.js
```
The test proves the rate limiter blocks over-limit requests (expects a 429 with `Retry-After`).

## Screenshots
See `screenshots/` — add `quota-dashboard.png`.

## License
MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
