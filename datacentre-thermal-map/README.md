# Data Centre Thermal Map (Airflow Lite)

A 2D thermal map of a data hall: rack inlet temperatures, hot/cold aisles,
and hotspot detection. Thermal management is the difference between a
stable hall and a meltdown.

## Features

- Hall layout with hot/cold aisles and per-rack inlet temperature
- Heatmap with a colour scale (blue → green → amber → red) and hotspot
  highlighting (>27 °C, ASHRAE recommended limit)
- **Time slider** that replays a full day of temperatures — watch hotspots
  form and fade
- Hotspot report listing the worst racks with suggested actions
- Sample sensor data in `assets/sample-sensors.csv` (24 h × 12 racks)

## How to run

Open `src/index.html` in a browser. Drag the time slider (00:00–23:00) to
replay the day; the heatmap, hotspot list and hall average update live.

## Thresholds

- ≤ 22 °C cool, 22–27 °C normal (ASHRAE recommended envelope), > 27 °C hotspot

## License

MIT — see `LICENSE`.
