import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from rack_calc import rack_totals, stranded_u, room_summary

DEV = [{"u_size": 2, "power_kw": 0.5, "weight_kg": 25}]

def test_rack_totals():
    t = rack_totals([DEV[0]] * 10)
    assert t["used_u"] == 20 and t["free_u"] == 22
    assert t["power_kw"] == 5.0 and t["u_pct"] == 47.6
    assert t["over_power"] is False

def test_over_power():
    t = rack_totals([{"u_size": 2, "power_kw": 1.0, "weight_kg": 25}] * 10)
    assert t["over_power"] is True

def test_stranded_capacity():
    # Rack nearly full on power: 15 x 0.5 kW = 7.5 kW, 30U used, 12U free but only 0.5 kW left = 1 device (2U) fits -> 10U stranded
    devs = [{"u_size": 2, "power_kw": 0.5, "weight_kg": 25}] * 15
    assert stranded_u(devs) == 10
    # Empty rack: 8 kW / 0.5 kW per 2U device = 16 devices = 32U, so 10U is stranded
    assert stranded_u([]) == 10

def test_room_summary():
    s = room_summary([[DEV[0]], [DEV[0]]], room_power_kw=100)
    assert s["racks"] == 2 and s["total_power_kw"] == 1.0 and s["headroom_kw"] == 99.0
