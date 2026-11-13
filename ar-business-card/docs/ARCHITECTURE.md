# Architecture

`src/index.html` is an A-Frame scene with AR.js (`aframe-ar.js`): the `hiro`
marker preset anchors an `<a-entity>` holding a card, name, role, and two
tap targets (Website / Email). The scene is hidden until the user taps
"Start AR camera" so the page never asks for the camera unprompted.

Fallback: `app.js` `startPreview()` renders the same card as a Three.js
scene with drag-to-rotate — no camera, no AR.js needed.

## Production needs

- HTTPS hosting (camera requires a secure context).
- A custom marker (generate one with the AR.js marker generator) instead of
  the shared Hiro marker, so any printed card triggers the scene.
- Real tap handlers: wire the Website/Email planes to `window.open` /
  `mailto:` links (A-Frame cursor + raycaster) — the planes are in place.
