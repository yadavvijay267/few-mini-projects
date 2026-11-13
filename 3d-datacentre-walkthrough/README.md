# 3D Data Centre Walkthrough

A first-person 3D walkthrough of a data hall: racks, hot/cold aisles,
CRAC units, and clickable equipment.

## Features

- WASD / arrow-key movement with a minimap.
- Click a rack to see its servers, power draw, and temperature.
- Hot/cold aisle colouring and airflow arrows.
- A guided-tour mode that flies the camera through the hall.

## Standout feature

It merges real data-centre operations knowledge with 3D — a walkthrough
that shows live operational data per rack (power, temperature, load).

## Tech stack

- Three.js, plain JavaScript, Tailwind-style CSS (no build step).
- Three.js loads from the jsDelivr CDN; the hall data lives in
  `assets/hall.json` so racks can be edited without touching code.

## How to run

Open `src/index.html` in a browser (or `python3 -m http.server` in
`src/`). Click to move, WASD to walk, click a rack for its details,
"Guided tour" for the fly-through.

```bash
python3 -m pytest tests/ -q
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
