"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest
from failover import simulate, what_breaks

def base(**kw):
    cfg = {"load_kw": 500, "ups_kva": 1000, "ups_runtime_s": 900, "gen_kva": 900,
           "gen_start_s": 15, "gen_ramp_s": 5, "ats_delay_s": 3, "restore_s": 120,
           "shed_loads": [{"name": "Office", "kw": 100, "priority": 3}]}
    cfg.update(kw)
    return cfg

def test_healthy_design_has_no_gap():
    sim = simulate(base())
    assert sim["gap_seconds"] == 0
    assert sim["shed"] == []
    assert "No gap" in what_breaks(sim)

def test_oversized_load_sheds_lowest_priority_first():
    sim = simulate(base(load_kw=950, shed_loads=[
        {"name": "Office", "kw": 120, "priority": 3},
        {"name": "Lab", "kw": 80, "priority": 2}]))
    names = [s["name"] for s in sim["shed"]]
    assert names[0] == "Office"  # priority 3 sheds first
    assert sim["final_load_kw"] <= 900

def test_no_sheddable_load_means_gap():
    sim = simulate(base(load_kw=1200, shed_loads=[]))
    assert sim["gap_seconds"] > 0
    assert sim["max_shortfall_kw"] > 0
    assert "GAP" in what_breaks(sim)

def test_ups_exhaustion_before_generator():
    sim = simulate(base(load_kw=900, ups_runtime_s=5, gen_start_s=60))
    assert any("EXHAUSTED" in e["event"] for e in sim["events"])

def test_events_cover_key_moments():
    sim = simulate(base())
    ts = [e["t"] for e in sim["events"]]
    assert 0 in ts and 15 in ts and 120 in ts
