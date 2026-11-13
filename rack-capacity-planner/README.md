# Rack Capacity Planner (DCIM Lite)

Plan rack space, power and cooling capacity: place servers in racks and see utilisation live. The daily job of a data-centre capacity planner, in a single-page app.

## Features
- Rack elevation view (42U) with click-to-place server placement
- Per-rack power (kW) and weight totals with limits and warnings
- Room-level summary: racks used, power headroom and stranded capacity
- Add / remove devices; plan saved in localStorage; export the rack plan as CSV
- Stranded-capacity flag: space you cannot use because power ran out first

## Formulas
Rack utilisation % = used U / 42 x 100. Power utilisation % = rack load kW / rack power limit kW x 100.
Stranded capacity: a rack is power-bound when its remaining power cannot support another device in its remaining U — the free U in power-bound racks is stranded space.
Room headroom (kW) = room power capacity - sum of rack loads. Weight limit per rack: 1000 kg (typical).

## Tech Stack
- Vanilla HTML, CSS and JavaScript (no build step, no backend)
- Python calculation module in `src/` with pytest tests

## How to Run
1. Open `src/index.html` in any browser, or
2. `python3 src/rack_calc.py --help` for the CLI, or `python3 -m pytest tests/ -v` for the tests.

## Screenshots
See `screenshots/SCREENSHOTS.md`.

## License
MIT — Copyright (c) 2026 Clamor. See `LICENSE`.
