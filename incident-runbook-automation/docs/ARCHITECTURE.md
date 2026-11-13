# Architecture

## Runbook format

```yaml
id: ups-on-battery
title: UPS on battery
severity: 1
description: ...
steps:
  - id: check-ups
    type: check
    name: Check UPS status
    check: ups_on_battery        # a named check in src/checks.py
  - id: shed-load
    type: command
    name: Shed non-critical load
    command: shed-non-critical-load
  - id: notify-noc
    type: notify
    name: Notify NOC
    channel: noc
    message: "UPS on battery in Hall A"
  - id: confirm-generator
    type: manual
    name: Confirm generator started
    prompt: "Has the generator started and taken load?"
```

## Step types

- **check** — a named function in `src/checks.py`. Checks are simulated
  against `assets/simulated_state.json` (UPS state, CRAC temperatures,
  link status) so the system works with no hardware; in production a
  check would query the real BMS / monitoring API. A failed check stops
  the run (unless `on_failure: continue`).
- **command** — a key in the allow-list in `src/runner.py`. The runner
  maps the key to a small, safe shell command (`echo ...` in this repo,
  standing in for the real remediation script). Arbitrary commands are
  refused. In `--dry-run` the command is printed, not executed.
- **notify** — simulated: writes the notification to the audit log and
  stdout. Production would call the real webhook / email.
- **manual** — prints the prompt and waits for `y/n` (or `--auto` answers
  yes, for drills and tests).

## Audit log

Every run writes one JSON line per step to `logs/audit.jsonl`:
`{run_id, runbook, step, type, status, operator, timestamp, detail}`.
`--history` replays it. Nothing is overwritten — the log is append-only.

## Production path

Point checks at the real monitoring/BMS APIs, replace the simulated
commands with the real remediation scripts (kept in the allow-list),
wire notifications to the real paging system, and store the audit log in
a database with the operator identity from SSO. Keep the dry-run mode —
it is the feature that lets teams rehearse safely.
