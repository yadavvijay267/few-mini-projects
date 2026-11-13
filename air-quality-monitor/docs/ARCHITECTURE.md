# Architecture — Air Quality Monitor

`src/aqi.py` — calculation core + CLI:

- `BREAKPOINTS` — US EPA tables for PM2.5 and PM10
- `aqi_for_pollutant(conc, table)` — linear interpolation within the band
- `compute_aqi(pm25, pm10)` — overall AQI = max of the pollutant AQIs,
  with the driving pollutant named
- `category(aqi)` — name, colour, health advice
- `ventilation_advice(indoor_aqi, outdoor_aqi)` — open windows only when
  outdoor air is cleaner; otherwise run the purifier / keep windows shut
- CLI: `--pm25`, `--pm10`, `--co2`, `--voc`

`src/index.html` — simulated live feed: indoor and outdoor PM2.5 series
with a diurnal pattern (outdoor worse in the morning/evening, indoor
tracking it with a lag), canvas trend chart, threshold alerts, and the
ventilation recommendation updated live.

Tests assert the EPA breakpoint values (PM2.5 12.0 → 50, 35.4 → 100,
55.4 → 150) and the ventilation logic.
