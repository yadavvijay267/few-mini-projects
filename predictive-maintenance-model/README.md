# Predictive Maintenance Model

Predict equipment failure from sensor data (vibration, temperature,
runtime) before it happens — the core of industrial IoT and exactly
the problem data-centre and telecom operations face.

## Features

- Trains on labelled sensor history (NASA C-MAPSS turbofan dataset
  format — a free public dataset; a C-MAPSS-shaped sample is in
  `assets/` so it runs offline).
- Remaining-useful-life (RUL) estimate per machine.
- Feature-importance chart (correlation of each sensor with RUL)
  showing which sensor matters most.
- Alert list ranked by failure probability.

## Tech stack

- Python 3.10+, standard library only for the demo model.
- Real-model path: scikit-learn (Random Forest / XGBoost), pandas,
  Streamlit — see `docs/USAGE.md`.

## How to run

```bash
python3 src/model.py --demo
python3 src/model.py --alerts
python3 -m pytest tests/ -q
```

## How it works

A degradation score is fitted per machine (linear trend of vibration
and temperature against cycles run). RUL is the cycles remaining until
the score crosses the failure threshold. Failure probability rises as
RUL falls. Feature importance is the correlation of each sensor with
remaining life.

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
