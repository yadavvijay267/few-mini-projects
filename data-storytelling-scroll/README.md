# Interactive Data Storytelling Page — The Rise of Renewable Energy

A scrollytelling page where charts animate and update as the reader
scrolls through a narrative. The charts are the story: each scroll step
changes the visualisation to match the sentence you just read.

## Features

- Scroll-driven chart transitions (bar -> line -> stacked area) using
  `IntersectionObserver` — vanilla JavaScript, no paid libraries.
- Sticky charts with text steps that highlight data points.
- Charts drawn with SVG/canvas built from scratch in `src/charts.js`.
- Responsive and accessible: `prefers-reduced-motion` is respected
  (charts jump to their final state, no animation).
- A "Replay story" button that restarts the narrative.
- A real dataset: the share of renewables in global electricity
  generation, 2000-2024 (`assets/renewable_energy.csv` — figures are
  rounded, illustrative values compiled from public energy statistics;
  see `docs/USAGE.md`).

## Tech stack

- Vanilla HTML/CSS/JavaScript. No build step, no dependencies.

## How to run

```bash
python3 src/serve.py --port 8000
# then open http://localhost:8000
# or simply open src/index.html in a browser.
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
