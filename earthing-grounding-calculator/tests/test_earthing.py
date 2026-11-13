"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import math, pytest
from earthing import (wenner_resistivity, rod_resistance, rods_resistance,
                      grid_resistance, tolerable_touch, tolerable_step, design_check)

def test_wenner():
    # rho = 2*pi*a*R = 2*pi*2*8 = 100.5
    assert wenner_resistivity(2, 8) == pytest.approx(2 * math.pi * 2 * 8)

def test_rod_formula():
    r = rod_resistance(100, 3, 0.016)
    assert r == pytest.approx(100 / (2 * math.pi * 3) * math.log(4 * 3 / 0.016))
    assert 30 < r < 40  # ~35 ohm in 100 ohm-m soil

def test_more_rods_lower_resistance():
    one = rods_resistance(100, 3, 0.016, 1, 6)
    nine = rods_resistance(100, 3, 0.016, 9, 6)
    assert nine < one
    assert nine < one / 5

def test_grid_beats_single_rod():
    rg = grid_resistance(100, 400, 200, 0.5)
    assert rg < rod_resistance(100, 3, 0.016)
    assert 0 < rg < 10

def test_tolerable_voltages_fall_with_duration():
    assert tolerable_touch(3000, 0.7, 0.5) > tolerable_touch(3000, 0.7, 1.0)
    assert tolerable_step(3000, 0.7, 0.5) > tolerable_touch(3000, 0.7, 0.5)

def test_design_check_passes_for_small_grid_r():
    chk = design_check(100, 1.0, 1000, 0.5)
    assert chk["touch_ok"] and chk["step_ok"]
    assert chk["gpr_v"] == pytest.approx(1000.0)
