# MQTT Setup (real broker)

This dashboard works fully with its built-in simulator — no broker needed.
To connect real devices:

1. Install Mosquitto: `sudo apt install mosquitto mosquitto-clients`
2. Start it: `mosquitto -v` (default port 1883, no auth on localhost)
3. For browser access, enable websockets in `mosquitto.conf`:
   `listener 9001` + `protocol websockets`
4. Enter `ws://localhost:9001` in the dashboard's broker URL field and click Connect.
5. Devices publish state to `home/<room>/<device>/state` and listen on
   `home/<room>/<device>/set` (payloads: `ON`, `OFF`, or a dimmer 0–100).

Test from a terminal: `mosquitto_pub -t home/living/light/set -m ON`
and watch with `mosquitto_sub -t 'home/#' -v`.
