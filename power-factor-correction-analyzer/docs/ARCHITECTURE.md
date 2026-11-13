# Architecture — Power Factor Correction Analyzer

`src/pfcalc.py` — pure calculation core (no web dependency):

- `power_factor(kw, kva)`, `reactive_power(kw, kva)`
- `correction_kvar(kw, pf_now, pf_target)` — `P × (tan φ₁ − tan φ₂)`
- `bank_size(kvar_needed, step)` — rounds up to whole standard steps
- `penalty_saved(...)` and `payback_months(...)` — money side: monthly
  penalty (₹/kVAr above the allowed limit, configurable) × months vs bank
  cost (₹/kVAr installed, configurable)
- CLI: `--kw/--kva/--kvar`, `--pf`, `--target-pf`, `--csv`, `--step`,
  `--penalty-rate`, `--bank-cost`

`src/index.html` — same formulas re-implemented in JS for the browser UI,
with a CSV file reader for billing uploads and a bar chart of monthly PF.

Tests in `tests/test_pfcalc.py` assert the textbook numbers, e.g. 500 kW at
0.78 PF corrected to 0.95 needs ≈ 218 kVAr.
