# Architecture

```
src/monitor.py
├── snapshot()          psutil -> one dict of CPU/mem/disk/net readings
├── check_thresholds()  pure function: reading + limits -> breaches
├── top_processes()     psutil process table, sorted by CPU
├── log_snapshot()      append reading to CSV (header on first write)
├── handle_alerts()     breach -> alerts.log + top processes + plyer
├── live_loop()         sample -> print -> log -> alert, every N seconds
└── make_report()       CSV -> 3-panel matplotlib PNG chart
```

## Design choices

- **Threshold checking is a pure function** (`check_thresholds`) so it is
  trivially testable without touching the machine.
- **Logging is append-only CSV** — any spreadsheet or pandas can read it,
  and a crashed run never corrupts earlier data.
- **Alerts capture context, not just a number**: the top-5 process snapshot
  is written into the same alert entry, which is what makes a spike
  diagnosable after the fact.
- **matplotlib uses the Agg backend**, so `--report` works on headless
  servers with no display.
