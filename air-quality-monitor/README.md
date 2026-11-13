# Air Quality Monitor (AQI Dashboard)

Indoor/outdoor air quality monitoring (PM2.5, PM10, CO2, VOC) with health
guidance and trends. Health and workplace safety — especially relevant in
Noida/Delhi.

## Features

- Live AQI with the standard colour scale and health advice, computed from
  real US EPA breakpoints
- Hourly/daily trends and indoor vs outdoor comparison
- Alerts when AQI crosses a threshold
- **Ventilation recommendation** — "open windows" vs "run purifier" —
  based on whether indoor or outdoor air is worse

## AQI breakpoints (US EPA, PM2.5 µg/m³)

| AQI | PM2.5 range | Category |
|-----|-------------|----------|
| 0–50 | 0–12.0 | Good |
| 51–100 | 12.1–35.4 | Moderate |
| 101–150 | 35.5–55.4 | Unhealthy for sensitive groups |
| 151–200 | 55.5–150.4 | Unhealthy |
| 201–300 | 150.5–250.4 | Very unhealthy |
| 301–500 | 250.5–500.4 | Hazardous |

AQI = `(I_hi − I_lo)/(C_hi − C_lo) × (C − C_lo) + I_lo` (linear interpolation
within the breakpoint band; the overall AQI is the max across pollutants).

## How to run

```bash
python3 src/aqi.py --pm25 86 --pm10 140 --co2 950
python3 src/aqi.py --help
```

Web UI: open `src/index.html` — simulated live feed (indoor + outdoor),
trend chart, alerts and the ventilation recommendation.

## License

MIT — see `LICENSE`.
