# 3D Solar System / Orbit Visualiser

An interactive 3D solar system with realistic relative planet sizes and orbit speeds, click-for-facts, time controls, and a size-comparison mode — built with Three.js.

## Features

- Planets with real relative sizes and orbit speeds (scaled for viewing)
- Click a planet for facts (diameter, day length, moons)
- Time controls (pause, speed up, reverse)
- A 'compare sizes' mode that lines planets up side by side
- Drag to orbit, scroll to zoom, plus a full data table fallback when the CDN is unreachable

## Tech Stack

Three.js (CDN), HTML, CSS, vanilla JavaScript

## How to Run

Open `src/index.html`. Drag to orbit, scroll to zoom, click any planet for facts. Use Pause / Faster / Slower / Reverse, and 'Compare sizes' to line the planets up. If Three.js cannot load, a message appears and the data table still works.

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
