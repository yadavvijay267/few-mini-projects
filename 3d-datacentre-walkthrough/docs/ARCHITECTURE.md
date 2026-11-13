# Architecture

## Scene

`src/index.html` builds the hall from Three.js primitives:
- Floor (dark, with a grid), walls, and ceiling lights.
- Two rows of 6 racks each (`assets/racks.json` drives count, power and
  temperature). Each rack is a box with server-unit slats and a small
  status light (green < 27 C, amber 27-30 C, red > 30 C).
- Cold aisles (blue floor tint) between the rows, hot aisles (red tint)
  behind them, with animated airflow arrows (small cones moving along
  the aisle).
- CRAC units at the end of each row.

## Movement

Pointer-lock-free by design (works in an iframe): WASD/arrows move the
camera on the floor plane, mouse drag rotates the view, and movement is
clamped to the hall bounds with simple rack collision (circle test
against rack footprints). The minimap is a 2D canvas redrawn each frame.

## Interaction

Raycasting on click: the clicked rack's data (servers, power, inlet
temperature, status) is shown in the side panel. Guided tour (`T`)
animates the camera along waypoints through both aisles.

## Fallback

If the Three.js CDN fails, `window.THREE` is undefined and the page
shows a clear message with a retry button instead of a blank screen.

## Production path

Move to React Three Fiber for a component model, load rack data from
the DCIM API (project 70) instead of the static JSON, and add live
telemetry (temperature/power streamed over WebSocket).
