# Architecture

```
src/analysis.py          pure functions: load, filter, KPIs, rankings, what-changed
src/sales_dashboard.py   CLI: same functions, printed report, --export
src/app.py               Streamlit: filters + KPI cards + charts + table
assets/sales.csv         180 sample orders (90 days, 4 regions, 3 categories)
```

## Design choices

- **One analysis module, two front ends.** `analysis.py` is the single
  source of truth; the CLI and the Streamlit app can never disagree.
- **pandas is optional for analysis.** `load_sales()` uses the stdlib csv
  module; `load_sales_df()` adds pandas only for the Streamlit charts.
- **"What changed"** splits the selected date range in half and ranks
  products by absolute revenue change between the halves, with a % change
  for context. It answers "what moved?" instead of just "what is big?".
