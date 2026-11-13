# Fiber Optic Loss Budget Calculator

Calculate the end-to-end optical loss of a fiber link — fiber attenuation, splices, connectors and safety margin — and check it against the transmitter/receiver power budget. Built for FTTH and backbone fiber design, directly from telecom QC work.

## Features
- Fiber types G.652D / G.657A (single-mode) and OM1–OM4 (multimode), wavelengths 1310/1550 nm (SM) and 850/1300 nm (MM)
- Automatic loss per element from standard tables (editable values)
- Pass/fail against the power budget (Tx power minus Rx sensitivity) with margin shown
- Flags the dominant loss contributor and suggests where to save budget
- Step-by-step loss breakdown table and one-page report export (print / download)

## Formulas
Total loss (dB) = length (km) x attenuation (dB/km) + splices x splice loss + connectors x connector loss + safety margin.
Attenuation (dB/km): SM 1310 nm = 0.35, SM 1550 nm = 0.22; MM 850 nm = 3.0, MM 1300 nm = 1.0.
Splice loss: 0.05 dB (SM) / 0.10 dB (MM); connector loss: 0.30 dB (SM) / 0.50 dB (MM).
Power budget (dB) = Tx launch power (dBm) - Rx sensitivity (dBm). Link passes when total loss <= power budget; margin = power budget - total loss. Sources: ITU-T G.652/G.657 attenuation values and typical vendor splice/connector loss figures; values are editable in the UI.

## Tech Stack
- Vanilla HTML, CSS and JavaScript (no build step, no backend)
- Python calculation module in `src/` with pytest tests

## How to Run
1. Open `src/index.html` in any browser, or
2. `python3 src/fiber_calc.py --help` for the CLI, or `python3 -m pytest tests/ -v` for the tests.

## Screenshots
See `screenshots/SCREENSHOTS.md`.

## License
MIT — Copyright (c) 2026 Clamor. See `LICENSE`.
