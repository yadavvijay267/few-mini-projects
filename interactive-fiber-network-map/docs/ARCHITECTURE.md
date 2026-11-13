# Architecture

## Data

`assets/network.geojson` — a GeoJSON FeatureCollection of:
- **nodes**: POPs (points of presence), splice closures, customer sites,
  each with `id`, `name`, `type`, and coordinates (Noida area).
- **links**: LineString features with `from`, `to`, `length_km`,
  `splices`, `connectors`, and a computed `loss_db`.

Loss is computed in `src/network.js` from the documented model
(0.22 dB/km + 0.05 dB/splice + 0.3 dB/connector) so the GeoJSON and the
UI can never disagree.

## 2D view

Leaflet renders the nodes as circle markers (POP = large, splice =
small, customer = square-ish via divIcon) and links as polylines
coloured by loss. Clicking a link opens a popup with its loss budget,
length and splice count.

## 3D view

Three.js draws the same graph on a terrain plane: nodes become
cylinders whose height encodes loss, links become lines coloured by
loss, and the camera can be orbited (drag) and zoomed (wheel). The
2D/3D toggle swaps the visible container; both views share `network.js`.

## Fault simulator

`simulateFault(linkId)` in `src/network.js`:
1. Removes the link from the adjacency list.
2. BFS from the POP: every customer node still reachable is fine;
   every customer node that becomes unreachable is "affected".
3. BFS again to find the shortest alternative path (if any) between
   the broken link's endpoints.
4. Renders the result in the side panel and highlights affected nodes
   in red on the map.

## Production path

Load the network from the operator's GIS (real GeoJSON), compute loss
from OTDR measurements instead of the model, and add live link status
from the NMS. Keep the fault-simulator contract: break a link, list
affected customers, show the backup path.
