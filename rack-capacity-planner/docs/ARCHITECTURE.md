# Architecture — Rack Capacity Planner (DCIM Lite)

`src/rack_calc.py` holds the pure capacity logic: per-rack U/power/weight totals,
stranded-capacity detection and room summary. `src/app.js` renders the 42U
elevation, handles placement (click a free U range, or use the form) and persists
the plan in localStorage.
