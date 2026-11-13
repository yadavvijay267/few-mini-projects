# Mini API Gateway — Architecture

## Request flow
```
client → gateway :3003 → auth check → route match → token-bucket limit → upstream (:3101/:3102)
```

## Components
- `src/gateway.js` — HTTP server: route table, auth, rate limiting, structured JSON access logs, `/health`, `/quota`, `/logs`, `/token`, dashboard at `/`.
- `src/rateLimiter.js` — token bucket per key: `capacity` burst tokens, refilled continuously at `refillPerSecond`. Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` on 429.
- `src/upstreams.js` — two demo upstream services (users :3101, posts :3102) so the gateway genuinely proxies HTTP.
- `src/dashboard.html` — live quota dashboard: per-key usage vs limit, updated every 2 s, plus recent access log.

## Route table
| Prefix | Upstream |
|---|---|
| `/api/users` | users-service :3101 |
| `/api/posts` | posts-service :3102 |

## Auth
- `X-Api-Key` header with a known key (`demo-key-123`: burst 10, 1/s refill; `pro-key-456`: burst 100, 10/s refill), or
- `Authorization: Bearer <token>` where the token is HMAC-SHA256 signed by the gateway (`POST /token` mints one, valid 1 h). This stands in for JWT verification — production path is real JWT (e.g. `jsonwebtoken` verify with a public key) plus per-route scopes.

## Rate limiting
Token bucket per key. A burst of `capacity` is allowed, then requests are paced at `refillPerSecond`. Over-limit requests get `429` with `Retry-After` seconds. State is in-memory here; production path is Redis (one bucket per key, atomic `INCR` + TTL or a Redis-backed token bucket) so limits hold across gateway replicas.

## Logging
Every request logs one structured JSON line: `{ ts, method, path, status, ms, key, rateLimited? }`. The last 500 are kept in memory and served at `GET /logs`.
