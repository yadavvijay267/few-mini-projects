# 89. Three.js Product Configurator (3D)

A 3D product configurator: a chair built from Three.js primitives — rotate it,
change colour/material, add accessories, and watch the price update live.
No model download needed (no Sketchfab dependency); the chair is built from
original geometry in code.

## Features

- Orbit controls (rotate / zoom / pan), touch-friendly on mobile
- Colour, material (fabric / leather / mesh), and accessory options with live price updates
- Auto-rotate showcase mode and a screenshot (PNG download) button
- **Share configuration** — the chosen options are encoded in the URL (`?color=…&material=…`)
- Graceful message if the Three.js CDN is unreachable

## Tech stack

Three.js (CDN, ES modules), plain HTML/CSS/JS

## How to run

```bash
python3 -m http.server 8000 --directory src   # open http://localhost:8000
# Or open src/index.html directly (CDN needs internet).
python3 tests/test_configurator.py
```

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
