# Architecture

```
src/portfolio.py          pure functions: holdings, P/L, allocation,
                          dividends, XIRR, price alerts, live-price fetch
src/portfolio_tracker.py  CLI: same functions, printed report
src/app.py                Streamlit: KPI cards, tables, charts
assets/holdings.csv       sample holdings (buy price / quantity / date)
assets/dividends.csv      sample dividend payouts
assets/sample_prices.csv  clearly-marked sample prices (2026-11-12)
```

## Design choices

- **One analysis module, two front ends**, same as the sales dashboard.
- **Live prices are best-effort**: `fetch_live_prices()` returns `{}` when
  yfinance is missing or the network fails, and sample prices fill in —
  the tracker never crashes offline.
- **XIRR via Newton-Raphson** on dated cash flows (each buy is a negative
  flow, current value is a positive flow on the as-of date). A simple
  gain % ignores *when* money went in; XIRR does not.
- **Dividends are separate from price gains** so total return is honest:
  price P/L and dividend income are reported side by side.
