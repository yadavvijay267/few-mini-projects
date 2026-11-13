# Energy Consumption Monitor (IoT)

Monitor home/office energy use per device, find the biggest consumers, and catch standby ('vampire') loads. Measurement is always the first step in saving energy.

## Features
- Live power (W) and energy (kWh) per device (simulated smart-plug feed)
- Daily / weekly / monthly cost at your tariff
- Vampire-load report — devices consuming power while idle
- Alerts when a device exceeds its normal range
- Daily and weekly charts (canvas)

## Formulas
Energy (kWh) = power (W) x time (h) / 1000. Cost = energy (kWh) x tariff (Rs/kWh).
Vampire load: a device drawing > 2 W while marked idle/standby for the whole day counts as standby waste; monthly waste = standby W x 24 x 30 / 1000 kWh.
Alert: live power > 1.5 x the device's typical power triggers a high-usage alert.
Daily totals accumulate the simulated feed; weekly view sums the last 7 simulated days.

## Tech Stack
- Vanilla HTML, CSS and JavaScript (no build step, no backend)
- Python calculation module in `src/` with pytest tests

## How to Run
1. Open `src/index.html` in any browser (simulated feed starts automatically), or
2. `python3 src/energy_calc.py --help` for the CLI, or `python3 -m pytest tests/ -v` for the tests.

## Screenshots
See `screenshots/SCREENSHOTS.md`.

## License
MIT — Copyright (c) 2026 Clamor. See `LICENSE`.
