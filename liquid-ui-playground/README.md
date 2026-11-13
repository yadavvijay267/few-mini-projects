# Morphing Blob / Liquid UI Playground

A playground for liquid, morphing UI: a live-tuned blob, gooey buttons and menus built with SVG filters, a liquid background, and a copy-code button on every effect.

## Features

- Sliders for blob roundness, speed, and colour (plus blur and size)
- Gooey button and menu demos with SVG filters
- Copy the CSS/SVG for any effect you create
- Preset gallery (calm, playful, energetic)
- Liquid background that reacts to your pointer

## Tech Stack

HTML, CSS, SVG filters (feGaussianBlur + feColorMatrix goo filter), vanilla JavaScript

## How to Run

Open `src/index.html`. Drag the sliders to reshape the blob live, try the presets, hover the gooey buttons, open the gooey menu, and copy the CSS/SVG for any effect.

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
