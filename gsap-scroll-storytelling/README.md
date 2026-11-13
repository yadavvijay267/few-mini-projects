# GSAP Scroll Storytelling Site

A scroll-driven narrative — 'The Journey of Light', the story of a pulse of light travelling 40 km through fiber — with pinned sections, scrubbed animations, parallax, counters, and a chapter progress indicator.

## Features

- Pinned sections with scrubbed animations tied to scroll position
- Parallax visuals, animated counters, and a scroll progress bar
- Horizontal-scroll chapter on desktop, stacked on mobile
- Reduced-motion fallback (content readable without animation)
- Progress-driven chapter indicator showing where you are in the story

## Tech Stack

GSAP ScrollTrigger, Lenis smooth scroll (CDN), HTML/CSS, vanilla JavaScript

## How to Run

Open `src/index.html` and scroll. The chapter indicator (top right) tracks your position; the Route chapter scrolls horizontally on desktop. If the CDN is unreachable, a built-in fallback keeps the story fully readable.

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
