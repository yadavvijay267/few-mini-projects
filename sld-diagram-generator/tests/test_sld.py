"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import json, os

def load_sample():
    p = os.path.join(os.path.dirname(__file__), "..", "assets", "sample-system.json")
    with open(p) as f:
        return json.load(f)

def test_sample_is_valid_system():
    s = load_sample()
    assert s["transformer"]["kva"] == 1000
    assert len(s["panels"]) == 3
    assert all("breaker_a" in p and "loads" in p for p in s["panels"])

def test_transformer_full_load_current():
    # I = S / (sqrt(3) * V): 1000 kVA at 415 V -> ~1391 A
    import math
    i = 1000 * 1000 / (math.sqrt(3) * 415)
    assert 1390 < i < 1392

def test_total_load_within_transformer():
    s = load_sample()
    total_kw = sum(l["kw"] for p in s["panels"] for l in p["loads"])
    assert total_kw == 378
    assert total_kw < s["transformer"]["kva"]  # kW < kVA rating at pf<1 margin

def test_html_has_export_buttons():
    p = os.path.join(os.path.dirname(__file__), "..", "src", "index.html")
    html = open(p).read()
    assert "Export SVG" in html and "Export PNG" in html
    assert "sample-system" in html or "Load sample" in html
