# Architecture — Data Centre Thermal Map

Single-file web app (`src/index.html`, no build step):

- `SENSORS` — simulated 24-hour inlet-temperature series for 12 racks,
  generated from a diurnal load curve (cool at night, peak 14:00–16:00)
  plus per-rack offsets; the same data ships as `assets/sample-sensors.csv`.
- Rendering: a canvas heatmap. Each rack is a cell coloured by
  `tempColor(t)` (HSL interpolation blue→red); hot/cold aisles are drawn
  as labelled bands between rack rows; cells above 27 °C get a red border
  and a ⚠ marker.
- Time slider: `input[type=range]` 0–23 selects the hour; the map, the
  hotspot report and the hall average re-render from that hour's column.
- Hotspot report: racks sorted by temperature at the selected hour, with a
  suggested action per rack (check blanking panels / CRAC airflow /
  rebalance load).
- Tests (`tests/test_thermal.py`) validate the CSV shape, the hotspot
  threshold logic and the colour-scale ordering.
