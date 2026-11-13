# System Health Monitor (Desktop)

A cross-platform tool that logs CPU, memory, disk and network usage, shows
it live in the terminal, alerts when thresholds are crossed, and turns the
log into PNG summary charts.

## Features

- **Live terminal view** — CPU / memory / disk bars plus network totals,
  refreshed on a configurable interval
- **Threshold alerts** — breaches are printed, written to `alerts.log`, and
  (if `plyer` is installed) shown as a desktop notification
- **Top-processes snapshot** — whenever an alert fires, the top 5 processes
  by CPU are captured alongside it, so you can see *what* caused the spike
- **CSV logging** — every sample is appended to a log file
- **PNG reports** — hourly/daily-style summary charts from the log
- **Config file** — thresholds and interval in `assets/config.json`

## Tech stack

Python 3, [psutil](https://psutil.readthedocs.io/) for system metrics,
matplotlib for charts. `plyer` (desktop notifications) is optional.

## How to run

```bash
pip install -r requirements.txt

# One-shot demo report + sample chart
python3 src/monitor.py --demo

# Live monitoring (Ctrl+C to stop)
python3 src/monitor.py --live
python3 src/monitor.py --live --duration 60 --interval 5

# Use your own thresholds
python3 src/monitor.py --config assets/config.json --live

# Build a PNG chart from the CSV log
python3 src/monitor.py --report --out health_report.png
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
python3 -m pytest tests/ -v
```

## License

MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
