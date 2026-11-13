# 86. Log Aggregation & Monitoring Stack

Centralised logs and metrics for a sample app: a Python log shipper/parser
ingests logs, a dashboard lets you search/filter them and see error-rate,
latency and request-rate stats, and alert rules fire with a runbook link.
The production path (Loki + Promtail + Prometheus + Grafana) is provided as
Docker Compose — the local dashboard works with zero infrastructure.

## Features

- Log shipper/parser (`src/shipper.py`) — parses Nginx-style + JSON logs, ships to a JSONL store
- Dashboard (`src/dashboard/`) — search, level/service filter, error-rate, latency p50/p95, request rate
- Alert rules (`src/alerts.yaml`) — error rate > 1% for 5 min, p95 latency > 500 ms; every alert links to a runbook
- Sample log generator (`src/generate_logs.py`) — realistic traffic with a planted incident
- Production stack: Grafana Loki + Promtail + Prometheus + Grafana via `docker-compose.yml`

## Tech stack

Python 3 (stdlib), Docker Compose, Grafana Loki + Promtail, Prometheus, Grafana

## How to run

```bash
python3 src/generate_logs.py --lines 500        # make sample logs
python3 src/shipper.py                          # parse + ship to data/parsed.jsonl
python3 -m http.server 8000 --directory src/dashboard   # open http://localhost:8000
# Production stack:
docker compose up -d                            # Loki + Promtail + Prometheus + Grafana
# Tests:
python3 tests/test_stack.py
```

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
