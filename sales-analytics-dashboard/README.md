# Sales Analytics Dashboard

An interactive sales dashboard: revenue trends, top products, regional
breakdown and KPIs — as a Streamlit app and as a CLI that prints exactly
the same numbers.

## Features

- **KPI cards** — revenue, orders, average order value, units, growth inputs
- **Revenue trend**, **top-10 products**, **regional** and **category** charts
- **Date-range, category and region filters** that update every chart
- **Export** the filtered view to CSV
- **"What changed" panel** (the stand-out feature) — automatically
  highlights the biggest movers vs the previous period, with % change

## Tech stack

Python 3, Streamlit, pandas. The analysis module (`src/analysis.py`) also
runs on the standard library alone, so the CLI works even without pandas
installed.

## How to run

```bash
pip install -r requirements.txt

# Dashboard in the browser
streamlit run src/app.py

# Same analysis on the command line
python3 src/sales_dashboard.py --demo
python3 src/sales_dashboard.py --data assets/sales.csv --category Electronics
python3 src/sales_dashboard.py --data assets/sales.csv --from 2026-09-01 --to 2026-09-30
python3 src/sales_dashboard.py --data assets/sales.csv --export filtered.csv
```

The sample dataset (`assets/sales.csv`) has 180 orders across 4 regions,
3 categories and 12 products over 90 days.

## Screenshots

See `screenshots/SCREENSHOTS.md` — capture the dashboard with the KPI row,
trend chart and "What changed" table visible.

## Tests

```bash
python3 -m pytest tests/ -v
```

## License

MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
