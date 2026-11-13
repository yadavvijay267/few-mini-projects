# Virtual Showroom (3D)

A virtual showroom: walk through rooms, inspect products in 3D,
and add them to a list.

## Features

- First-person navigation with click-to-move hotspots.
- Products placed in 3D with detail panels and pricing.
- A "shortlist" that collects products as you browse.
- **Day/night lighting toggle** — the same room feels different,
  and products are lit realistically in both.

## Tech stack

- Three.js, plain JavaScript, no build step. Products in
  `assets/products.json`.

## How to run

Open `src/index.html` in a browser (Three.js via CDN).

```bash
python3 -m pytest tests/ -q
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
