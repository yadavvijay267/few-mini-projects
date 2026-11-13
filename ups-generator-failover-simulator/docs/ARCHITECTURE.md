# Architecture — UPS & Generator Failover Simulator

`src/failover.py` — event-driven simulation core + CLI:

- `simulate(cfg)` steps through the event in 1-second ticks:
  - capacity(t): 0 before UPS (never — UPS is instant), UPS kVA while on
    battery, generator kVA once started + ramped, mains kVA after restore
  - load(t): configured load minus shed loads
  - UPS state of charge drains at `load / ups_kva` of its runtime
  - shedding: priority-ordered load list; while load > capacity, shed the
    lowest-priority load still on and log it
  - gaps: every second where load > capacity is recorded with the shortfall
- `what_breaks(events)` — summarises gap windows (start, duration, max
  shortfall) and shed loads
- CLI flags: `--load`, `--ups-kva`, `--ups-runtime`, `--gen-kva`,
  `--gen-start`, `--ats-delay`, `--restore`, `--scenario JSON`,
  `--shed-loads "name:kw:priority,..."`

`src/index.html` — same model in JS, with a timeline table, a load-vs-
capacity canvas chart and the "what breaks" panel. The sample scenario
(`assets/sample-scenario.json`) is deliberately tight: 950 kW load on a
900 kVA generator with a 15 s start, so a shedding event is visible.
