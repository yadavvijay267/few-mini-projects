# PUE Monitoring Dashboard

Track Power Usage Effectiveness (PUE) from IT load and total facility power, with trends, targets and a what-if panel. The headline efficiency metric of every data centre.

## Features
- PUE computed from IT load and total facility power (simulated live feed + CSV upload)
- Trend chart with target line (1.4) and daily/weekly averages
- Overhead breakdown: cooling, lighting, losses
- Alert when PUE exceeds the target for a sustained period
- What-if panel: 'if cooling drops 10%, PUE becomes X'

## Formulas
PUE = total facility power (kW) / IT equipment power (kW). Ideal = 1.0; typical good DC = 1.2–1.5.
Total facility power = IT load + cooling + lighting + UPS/other losses.
Overhead (kW) = total - IT. What-if: new cooling = cooling x (1 - reduction); new PUE = (IT + new cooling + other) / IT.
Energy cost = total power (kW) x hours x tariff (Rs/kWh). Sources: The Green Grid PUE definition.

## Tech Stack
- Vanilla HTML, CSS and JavaScript (no build step, no backend)
- Python calculation module in `src/` with pytest tests

## How to Run
1. Open `src/index.html` in any browser (live simulation starts automatically), or
2. `python3 src/pue_calc.py --help` for the CLI, or `python3 -m pytest tests/ -v` for the tests.

## Screenshots
See `screenshots/SCREENSHOTS.md`.

## License
MIT — Copyright (c) 2026 Clamor. See `LICENSE`.
