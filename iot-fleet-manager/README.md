# IoT Device Fleet Manager

Manage a fleet of IoT devices: provisioning, firmware updates, health and
remote commands. The platform behind every large IoT deployment.

## Features

- Device registry with provisioning keys and groups
- **Over-the-air firmware update campaigns with staged rollouts** — push
  to 10% of devices first, then the rest, with automatic rollback on errors
- Device health (last seen, battery, signal) and offline alerts
- Remote commands (reboot, config push) with a full audit log
- Simulated telemetry — works with no hardware

## How to run

```bash
python3 src/fleet.py provision --name sensor-01 --group warehouse
python3 src/fleet.py list
python3 src/fleet.py telemetry --simulate
python3 src/fleet.py firmware --version 2.4.0 --rollout 10
python3 src/fleet.py firmware --version 2.4.0 --rollout 100
python3 src/fleet.py command --device sensor-01 --cmd reboot
python3 src/fleet.py audit
python3 src/fleet.py --help
```

Web UI: open `src/index.html` — registry, health, staged rollout with a
progress bar, and the audit log.

## License

MIT — see `LICENSE`.
