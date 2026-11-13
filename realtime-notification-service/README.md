# Real-Time Notification Service

Delivers notifications over Server-Sent Events, email, and webhook, with
user preferences, a delivery queue with retries and a dead-letter list, a
delivery log, read/unread tracking, templates, and digest mode — built with
**Node.js built-ins only** (zero dependencies).

## Features

- **SSE live delivery** with per-user pub/sub, unread replay on reconnect,
  and heartbeats; demo dashboard at `/`
- **Multi-channel**: SSE + email stub + webhook stub, toggled per user
- **Queue with retries** (3 attempts) and dead-letter handling
- **Delivery log** and read/unread inbox per user
- **Template system** (`welcome`, `order-shipped`, `alert`, `reminder`)
- **Digest mode**: low-priority notifications batch into one daily summary
  per user instead of spamming them

## Tech stack

Node.js (built-in `http` + `crypto` only) · in-memory queue/store (swap for
Redis + PostgreSQL + BullMQ in production)

## How to run

```bash
node src/server.js          # http://localhost:3004, dashboard at /
npm test                    # SSE delivery, offline replay, digest tests
```

## Quick demo

```bash
curl -N "localhost:3004/events?userId=alice" &
curl -X POST localhost:3004/api/notify -H 'Content-Type: application/json' \
  -d '{"userId":"alice","type":"welcome","data":{"name":"Alice"}}'
```

Full docs: [`docs/API.md`](docs/API.md).

## Screenshots

See [`screenshots/`](screenshots/SCREENSHOTS.md).

## License

MIT — see [LICENSE](LICENSE).
