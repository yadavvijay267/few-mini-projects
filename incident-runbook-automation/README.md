# Incident Runbook Automation

Executable runbooks for data-centre incidents: step-by-step checks,
auto-remediation scripts, and an audit log.

## Features

- Runbook library (e.g. "UPS on battery", "CRAC failure", "network flap").
- Each step has a check (automated where possible) and a manual
  confirmation.
- Auto-remediation actions with a **dry-run mode** — rehearse an
  incident response without touching production.
- Full audit log of who did what and when.

## Tech stack

- Python 3.10+, standard library only for the demo engine.
- Real-stack path: Python, FastAPI, React, SQLite — see `docs/USAGE.md`.

## How to run

```bash
python3 src/runbooks.py list
python3 src/runbooks.py run ups-on-battery --dry-run
python3 src/runbooks.py run crac-failure --dry-run --operator Clamor
python3 src/runbooks.py audit
python3 -m pytest tests/ -q
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
