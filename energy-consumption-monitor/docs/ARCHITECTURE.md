# Architecture — Energy Consumption Monitor (IoT)

`src/energy_calc.py` holds the pure logic: energy/cost, vampire-load detection and
alert thresholds. `src/app.js` simulates a smart-plug feed per device, accumulates
kWh, draws daily/weekly charts on canvas, and raises alerts when a device exceeds
1.5x its typical power.
