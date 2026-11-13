# Financial Portfolio Tracker

Track investments (stocks, ETFs) with prices, allocation charts, profit/loss,
dividends and a real annualised return rate — as a Streamlit dashboard and
as a CLI that prints the same numbers.

## Features

- **Holdings** with buy price, quantity and buy date (CSV in `assets/`)
- **Live prices via yfinance** (NSE) with a graceful fallback to the bundled
  sample prices when offline — the tracker always works
- **Allocation donut data** by asset type and by holding, total P/L and
  per-holding performance
- **Dividend tracking** with per-symbol totals and a **dividend calendar**
  grouped by month
- **XIRR** (the stand-out feature) — the real annualised return rate of the
  whole portfolio, computed from dated cash flows
- **Price alerts** when a holding moves more than X% from its buy price

## Tech stack

Python 3, Streamlit, pandas, yfinance. The analysis module
(`src/portfolio.py`) is standard-library only except for the optional
yfinance live-price fetch.

## How to run

```bash
pip install -r requirements.txt

# Dashboard in the browser
streamlit run src/app.py

# Same analysis on the command line
python3 src/portfolio_tracker.py --demo
python3 src/portfolio_tracker.py --live --alerts 10
```

Sample data uses Indian NSE-style symbols with clearly-marked sample
prices in `assets/sample_prices.csv` (as of 2026-11-12). Replace them with
your own holdings — never commit real account numbers.

## Screenshots

See `screenshots/SCREENSHOTS.md` — capture the dashboard with the KPI row,
holdings table, allocation chart and dividend calendar visible.

## Tests

```bash
python3 -m pytest tests/ -v
```

## License

MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
