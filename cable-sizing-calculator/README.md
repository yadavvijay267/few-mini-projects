# Cable Sizing & Voltage Drop Calculator

Size power cables for a load: current rating, voltage drop and short-circuit withstand, per IEC/IS-style tables. Every electrical installation design starts here.

## Features
- Load (kW), voltage, power factor, length and installation method inputs
- Automatic cable size selection with voltage-drop check (<=3% lighting / <=5% power)
- Derating factors for temperature, grouping and burial
- Side-by-side comparison of two cable sizes
- Cost comparison: minimum compliant size vs the next size up (engineering meets economics)

## Formulas
Load current: 1-phase I = P / (V x pf); 3-phase I = P / (sqrt(3) x V x pf), P in watts.
Voltage drop: 1-phase Vd = 2 x L x I x (R cos phi + X sin phi) / 1000; 3-phase Vd = sqrt(3) x L x I x (R cos phi + X sin phi) / 1000, L in metres, R/X in ohm/km.
Vd% = Vd / V x 100. Limits: 3% lighting, 5% other loads (per IS 732 / IEC guidance).
Derated ampacity = base ampacity x temperature factor x grouping factor x burial factor.
Cable tables (Cu, PVC, 70 C): R/X and ampacity per mm2 are embedded in src/cable_tables.json — simplified from IEC 60364 / IS 3961 style values; verify against the manufacturer datasheet for real designs.

## Tech Stack
- Vanilla HTML, CSS and JavaScript (no build step, no backend)
- Python calculation module in `src/` with pytest tests

## How to Run
1. Open `src/index.html` in any browser, or
2. `python3 src/cable_calc.py --help` for the CLI, or `python3 -m pytest tests/ -v` for the tests.

## Screenshots
See `screenshots/SCREENSHOTS.md`.

## License
MIT — Copyright (c) 2026 Clamor. See `LICENSE`.
