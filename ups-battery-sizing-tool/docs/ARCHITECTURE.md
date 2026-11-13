# Architecture — UPS & Battery Backup Sizing Tool

`src/ups_calc.py` holds the pure sizing logic: UPS rating, battery Ah with ageing
and temperature derating, string configuration and the runtime curve. `src/app.js`
mirrors it in the browser and draws the runtime curve on a canvas.
