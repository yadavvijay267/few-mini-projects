# Power Factor Correction Analyzer

Analyse a load's power factor from billing data and size the capacitor bank
needed to correct it. Industrial consumers pay penalties for low power
factor — this tool turns the engineering answer into money: "this bank pays
for itself in 7 months."

## Features

- Enter kW / kVAr / kVA manually, or upload a billing CSV
- Current PF, target PF and required kVAr from the standard formula
- Capacitor bank sizing in standard steps (25 / 50 kVAr)
- Estimated monthly penalty saved and payback period
- Web UI (`src/index.html`) and a Python CLI (`src/pfcalc.py`)

## Formulas

- Power factor: `PF = kW / kVA`
- Reactive power: `kVAr = √(kVA² − kW²)`
- Correction required: `kVAr = P × (tan φ₁ − tan φ₂)` where `cos φ₁` is the
  present PF and `cos φ₂` the target PF
- Capacitor steps are rounded **up** to the next standard step size

## How to run

Web UI: open `src/index.html` in a browser.

CLI:

```bash
python3 src/pfcalc.py --kw 500 --pf 0.78 --target-pf 0.95
python3 src/pfcalc.py --csv assets/sample-billing.csv --target-pf 0.95
python3 src/pfcalc.py --help
```

## Sample data

`assets/sample-billing.csv` — 6 months of billing (kW, kVAr, kVA).

## License

MIT — see `LICENSE`.
