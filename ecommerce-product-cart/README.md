# E-Commerce Product Page with Cart

A complete storefront: product grid with filters, sorting and search, product detail with variants and stock status, a persistent cart, a promo-code engine, and a validated checkout summary.

## Features

- Product grid with filters, sorting, and search (Fake Store API, offline fallback catalogue)
- Product detail with image gallery, size/colour variants, and stock status
- Cart with quantity controls, promo-code field, and totals
- Checkout summary with form validation
- Promo-code engine (percentage, flat, free-shipping) and a 'recently viewed' rail

## Tech Stack

HTML, CSS, vanilla JavaScript, Fake Store API (free, no key), localStorage

## How to Run

Open `src/index.html`. Browse, filter and sort products; open a product to pick a variant and quantity; apply promo code `WELCOME10`, `FLAT50` or `FREESHIP` in the cart, then check out.

No build step and no API key are needed. Open `src/index.html` in any modern
browser, or serve the folder:

```bash
cd src
python3 -m http.server 8000
# then open http://localhost:8000
```

## Screenshots

See [`screenshots/SCREENSHOTS.md`](screenshots/SCREENSHOTS.md) for where to
place captures of the running app.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Clamor.
