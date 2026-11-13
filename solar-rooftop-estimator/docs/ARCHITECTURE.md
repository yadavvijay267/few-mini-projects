# Architecture — Solar Rooftop Estimator

`src/solar.py` — calculation core + CLI:

- `panel_count(area_m2)` — 70% usable area, 2.2 m² per 550 W panel
- `system_kwp(panels)`, `tilt_factor(tilt, latitude)`,
  `orientation_factor(azimuth)` — derating curves
- `annual_generation(kwp, psh, pr)` — `kWp × PSH × 365 × PR`
- `estimate(...)` — ties it together: cost ₹55,000/kWp installed (typical
  Indian residential benchmark, adjustable), first-year savings, payback,
  25-year lifetime generation and CO₂ avoided (≈ 0.82 kg/kWh grid factor)
- `CITY_PSH` — fallback peak-sun-hours for Indian cities, used when the
  Open-Meteo request fails

`src/index.html` — browser UI: fetches Open-Meteo hourly shortwave
radiation for the chosen latitude/longitude, averages it into PSH, and draws
a monthly generation bar chart on canvas. If the network call fails it
falls back to the city table embedded in the page.

Tests assert panel counts, the generation formula, and that payback falls
as tariff rises.
