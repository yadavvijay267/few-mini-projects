# Serverless API — Documentation

Two runtimes, one shared router (`src/shared.js`): a **Cloudflare Worker**
(`src/index.js`) and an **AWS Lambda** handler (`src/lambda.js`).

## Endpoints (identical on both)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check + task count. |
| POST | `/api/auth/register` | — | `{ name, email, password }` -> `201` user. |
| POST | `/api/auth/login` | — | Returns a real HMAC-SHA256 JWT (1h). |
| GET | `/api/tasks` | Bearer | List your tasks. |
| POST | `/api/tasks` | Bearer | Create `{ title }`. |
| PATCH | `/api/tasks/:id` | Bearer | `{ title?, done? }`. |
| DELETE | `/api/tasks/:id` | Bearer | Delete. |
| GET | `/api/logs` | Bearer | Request log (last 50). |

## Scheduled job

A daily summary (date, user count, total tasks, per-user done/total) runs via:

- **Worker:** `scheduled()` in `src/index.js`, cron in `wrangler.toml`
  (`0 7 * * *` — 07:00 UTC daily).
- **Lambda:** `scheduledHandler` in `src/lambda.js`, EventBridge rule in
  `template.yaml` (`rate(1 day)`).

In production the summary is emailed or posted to a webhook; here it is
logged and returned.

## Local development (no wrangler / SAM needed)

```bash
node scripts/dev.js     # serves the Worker handler at http://localhost:8787
npm test                # invokes BOTH handlers directly + scheduled jobs
```

## Deploy

```bash
# Cloudflare Workers
npx wrangler deploy

# AWS Lambda (SAM)
sam build && sam deploy --guided
```

## Cost report

See [`docs/COST.md`](COST.md) — this API costs **$0/month** at current usage.
