# E-Commerce Analytics — RFM Customer Segmentation

Segment customers with RFM analysis (Recency, Frequency, Monetary) and
visualise the segments. Each segment gets a plain-English recommended
action — the analysis ends in a decision, not a chart.

## Features

- Real RFM computation from a transaction CSV (bundled sample data in
  `assets/transactions.csv`, modelled on the public Online Retail II
  dataset's shape).
- Quintile-based R/F/M scores (1-5) and combined RFM score.
- Named segments: Champions, Loyal Customers, Potential Loyalists,
  New Customers, At Risk, Hibernating, Lost.
- Optional K-Means clustering (scikit-learn) as a cross-check.
- Segment sizes, average value, and a recommended action per segment.
- Charts (matplotlib) and a Streamlit dashboard.
- Export segment lists for campaigns (`--export-dir`).

## Tech stack

- Python 3.10+, pandas, scikit-learn (optional, K-Means only),
  matplotlib (charts), Streamlit (dashboard, optional).

## How to run

```bash
pip install -r requirements.txt
python3 src/rfm.py --demo
python3 src/rfm.py --csv assets/transactions.csv --charts output/
python3 src/rfm.py --csv assets/transactions.csv --export-dir segments/
streamlit run src/app.py
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
