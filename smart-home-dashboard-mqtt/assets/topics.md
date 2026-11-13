# MQTT topics

- `home/<room>/<device>/state` — device publishes its state (ON/OFF, dimmer, sensor values)
- `home/<room>/<device>/set` — dashboard publishes commands (ON, OFF, or dimmer 0-100)
- `home/living/temp/state` — temperature sensor, degrees C
- `home/bedroom/humidity/state` — humidity sensor, %
