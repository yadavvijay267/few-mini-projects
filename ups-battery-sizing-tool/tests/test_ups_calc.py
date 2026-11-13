import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from ups_calc import ups_rating_kva, battery_ah, runtime_minutes, compare

def test_ups_rating():
    assert ups_rating_kva(20) == 25  # 20 x 1.25
    assert ups_rating_kva(10) == 13  # ceil(12.5)

def test_battery_ah_vrla():
    # 18 kW, 30 min, 480 V, VRLA, temp 1.0:
    # energy = 18000*0.5/0.92 = 9782.6 Wh; Ah = 9782.6/480*1.25/0.8 = 31.8
    r = battery_ah(18, 30, 480, "VRLA", temp_factor=1.0)
    assert abs(r["required_ah"] - 31.8) < 0.2
    assert r["cells_series"] == 240  # 480/2
    assert r["strings_parallel"] == 1

def test_runtime_roundtrip():
    r = battery_ah(18, 30, 480, "VRLA", temp_factor=1.0)
    rt = runtime_minutes(18, r["required_ah"], 480, "VRLA")
    assert abs(rt - 30) < 1.0

def test_liion_smaller_ah():
    v = battery_ah(18, 30, 480, "VRLA", temp_factor=1.0)
    l = battery_ah(18, 30, 480, "Li-ion", temp_factor=1.0)
    assert l["required_ah"] < v["required_ah"]  # deeper DoD
    c = compare(18, 30)
    assert c["Li-ion"]["cost_inr"] > c["VRLA"]["cost_inr"]
    assert c["Li-ion"]["footprint_m2"] < c["VRLA"]["footprint_m2"]
