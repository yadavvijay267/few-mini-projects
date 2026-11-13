# Architecture — PUE Monitoring Dashboard

`src/pue_calc.py` holds the pure logic: PUE, overhead breakdown, what-if cooling
reduction and energy cost. `src/app.js` simulates a live feed (IT load and cooling
drifting realistically), keeps a rolling history, draws the trend chart with the
1.4 target line, and raises an alert after sustained target breaches.
