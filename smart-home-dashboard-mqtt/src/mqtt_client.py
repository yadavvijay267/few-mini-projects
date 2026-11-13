"""Example: connect the dashboard topics to a real Mosquitto broker.

Requires: pip install paho-mqtt
Run: python3 src/mqtt_client.py --broker localhost
This is a reference client, not required by the web dashboard (which simulates).
"""
import argparse, json

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

def on_message(client, userdata, msg):
    print(f"{msg.topic}: {msg.payload.decode()}")

def main():
    p = argparse.ArgumentParser(description="MQTT client for the smart-home dashboard")
    p.add_argument("--broker", default="localhost")
    p.add_argument("--port", type=int, default=1883)
    a = p.parse_args()
    if mqtt is None:
        print("paho-mqtt is not installed. Run: pip install paho-mqtt")
        return
    c = mqtt.Client()
    c.on_message = on_message
    c.connect(a.broker, a.port)
    c.subscribe("home/#")
    print(f"Connected to {a.broker}:{a.port}, subscribed to home/# (Ctrl+C to stop)")
    c.loop_forever()

if __name__ == "__main__":
    main()
