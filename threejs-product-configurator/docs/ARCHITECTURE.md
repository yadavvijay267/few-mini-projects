# Architecture

The chair is built from Three.js primitives (boxes, cylinders, circles) —
no downloaded GLTF, so the repo is self-contained and the geometry is
original. `app.js` is one ES module: state -> `apply()` -> price + URL +
materials. The share link is the state itself, encoded as query params.

## Production needs

- A real GLTF model (from Poly Pizza / Sketchfab, licensed) can replace the
  primitive chair without changing the panel logic.
- Serve over HTTPS; pin the Three.js version in the import map.
- Add a backend cart/checkout if the configurator becomes a store.
