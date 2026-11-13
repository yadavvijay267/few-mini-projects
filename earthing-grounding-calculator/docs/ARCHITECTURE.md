# Architecture — Earthing & Grounding Calculator

`src/earthing.py` — calculation core + CLI:

- `wenner_resistivity(spacing_m, resistance_ohm)` — ρ = 2πaR
- `rod_resistance(rho, length, diameter)` — single vertical rod
- `rods_resistance(...)` — parallel rods with a spacing efficiency factor
- `grid_resistance(rho, area, total_length, depth)` — IEEE 80 simplified
  Schwarz formula
- `tolerable_touch/step(rho_surface, cs, duration)` — IEEE 80 50-kg limits
- `design_check(...)` — returns resistance, actual step/touch voltages
  (from fault current × grid resistance, with mesh/step factors) and
  PASS/FAIL verdicts
- CLI supports `--rho`, `--wenner CSV`, `--rod`, `--rods`, `--grid L W`,
  `--fault-current`, `--duration`, `--surface-rho`

`src/index.html` — browser UI with the same formulas in JS plus a canvas
plot of the grid layout (rods as dots, conductors as lines).

Tests assert Wenner (2πaR), the single-rod formula, that a grid beats a
single rod, and that tolerable voltages fall as fault duration rises.
