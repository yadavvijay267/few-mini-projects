# URL Shortener Backend (with Analytics)

A full shortener backend: short codes, custom aliases, click analytics, and
expiry — built with **Node.js built-ins only** (zero dependencies).

## Features

- Short-code generation (6-char base62) with collision handling and custom
  aliases (`409` on a taken alias)
- Click analytics per link: total, per-day, referrer, country, device type
- Link expiry dates and (de)activation
- API-key auth (`X-API-Key`) for programmatic use
- QR code endpoint (`/qr/:code`, SVG) and a small analytics dashboard (`/dashboard`)
- JSON persistence — links survive a restart

## Tech stack

Node.js (built-in `http` + `crypto` + `fs` only) · JSON file store
(swap for PostgreSQL + Redis in production)

## How to run

```bash
node src/server.js          # http://localhost:3005
npm test                    # create/redirect/analytics/expiry/persistence tests
```

Set `API_KEY` in production (see `.env.example`).

## Quick demo

```bash
curl -X POST localhost:3005/api/links -H "X-API-Key: demo-api-key-change-me" \
  -H 'Content-Type: application/json' -d '{"url":"https://example.com/long","customAlias":"fiber"}'
curl -i localhost:3005/fiber
curl localhost:3005/api/links/fiber/stats -H "X-API-Key: demo-api-key-change-me"
```

Full docs: [`docs/API.md`](docs/API.md).

## Screenshots

See [`screenshots/`](screenshots/SCREENSHOTS.md).

## License

MIT — see [LICENSE](LICENSE).
