# Background Job Queue System

A job queue with priorities, retries, scheduling, and a monitoring dashboard — built with Node.js built-ins only (no Redis required to run it).

## Features
- Job types with priorities, delays, and cron-style repeats (`repeatMs`)
- Automatic retries with exponential backoff (1s → 2s → 4s, capped at 30s) and a dead-letter queue
- Real-time dashboard: queued / running / failed / dead counts and job details
- **Standout:** a "Replay dead-letter" button in the dashboard re-queues failed jobs with one click
- In-memory queue with JSON persistence (`jobs.json`) — jobs survive restarts
- Graceful shutdown that finishes in-flight jobs

## Tech Stack
Node.js (built-ins only — `http`, `fs`). Production path is Redis + BullMQ, documented in `docs/ARCHITECTURE.md`.

## How to Run
```bash
node src/server.js
# open http://localhost:3001
```
Enqueue a job:
```bash
curl -X POST localhost:3001/jobs -H 'Content-Type: application/json' \
  -d '{"type":"sendEmail","payload":{"to":"a@example.com","subject":"Hi"}}'
curl localhost:3001/stats
```

## Tests
```bash
node tests/test.js
```

## Screenshots
See `screenshots/` — add `dashboard.png` and `dead-letter-replay.png`.

## License
MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
