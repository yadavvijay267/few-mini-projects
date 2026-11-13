# Architecture — Cable Sizing & Voltage Drop Calculator

`src/cable_tables.json` holds simplified copper cable data (resistance, reactance,
ampacity, approx. cost per metre). `src/cable_calc.py` is the pure logic: load current,
derated ampacity, voltage drop, size selection and two-size comparison. `src/app.js`
mirrors the same tables for the browser UI.
