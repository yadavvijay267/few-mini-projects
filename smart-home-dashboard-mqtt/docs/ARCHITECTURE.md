# Architecture — Smart Home Dashboard (MQTT)

`src/rules.py` is the automation rule engine (pure logic, testable): a rule is a
sensor/threshold/action triple, evaluated against the latest sensor values.
`src/app.js` runs the in-browser device simulator (sensors drift, devices publish
state), renders the dashboard, and evaluates the same rules. `src/mqtt_client.py`
shows how to connect the same topics to a real Mosquitto broker with paho-mqtt.
See `docs/MQTT_SETUP.md` for broker setup.
