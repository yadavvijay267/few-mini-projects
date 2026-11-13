# Usage — Predictive Maintenance

```bash
python3 src/model.py --demo
python3 src/model.py --alerts
python3 -m pytest tests/ -q
```

## Real data — NASA C-MAPSS

Download the C-MAPSS turbofan dataset (free, NASA Prognostics Data
Repository) and convert it to `assets/sensor_history.csv` columns:
`machine,cycles,vibration,temperature,runtime_h`. The demo degradation
score is a stand-in; for production, train a scikit-learn Random Forest
(or XGBoost) regressor on the sensor columns to predict RUL directly,
and report precision/recall on a held-out set of machines.

## Reading the output

- `rul_cycles` — cycles left before the degradation score crosses 100.
- `failure_probability` — 0..1, rises as RUL falls.
- `feature importance` — which sensor tracks remaining life best.
