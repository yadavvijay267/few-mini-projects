# Earthing & Grounding Calculator

Design an earth electrode system per IEEE 80 (simplified): soil resistivity,
rod/grid layouts, earth resistance, and step & touch voltage checks — the
safety calculation most tools skip.

## Features

- Soil resistivity from direct input or Wenner 4-point data (`ρ = 2πaR`)
- Single rod, multiple rods and grid layouts with calculated resistance
- Step and touch voltage checks against IEEE 80 tolerable limits
- Visual layout plot of the electrode grid (web UI canvas)
- CLI (`src/earthing.py`) and web UI (`src/index.html`)

## Formulas (IEEE 80, simplified)

- Wenner resistivity: `ρ = 2π × a × R` (a = probe spacing, R = measured resistance)
- Single rod: `R = ρ / (2πL) × ln(4L / d)`
- Grid (Schwarz simplified): `Rg = ρ × [1/Lt + 1/√(20A) × (1 + 1/(1 + h√(20/A)))]`
  where Lt = total buried conductor length, A = grid area, h = burial depth
- Tolerable touch voltage: `Etouch = (1000 + 1.5 × Cs × ρs) × 0.116 / √ts`
- Tolerable step voltage: `Estep = (1000 + 6 × Cs × ρs) × 0.116 / √ts`
  (50 kg body, Cs = surface-layer derating, ρs = surface resistivity,
  ts = fault duration)

## Assumptions (documented)

- Uniform single-layer soil model; two-layer soil needs a full IEEE 80 study
- Grid formula is the simplified Schwarz expression, not a full FEM model
- Fault current and duration are user inputs; the design must be verified by
  a licensed engineer before construction

## How to run

```bash
python3 src/earthing.py --rho 100 --grid 20 20 --rods 9 --fault-current 5000 --duration 0.5
python3 src/earthing.py --wenner assets/sample-wenner.csv
python3 src/earthing.py --help
```

Web UI: open `src/index.html`.

## License

MIT — see `LICENSE`.
