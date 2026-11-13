# Solar Rooftop Estimator

Estimate rooftop solar generation, savings and payback from roof area,
location and tariff. Uses real location irradiance data (Open-Meteo solar
radiation API, free, no key) with a built-in Indian-city fallback table —
not a single national average.

## Features

- Roof area, tilt, orientation and location inputs
- Real irradiance from Open-Meteo (`/v1/forecast?hourly=shortwave_radiation`)
  with fallback peak-sun-hours per city
- Panel count and layout suggestion for the given roof area
- Monthly generation estimate and a yearly production chart
- Savings vs current tariff, system cost and payback period

## Formulas

- Usable roof area ≈ 70% of gross area (walkways, shade, setbacks)
- Panel area ≈ 2.2 m² per 550 W panel → `panels = floor(usable_area / 2.2)`
- System size: `kWp = panels × 0.55`
- Annual generation: `E = kWp × PSH × 365 × PR` (PR = performance ratio ≈ 0.78)
- Tilt derate: `cos(tilt − latitude)` factor; orientation derate per compass
- Payback: `system_cost / annual_savings`

## How to run

Web UI: open `src/index.html` (it fetches live irradiance; offline it uses
the city table in `assets/city-irradiance.csv`).

CLI:

```bash
python3 src/solar.py --area 100 --city Noida --tariff 8
python3 src/solar.py --area 60 --psh 5.2 --tariff 7.5
python3 src/solar.py --help
```

## License

MIT — see `LICENSE`.
