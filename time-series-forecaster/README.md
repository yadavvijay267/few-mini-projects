# Time-Series Forecaster (Demand / Load)

Forecast a time series (electricity load, website traffic, ticket
volume) with seasonal models and confidence bands.

## Features

- Upload a CSV of dated values; automatic seasonality detection.
- Forecast chart with upper/lower confidence bands.
- **Backtesting built in** — train on the past, score against the
  actual future; the README shows the model's error on held-out data,
  not just a pretty chart.
- Anomaly flags where actuals fell outside the forecast band.

## Tech stack

- Python 3.10+, standard library only for the demo forecaster.
- Real-model path: Prophet (open-source) or statsmodels, pandas,
  Streamlit — see `docs/USAGE.md`.

## How to run

```bash
python3 src/forecast.py --demo
python3 src/forecast.py --data assets/load.csv --horizon 7 --backtest 14
python3 -m pytest tests/ -q
```

## How it works

Seasonal-naive + trend: the forecast for a future day is the value
from one season ago plus the fitted linear trend, and the confidence
band is +/- 1.96 x residual standard deviation. Backtesting holds out
the last N days, forecasts them from the earlier data, and reports
MAE / MAPE.

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
