# URL Shortener Backend — Documentation

Base URL: `http://localhost:3005` · Dashboard: `/dashboard`

## Auth

Creating, listing, and managing links needs `X-API-Key: <key>`
(default `demo-api-key-change-me`; set `API_KEY` in production).
Redirects and QR codes are public.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/links` | Create. Body `{ url, customAlias?, expiresAt? }`. Returns the code, `shortUrl`, and `qrUrl`. |
| GET | `/api/links` | List all links (click arrays omitted). |
| GET | `/api/links/:code/stats` | Analytics: total, per-day, referrer, country, device. |
| PATCH | `/api/links/:code` | `{ active: bool, expiresAt }` — deactivate / re-activate / change expiry. |
| DELETE | `/api/links/:code` | Delete a link. |
| GET | `/:code` (or `/r/:code`) | 302 redirect to the destination; records a click. |
| GET | `/qr/:code` | SVG QR-style code for the short link. |
| GET | `/health` | Health check. |

## Analytics

Every redirect records: timestamp, day, referrer (`direct` if none),
country (from `Accept-Language` in this demo; production uses geoip-lite on
the client IP), and device type parsed from the User-Agent
(mobile / tablet / desktop / bot).

```bash
curl localhost:3005/api/links/abc123/stats -H "X-API-Key: demo-api-key-change-me"
# { totalClicks, byDay: {"2026-11-12": 4}, byReferrer, byCountry, byDevice }
```

## Example

```bash
curl -X POST localhost:3005/api/links -H "X-API-Key: demo-api-key-change-me" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/a-very-long-page","customAlias":"fiber"}'
curl -i localhost:3005/fiber        # 302 -> destination, click recorded
```

Links persist in `data/links.json` and survive restarts.
