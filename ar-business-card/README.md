# 98. AR Business Card (WebAR)

A business card that, when viewed through a phone camera, shows a 3D model
and contact buttons floating above it. Works in a mobile browser — **no app
install**. A printable marker is included in `assets/`.

## Features

- Printed marker (Hiro) triggers the AR scene via AR.js + A-Frame
- 3D model (a rotating hexagon logo + name plate), role, and tap-to-call / email / website buttons in AR
- Works in a mobile browser — no app install
- Printable marker included (`assets/marker.html` — print it, or open it on a second screen)
- **Graceful fallback:** a 3D card preview (Three.js) when the camera is unavailable or the AR CDN fails

## Tech stack

AR.js, A-Frame, Three.js

## How to run

1. Print `assets/marker.html` (or show it on another screen).
2. Serve this folder over HTTPS (camera requires it) and open `src/index.html` on a phone:
   ```bash
   python3 -m http.server 8000 --directory src
   ```
3. Point the phone camera at the marker — the card appears above it.
4. No camera? Use the **3D preview** toggle on the page.

```bash
python3 tests/test_ar.py
```

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
