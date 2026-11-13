# Architecture — E-Commerce Product Page with Cart

- `src/index.html` — top bar, product grid, recently-viewed rail, cart drawer, detail and checkout modals.
- `src/app.js` — `loadProducts()` fetches the Fake Store API and falls back to a built-in 8-product catalogue when offline. Cart and recently-viewed lists persist in `localStorage`. `totals()` applies the promo engine: `WELCOME10` = 10% off, `FLAT50` = $50 off, `FREESHIP` = free shipping. Checkout validates name/email/address/city before confirming (demo only — no payment is taken).
- Stock levels are derived deterministically from product id so the demo is stable.
