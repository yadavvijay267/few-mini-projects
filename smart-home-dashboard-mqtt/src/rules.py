"""Smart-home automation rule engine. Original code."""
import argparse, json

def evaluate_rule(rule, sensors):
    """rule: {sensor, operator, threshold, action_device, action}.
    Returns the action dict if the rule fires, else None."""
    value = sensors.get(rule["sensor"])
    if value is None:
        return None
    op = rule["operator"]
    hit = {"gt": value > rule["threshold"], "lt": value < rule["threshold"],
           "gte": value >= rule["threshold"], "lte": value <= rule["threshold"],
           "eq": value == rule["threshold"]}.get(op)
    if not hit:
        return None
    return {"device": rule["action_device"], "action": rule["action"],
            "topic": f"home/{rule['action_device']}/set"}

DEFAULT_RULES = [
    {"name": "Hot room -> fan on", "sensor": "living_temp", "operator": "gt",
     "threshold": 28, "action_device": "living/fan", "action": "ON"},
    {"name": "Humid -> dehumidifier on", "sensor": "bedroom_humidity", "operator": "gt",
     "threshold": 70, "action_device": "bedroom/dehumidifier", "action": "ON"},
    {"name": "Night -> porch light on", "sensor": "outdoor_lux", "operator": "lt",
     "threshold": 50, "action_device": "porch/light", "action": "ON"},
]

def evaluate_all(rules, sensors):
    return [a for r in rules if (a := evaluate_rule(r, sensors))]

def main():
    p = argparse.ArgumentParser(description="Smart-home rule engine")
    p.add_argument("--sensors", default='{"living_temp": 29, "bedroom_humidity": 65, "outdoor_lux": 20}')
    a = p.parse_args()
    print(json.dumps(evaluate_all(DEFAULT_RULES, json.loads(a.sensors)), indent=2))

if __name__ == "__main__":
    main()
