# Serverless API (Cloudflare Workers / AWS Lambda)

A serverless API (auth, CRUD, scheduled jobs) with zero servers to manage —
one shared router running on **both** Cloudflare Workers and AWS Lambda,
tested locally without wrangler or SAM.

## Features

- REST endpoints with JWT auth (real HMAC-SHA256) and validation
- A scheduled cron job (daily summary) on both runtimes
- Request logging and error tracking (`GET /api/logs`)
- Local dev with a plain Node script — no cloud account needed to try it
- Deploy scripts for both platforms (`wrangler deploy`, `sam deploy`)
- **Cost report: $0/month at current usage** (see [`docs/COST.md`](docs/COST.md))

## Tech stack

Node.js (built-ins only) · Cloudflare Workers · AWS Lambda + API Gateway ·
EventBridge cron

## How to run

```bash
node scripts/dev.js     # Worker handler served at http://localhost:8787
npm test                # invokes Worker + Lambda handlers + scheduled jobs
```

## Quick demo

```bash
curl -s -X POST localhost:8787/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Tester","email":"a@test.dev","password":"secret123"}'
curl -s -X POST localhost:8787/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"a@test.dev","password":"secret123"}'
curl localhost:8787/api/tasks -H "Authorization: Bearer $TOKEN"
```

Full docs: [`docs/API.md`](docs/API.md).

## Screenshots

See [`screenshots/`](screenshots/SCREENSHOTS.md).

## License

MIT — see [LICENSE](LICENSE).
