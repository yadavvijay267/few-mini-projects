# Usage — Interactive Fiber Network Map

Open `src/index.html` in a browser (Leaflet + Three.js via CDN).

- Links are coloured by loss budget: green < 2 dB, orange < 3.5 dB,
  red above. Click a link for its loss budget, length, splice count.
- **Fault simulation**: click "Break Lx" — the panel lists affected
  customers and the backup route (computed by `src/network.py`).
- **3D view**: same GeoJSON as elevated Three.js lines (height = loss).

```bash
python3 -m pytest tests/ -q
```
