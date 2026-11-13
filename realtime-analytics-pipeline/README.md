# Real-Time Analytics Pipeline (Mini)

A small streaming pipeline: events in, aggregates out, live dashboard.
An event generator produces simulated clicks and orders, an in-memory
stream processor computes windowed aggregates, and a live dashboard
updates over server-sent events.

## Features

- Event producer: simulated page views, clicks and orders.
- Windowed aggregates: per-minute counts, top pages, revenue per minute.
- Live dashboard updating over SSE (no JavaScript framework needed).
- Late-event handling with a documented policy and a dead-letter log.
- CLI demo mode that prints aggregates without any server.

## Tech stack

- Python 3.10+ standard library only (no Kafka, no dependencies).
  Kafka/Redpanda is documented in `docs/ARCHITECTURE.md` as the
  production path.

## How to run

```bash
python3 src/pipeline.py --demo --seconds 30     # CLI demo
python3 src/server.py --port 8000               # live dashboard
# then open http://localhost:8000
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
