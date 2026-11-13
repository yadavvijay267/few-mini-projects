# Smart Home Dashboard (MQTT)

A dashboard for smart-home devices over MQTT: lights, fans, temperature and door sensors, with automation rules. Ships with a device simulator, so it works fully without any hardware.

## Features
- Device list with live state (on/off, temperature, humidity, dimmer level)
- Toggle devices and set dimmer levels from the dashboard
- Automation rules ('if temp > 28 C, turn on fan') that actually run
- Simulated MQTT feed in the browser; broker URL field to point at a real Mosquitto broker
- MQTT topic map and Mosquitto setup notes in docs/

## Formulas
Rule evaluation: every sensor tick, each enabled rule compares the latest sensor value with its threshold and publishes the matching command (e.g. home/living/fan/set = ON).
Topics follow the pattern home/<room>/<device>/state and home/<room>/<device>/set.
Simulated sensors drift realistically: temperature follows a slow sine + noise, humidity 40–70%, power per device from its rated watts x state.

## Tech Stack
- Vanilla HTML, CSS and JavaScript (no build step, no backend)
- Python calculation module in `src/` with pytest tests

## How to Run
1. Open `src/index.html` in any browser — simulated devices start immediately, no broker needed.
2. To use a real broker, see `docs/MQTT_SETUP.md`.
3. `python3 src/rules.py --help` for the rule-engine CLI, or `python3 -m pytest tests/ -v` for the tests.

## Screenshots
See `screenshots/SCREENSHOTS.md`.

## License
MIT — Copyright (c) 2026 Clamor. See `LICENSE`.
