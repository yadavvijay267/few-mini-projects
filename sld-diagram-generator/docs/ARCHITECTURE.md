# Architecture — SLD Generator

`src/index.html` — editor layout: JSON textarea, component panel, SVG canvas,
export buttons.

`src/app.js` — the whole generator:

1. `parseSystem(json)` validates the description (incomer, transformer,
   panels[], each panel with breaker + loads[]).
2. `layout(system)` assigns x/y coordinates: a vertical spine from the
   incomer at the top, transformer below it, a horizontal busbar, then one
   vertical branch per panel, each ending in its loads.
3. `render(system)` builds SVG: standard symbols drawn with primitives —
   breaker (square with diagonal), transformer (two overlapping circles),
   busbar (thick horizontal line), earth (ground symbol), load (circle with
   letter). Ratings are text labels next to each symbol.
4. Clicking a symbol opens the edit panel; saving re-renders from the same
   data object, so the diagram is always derived from the data.
5. Export serialises the live SVG (SVG download) or rasterises it through a
   canvas (PNG download).

No libraries are used; the SVG is plain DOM so it stays editable and
exportable.
