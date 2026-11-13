# Architecture — Power Load & Demand Calculator

`src/load_calc.py` holds the pure logic: per-load demand, per-group diversity,
total demand and transformer selection. `src/app.js` keeps the editable schedule in
localStorage, draws the bar chart on a canvas, and implements the what-if slider
by re-running the same calculation with extra HVAC units.
