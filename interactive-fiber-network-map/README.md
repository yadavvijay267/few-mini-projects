# Interactive Fiber Network Map (3D/2D)

An interactive map of a fiber network: nodes, links, splice points,
and loss data, with a 3D elevation view.

## Features

- Map with nodes (POPs, splice closures) and links coloured by loss.
- Click a link to see its loss budget, length, and splice count.
- Toggle between 2D map and a 3D terrain view.
- **Fault simulation** — break a link and see which customers are
  affected, plus the backup path.

## Tech stack

- JavaScript, Leaflet (2D map) + Three.js (3D view), GeoJSON.
- Loss-budget maths in `src/network.py` (tested) — the same numbers
  the map shows.

## How to run

Open `src/index.html` in a browser (Leaflet + Three.js via CDN).
`python3 -m pytest tests/ -q` for the loss-budget engine.

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
