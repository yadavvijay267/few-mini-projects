# Job Queue System — Architecture

## Design
- `src/queue.js` — the queue: enqueue, priority ordering, delayed jobs (`runAt`), worker loop (`processDue`), retries with exponential backoff (1s → 2s → 4s …, capped at 30s), dead-letter status after `maxAttempts`, replay, JSON persistence (`jobs.json`), graceful shutdown (in-flight jobs finish; `running` jobs are re-queued).
- `src/handlers.js` — job-type handlers: `sendEmail`, `generateReport`, `processImage`, `alwaysFail` (demo). Register new types with `queue.register(type, fn)`.
- `src/server.js` — HTTP API + dashboard (`src/dashboard.html`), live counts, **Replay dead-letter** button.

## API
| Method | Path | Description |
|---|---|---|
| POST | /jobs | Enqueue: `{type, payload, priority?, delayMs?, maxAttempts?, repeatMs?}` |
| GET | /jobs?status= | List jobs |
| GET | /jobs/:id | One job |
| POST | /jobs/:id/replay | Re-queue a dead-letter job |
| GET | /stats | Counts + known types |
| GET | / | Dashboard |

Cron-style repeats: pass `repeatMs` — on completion the job re-enqueues itself after that interval.

## Production path (Redis + BullMQ)
This repo intentionally needs no Redis so it runs anywhere. For production, replace the store in `queue.js` with BullMQ: same concepts map directly — priorities, delayed jobs, attempts/backoff, repeatable jobs, and a dead-letter queue (BullMQ calls it a failed set). The API, dashboard, and handler signatures stay the same.

## Graceful shutdown
On SIGINT/SIGTERM the worker loop stops taking new jobs, in-flight jobs finish, and any job still `running` is re-queued instead of being lost.
