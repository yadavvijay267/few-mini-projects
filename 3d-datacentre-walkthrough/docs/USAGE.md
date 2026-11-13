# Usage — 3D Data Centre Walkthrough

Open `src/index.html` in a browser (needs internet for the Three.js
CDN), or serve it:

```bash
cd src && python3 -m http.server 8000
```

- WASD / arrow keys: walk. Click a rack: power, load, temperature,
  server count. Blue floor = cold aisle, red = hot aisle.
- **Guided tour**: camera flies through the hall. **Reset view** returns
  to the entrance. The minimap (bottom-left) shows your position.
- Edit racks in `assets/hall.json` — no code changes needed.
