# 90. WebGL Particle Portfolio (3D)

A portfolio whose hero is a living particle field: particles spell out the
initial **"C"** on load, then disperse into a network that follows the mouse
and reshapes on scroll. Built with Three.js + GSAP scroll reveals, a theme
switcher that re-colours the field, and reduced-motion support.

## Features

- Particle network that follows the mouse and reshapes on scroll
- Particles spell "C" on load, then disperse into the field (the stand-out twist)
- GSAP scroll animations + section reveals
- Theme switcher (Ocean / Sunset / Forest) that re-colours the particles
- `prefers-reduced-motion` support — the field freezes, content stays readable

## Tech stack

Three.js, GSAP, HTML/CSS

## How to run

```bash
python3 -m http.server 8000 --directory src   # open http://localhost:8000
python3 tests/test_portfolio.py
```

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
