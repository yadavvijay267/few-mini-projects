# UPS & Generator Failover Simulator

Simulate a mains failure: UPS picks up the load, the generator starts, the
transfer switch moves the load, and load sheds if needed. The resilience
test every data centre must pass — practised here without touching real
equipment.

## Features

- Configurable UPS runtime, generator start time, transfer-switch delay
- Timeline of the failover event with load vs capacity at each step
- Load-shedding rules (which loads drop first) and their effect
- **"What breaks" report**: any moment load exceeds available capacity —
  the gap real failover tests exist to find
- CLI (`src/failover.py`) and web UI (`src/index.html`)

## How it works

1. **t = 0 s** — mains fails. UPS (battery) carries the full load instantly.
2. **Generator start** — configurable delay (typically 10–30 s); the
   generator ramps to rated output over a few seconds.
3. **Transfer** — ATS moves the load to the generator after its delay.
4. **Load shedding** — if load exceeds available capacity at any step,
   the lowest-priority loads shed in order until it fits.
5. **Return** — mains restored, load transfers back, UPS recharges.

## How to run

```bash
python3 src/failover.py --load 800 --ups-kva 1000 --ups-runtime 900 --gen-kva 900 --gen-start 15
python3 src/failover.py --scenario assets/sample-scenario.json
python3 src/failover.py --help
```

Web UI: open `src/index.html`, set the parameters and press **Run simulation**.

## License

MIT — see `LICENSE`.
