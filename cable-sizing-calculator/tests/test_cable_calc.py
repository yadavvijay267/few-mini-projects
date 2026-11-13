import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from cable_calc import load_current_a, voltage_drop_v, select_cable
import math

def test_three_phase_current():
    # 15 kW, 415 V, pf 0.85 -> 15000/(sqrt3*415*0.85) = 24.55 A
    assert abs(load_current_a(15, 415, 0.85, 3) - 24.55) < 0.05

def test_single_phase_current():
    assert abs(load_current_a(2, 230, 0.9, 1) - 9.66) < 0.05

def test_voltage_drop_known():
    # 60 m, 24.55 A, 10 mm2 (R 1.83, X 0.09), pf 0.85, 3-ph
    vd = voltage_drop_v(60, 24.55, 1.83, 0.09, 0.85, 3)
    assert 4.0 < vd < 5.0  # ~4.6 V

def test_select_cable_15kw_60m():
    r = select_cable(15, 415, 0.85, 60, 3, 5.0)
    # 2.5 mm2 fails ampacity (22 A < 24.55 A); 4 mm2 passes (30 A, Vd 2.44%)
    assert r["size_mm2"] == 4
    assert r["voltage_drop_pct"] < 5.0
