"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest
from solar import panel_count, system_kwp, annual_generation, estimate, tilt_factor, orientation_factor

def test_panel_count():
    # 100 m2 -> 70 usable / 2.2 = 31 panels
    assert panel_count(100) == 31
    assert panel_count(10) == 3

def test_system_kwp():
    assert system_kwp(31) == pytest.approx(17.05)

def test_generation_formula():
    # 10 kWp x 5 PSH x 365 x 0.78 PR
    assert annual_generation(10, 5.0) == pytest.approx(10 * 5 * 365 * 0.78)

def test_tilt_optimal_at_latitude():
    assert tilt_factor(28.5, 28.5) == pytest.approx(1.0)
    assert tilt_factor(0, 28.5) < 1.0

def test_south_beats_east():
    assert orientation_factor(180) == pytest.approx(1.0)
    assert orientation_factor(90) < 1.0

def test_estimate_payback_falls_with_tariff():
    low = estimate(100, 5.1, tariff=5)
    high = estimate(100, 5.1, tariff=10)
    assert high["payback_years"] < low["payback_years"]
    assert low["panels"] == 31 and low["annual_kwh"] > 20000
