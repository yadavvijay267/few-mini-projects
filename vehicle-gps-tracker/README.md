# Vehicle GPS Tracker (Simulated + Real)

Track vehicles on a live map with speed, route history and geofence
alerts. Fleet management — the core of logistics operations — with no
hardware required.

## Features

- Live map (Leaflet via CDN, with an offline fallback message) with moving
  vehicle markers and speed
- **Route history replay with a time slider** — watch a whole day's
  driving in 30 seconds
- Geofences: a circular zone around the depot; alerts on entry/exit
- Simulated fleet included; paste a real **NMEA** sentence or **GPX** track
  to replay real GPS data
- Haversine distance and speed computed from the track

## How to run

Open `src/index.html` in a browser (internet needed for the Leaflet map
tiles; without it the tracker still lists positions and replays the route
on a fallback grid). Press **▶ Replay** to watch the day, or paste NMEA /
GPX into the import box.

Sample files: `assets/sample-track.gpx`, `assets/sample-nmea.txt`.

## Formulas

- Haversine distance between two lat/lon points
- Speed = distance / time between consecutive fixes

## License

MIT — see `LICENSE`.
