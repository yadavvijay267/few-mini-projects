# Power Load & Demand Calculator

Build a load schedule for a building or site: connected load, demand factor, diversity and total demand — the basis for sizing transformers, DG sets and main incomers.

## Features
- Add loads by category (lighting, HVAC, motors, IT) with demand factors
- Diversity factor applied per group; total demand and recommended transformer size
- Load-schedule bar chart (canvas, no external library)
- What-if slider: see how adding one more HVAC unit changes the transformer size
- Export the load schedule as CSV; schedule saved in localStorage

## Formulas
Demand per load (kW) = connected load x demand factor.
Group demand = sum of load demands in the group x diversity factor (diversity < 1 means not all loads run at once).
Total demand (kW) = sum of group demands. Total demand (kVA) = total demand (kW) / power factor.
Recommended transformer (kVA) = next standard size at or above total demand kVA x 1.25 (25% future-growth margin). Standard sizes: 25, 50, 100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000 kVA. Sources: demand/diversity factor method per IS 732 / IEC 60364 load-estimation practice.

## Tech Stack
- Vanilla HTML, CSS and JavaScript (no build step, no backend)
- Python calculation module in `src/` with pytest tests

## How to Run
1. Open `src/index.html` in any browser, or
2. `python3 src/load_calc.py --help` for the CLI, or `python3 -m pytest tests/ -v` for the tests.

## Screenshots
See `screenshots/SCREENSHOTS.md`.

## License
MIT — Copyright (c) 2026 Clamor. See `LICENSE`.
