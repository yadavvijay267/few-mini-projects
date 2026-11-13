import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from energy_calc import energy_kwh, cost_inr, vampire_report, alert_check, biggest_consumer

def test_energy_and_cost():
    assert energy_kwh(1500, 4) == 6.0
    assert cost_inr(6.0, 8) == 48.0

def test_vampire_report():
    devs = [{"name": "TV", "standby_w": 12, "idle": True},
            {"name": "Router", "standby_w": 10, "idle": True},
            {"name": "Heater", "standby_w": 0, "idle": True},
            {"name": "Fridge", "standby_w": 3, "idle": False}]
    r = vampire_report(devs)
    assert [x["name"] for x in r] == ["TV", "Router"]  # sorted by waste, heater 0W and non-idle excluded
    assert r[0]["monthly_kwh"] == 8.64  # 12*24*30/1000

def test_alert_check():
    assert alert_check({"typical_w": 100}, 160) is True
    assert alert_check({"typical_w": 100}, 140) is False

def test_biggest_consumer():
    assert biggest_consumer([{"name": "A", "kwh": 2}, {"name": "B", "kwh": 9}]) == "B"
