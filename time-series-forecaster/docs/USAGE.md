# Usage — Time-Series Forecaster

```bash
python3 src/forecast.py --demo
python3 src/forecast.py --data assets/load.csv --horizon 7 --backtest 14
python3 -m pytest tests/ -q
```

Your CSV needs `date,value` columns (ISO dates, daily). The demo data is
electricity load (kW) with a weekly pattern — note the weekend dip.

## Real-model path

For production, fit Facebook Prophet or a statsmodels SARIMA model on
the same CSV and compare its backtest MAE/MAPE with the seasonal-naive
baseline here. A fancier model only earns its place if it beats the
baseline on held-out data.
