# Architecture — 3D Solar System / Orbit Visualiser

- `src/index.html` — canvas, time-control bar, info panel, planet data table.
- `src/app.js` — `PLANETS` holds real diameter/day/moons data plus relative size, distance and orbit speed. If `window.THREE` exists it builds a scene (sun + point light, orbit rings, Saturn's ring, star field), animates planets on their orbits with a speed/direction multiplier, and supports pointer drag-orbit, wheel zoom, and raycast clicks for facts. `setCompare()` lines the planets up side by side at true relative scale — Jupiter dwarfs Mercury. If Three.js fails to load, a fallback message shows and the clickable data table carries the same facts.
- No build step; Three.js loads from the jsDelivr CDN.
