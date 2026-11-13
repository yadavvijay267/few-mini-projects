# Architecture

## Data

`assets/load_data.csv` — 730 days of daily data-centre power load (kW),
generated with a documented model: a rising trend, weekly seasonality
(weekday > weekend), yearly seasonality (summer cooling peak), and noise.
It stands in for real metered load.

## Model

Holt-Winters exponential smoothing with additive trend and additive
seasonality (weekly period = 7). `src/forecast.py` tries
`statsmodels.tsa.holtwinters.ExponentialSmoothing` first; if statsmodels
is not installed it falls back to `src/holtwinters.py`, a small NumPy
implementation of the same recursions, so the tool works anywhere.

Confidence bands: residual standard deviation from the training fit,
scaled by `sqrt(h)` for horizon step `h` (a standard approximation),
at 95% (1.96 sigma).

## Backtesting

`--backtest` trains on the first 80% and forecasts the last 20%, then
reports MAPE and RMSE against the actuals. This is the number that
matters: a forecast that only fits history is not a forecast.

## Anomalies

Any actual value outside its forecast band in the backtest window is
flagged with its date and deviation, and written to
`models/anomalies.csv`.

## Production path

For real load: use Prophet or statsmodels SARIMAX with holiday /
temperature regressors, re-fit on a schedule, and track MAPE over time
with alerting when it degrades. Keep the backtest gate: never ship a
model whose held-out MAPE is worse than the naive seasonal baseline.
