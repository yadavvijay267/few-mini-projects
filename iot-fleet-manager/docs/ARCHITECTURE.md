# Architecture — IoT Device Fleet Manager

`src/fleet.py` — JSON-file-backed CLI (state in `fleet-state.json` next to
the script; the repo ships a sample in `assets/sample-devices.csv`):

- `provision(name, group)` — creates a device with a random 32-hex
  provisioning key, firmware version and group
- `telemetry(simulate=True)` — random-walk battery/signal/temperature per
  device, updates `last_seen`; devices silent > 10 min are flagged offline
- `firmware(version, rollout_pct)` — staged rollout: the first
  `rollout_pct`% of devices (deterministic order) are updated; each update
  has a small simulated failure chance (seeded in tests to 0); any device
  that fails is **rolled back** to its previous version and the campaign
  pauses — the rest only proceed on a later, larger rollout call
- `command(device, cmd)` — reboot / config-push, recorded in the audit log
- `audit()` — append-only list of every action with timestamps

`src/index.html` — same model in JS with localStorage persistence:
registry table with health badges, a firmware campaign panel with a
staged-rollout slider and progress bar, offline alerts, and the audit log.

Tests use a temp state file and assert provisioning uniqueness, staged
rollout percentages, rollback on failure, and offline detection.
