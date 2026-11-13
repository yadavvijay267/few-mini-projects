"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import math
from pfcalc import pf, reactive_power, correction_kvar, bank_size, analyze

def test_pf_and_reactive():
    assert pf(500, 640) == pytest.approx(0.78125, abs=1e-4)
    assert reactive_power(300, 500) == pytest.approx(400.0)

def test_correction_kvar_textbook():
    # 500 kW, 0.78 -> 0.95: tan(acos .78)=0.802, tan(acos .95)=0.329
    need = correction_kvar(500, 0.78, 0.95)
    assert need == pytest.approx(500 * (math.tan(math.acos(0.78)) - math.tan(math.acos(0.95))), rel=1e-9)
    assert 235 < need < 240  # ~237 kVAr

def test_bank_rounds_up_to_step():
    size, steps = bank_size(237.0, 25)
    assert size == 250 and steps == 10
    size, steps = bank_size(250.0, 25)
    assert size == 250 and steps == 10

def test_no_correction_when_already_good():
    assert correction_kvar(500, 0.97, 0.95) == 0.0

def test_analyze_payback():
    r = analyze(500, pf_now=0.78, target=0.95)
    assert r["bank_kvar"] == 250
    assert r["monthly_saving_rs"] > 0
    assert 0 < r["payback_months"] < 24

import pytest
