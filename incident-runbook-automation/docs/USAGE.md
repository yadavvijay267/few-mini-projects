# Usage — Incident Runbook Automation

```bash
python3 src/runbooks.py list
python3 src/runbooks.py run ups-on-battery --dry-run
python3 src/runbooks.py run ups-on-battery --execute --operator Clamor
python3 src/runbooks.py audit
python3 -m pytest tests/ -q
```

Dry-run is the default: no check command executes and nothing is
remediated. `--execute` runs the checks for real. Steps marked
`requires_confirmation` stop at `awaiting-confirmation` — the operator
confirms them in the UI (FastAPI + React in the real stack) before the
runbook continues. Every run is appended to `assets/audit.jsonl`.
