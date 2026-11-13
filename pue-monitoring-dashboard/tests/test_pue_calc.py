import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from pue_calc import pue, breakdown, what_if_cooling, energy_cost_inr
import pytest

def test_pue_basic():
    assert pue(700, 500) == 1.4
    assert pue(600, 500) == 1.2

def test_pue_zero_it():
    with pytest.raises(ValueError):
        pue(100, 0)

def test_breakdown():
    b = breakdown(500, 180, 15, 25)
    assert b["total_kw"] == 720.0
    assert b["pue"] == 1.44
    assert b["overhead_kw"] == 220.0

def test_what_if_cooling():
    b = what_if_cooling(500, 180, 15, 25, 10)
    assert b["cooling_kw"] == 162.0
    assert b["pue"] == 1.404  # (500+162+15+25)/500

def test_energy_cost():
    assert energy_cost_inr(720, 720, 8) == 4147200.0
