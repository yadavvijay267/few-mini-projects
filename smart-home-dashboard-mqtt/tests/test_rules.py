import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from rules import evaluate_rule, evaluate_all, DEFAULT_RULES

def test_hot_room_fires_fan():
    r = DEFAULT_RULES[0]
    a = evaluate_rule(r, {"living_temp": 29})
    assert a == {"device": "living/fan", "action": "ON", "topic": "home/living/fan/set"}

def test_below_threshold_no_fire():
    assert evaluate_rule(DEFAULT_RULES[0], {"living_temp": 27}) is None

def test_missing_sensor_no_fire():
    assert evaluate_rule(DEFAULT_RULES[0], {}) is None

def test_evaluate_all():
    actions = evaluate_all(DEFAULT_RULES, {"living_temp": 29, "bedroom_humidity": 65, "outdoor_lux": 20})
    devices = [a["device"] for a in actions]
    assert "living/fan" in devices and "porch/light" in devices
    assert "bedroom/dehumidifier" not in devices  # 65 < 70
