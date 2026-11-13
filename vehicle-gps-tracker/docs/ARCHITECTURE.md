# Architecture — Vehicle GPS Tracker

Single-file web app (`src/index.html`, Leaflet loaded from CDN):

- Simulator: 3 vehicles follow generated routes around Noida (depot at
  28.5355, 77.3910); each tick advances the vehicle along its polyline,
  speed derived from segment distance / tick time.
- Map: Leaflet markers + polylines; a red circle marks the depot geofence
  (500 m). Entry/exit is detected with the haversine distance to the
  depot centre and logged as an alert.
- Replay: the route history is stored per vehicle; the time slider scrubs
  the whole day, and **▶ Replay** animates it at 30× speed.
- Real data: the import box accepts NMEA `$GPGGA`/`$GPRMC` sentences
  (lat/lon parsed from ddmm.mmmm format) or a GPX file (track points
  parsed from `<trkpt lat lon>`). Parsed points replace the simulated
  route for vehicle V-101.
- Offline fallback: if Leaflet fails to load, the page shows a message
  and still renders the route list, speeds and geofence log.

Tests (`tests/test_gps.py`) validate the haversine function, NMEA parsing
and the sample GPX file.
