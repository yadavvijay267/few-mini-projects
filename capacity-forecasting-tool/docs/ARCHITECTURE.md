# Architecture — Capacity Forecasting Tool

`src/forecast.py` — regression core + CLI:

- `ols(xs, ys)` — ordinary least squares: slope, intercept, R², residual
  standard error
- `run_out_date(months, values, capacity)` — solves `a + b·t = capacity`
  for t, converts the fractional month index to a calendar date; returns
  None when the slope is ≤ 0 (never runs out)
- `forecast(...)` — per resource: fitted slope (%/month), R², run-out date
  at 1.0× growth and at the scenario multiplier, plus a ±1.96σ band
- CLI: `--csv` (columns month,power_kw,racks,cooling_kw), `--growth`
  scenario multiplier, `--capacity-power/--capacity-racks/--capacity-cooling`

`src/index.html` — same OLS in JS over the embedded sample series, with
growth sliders per resource, a canvas chart with the fitted line and
confidence band, and an executive summary block with a Print button.

Tests assert OLS on exact linear data, the run-out date arithmetic, and
that faster growth moves the run-out date earlier.
