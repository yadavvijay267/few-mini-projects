# UPS & Battery Backup Sizing Tool

Size a UPS and battery bank for a critical load and required autonomy time — the sizing step every data centre, hospital and telecom site needs before procurement.

## Features
- Critical load (kVA/kW), power factor, autonomy (minutes) and battery type (VRLA / Li-ion) inputs
- Battery string sizing (cells, Ah) with ageing and temperature derating applied honestly
- Runtime curve: load vs backup time (canvas chart)
- Side-by-side comparison of VRLA vs Li-ion: cost, footprint and lifetime

## Formulas
Load (kW) = load (kVA) x power factor. UPS rating (kVA) = load kVA x 1.25 (25% headroom).
Battery energy (Wh) = load (W) x autonomy (h) / inverter efficiency (0.92).
Required Ah = energy (Wh) / DC bus voltage (V) x ageing factor (1.25) x temperature factor (1.11 at 20 C, 1.0 at 25 C) / depth of discharge (0.8 VRLA, 0.9 Li-ion).
Cells in series = DC bus voltage / cell voltage (2 V VRLA, 3.2 V Li-ion). Strings in parallel = ceil(required Ah / cell Ah).
Runtime at a given load fraction is approximately linear in Ah for this sizing model; the curve in the UI shows autonomy vs load. Sources: IEEE 485 battery-sizing method (simplified) and standard vendor derating practice.

## Tech Stack
- Vanilla HTML, CSS and JavaScript (no build step, no backend)
- Python calculation module in `src/` with pytest tests

## How to Run
1. Open `src/index.html` in any browser, or
2. `python3 src/ups_calc.py --help` for the CLI, or `python3 -m pytest tests/ -v` for the tests.

## Screenshots
See `screenshots/SCREENSHOTS.md`.

## License
MIT — Copyright (c) 2026 Clamor. See `LICENSE`.
