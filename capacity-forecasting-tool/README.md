# Capacity Forecasting Tool

Forecast when a data centre will run out of power, space or cooling, from
historical growth. It answers in a date, not a chart — "power runs out in
March 2027 at current growth."

## Features

- Upload historical utilisation (power, racks, cooling) by month, or use
  the included sample data (`assets/sample-utilisation.csv`)
- Linear-regression forecast with confidence bands and a **run-out date**
  per resource
- Scenario sliders (faster / slower growth) that move the run-out date
- One-page executive summary export (print / save as PDF from the browser)

## Method

Ordinary least squares on monthly utilisation: `y = a + b·t`. The run-out
date is where the fitted line crosses the resource capacity. The confidence
band uses the standard error of the regression (±1.96σ on the slope).

## How to run

```bash
python3 src/forecast.py --csv assets/sample-utilisation.csv
python3 src/forecast.py --csv assets/sample-utilisation.csv --growth 1.5
python3 src/forecast.py --help
```

Web UI: open `src/index.html` — same regression in JS, with scenario
sliders and a printable executive summary.

## License

MIT — see `LICENSE`.
