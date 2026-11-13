# Architecture — Environmental Sensor Dashboard

Single-file web app (`src/index.html`, no build step):

- `SENSORS` — 6 simulated sensors with fixed floor-plan coordinates:
  2 temperature, 2 humidity, 1 leak rope, 1 door contact.
- Simulator: every 2 s each sensor drifts by a small random walk around a
  diurnal base value; the leak sensor stays dry unless **Simulate leak**
  is pressed.
- Threshold engine: `check(sensor, value)` returns ok/warn/critical per
  the configured limits; transitions are appended to the alert history
  with timestamps, and a webhook POST is attempted (and logged as
  simulated when no endpoint is configured).
- Floor plan: an SVG of the hall with a sensor dot per device, coloured
  green/amber/red by state; clicking a dot selects it and draws its
  24-hour trend on a canvas with min/max markers.
- `assets/sample-readings.csv` holds a day of readings for offline review.

Tests (`tests/test_env.py`) validate the CSV, the threshold boundaries and
the alert-state transitions.
