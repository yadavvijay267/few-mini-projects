# Architecture — Morphing Blob / Liquid UI Playground

- `src/index.html` — stage (blob), control panel, three demos; the SVG `goo` filter is defined once in a hidden `<svg>` and referenced with `filter: url(#goo)`.
- `src/app.js` — a `state` object (roundness, speed, colour, blur, size) drives the blob's inline styles; `renderCode()` regenerates the copyable CSS from the same state, so the snippet always matches the preview. Presets overwrite the state in one step. The gooey demos rely on the SVG filter (blur + alpha contrast) rather than JS; the liquid background spawns six drops that translate toward the pointer.
- Copy uses `navigator.clipboard` with a textarea fallback.
