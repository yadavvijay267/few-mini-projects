# Architecture — Fiber Optic Loss Budget Calculator

`src/fiber_calc.py` holds the pure calculation logic (no I/O): attenuation tables,
`loss_budget()` returning every component, and `evaluate()` returning pass/fail plus the
dominant contributor. `src/app.js` mirrors the same tables and renders the breakdown.
The CLI prints a text report; the web UI exports the same report via print-to-PDF.
