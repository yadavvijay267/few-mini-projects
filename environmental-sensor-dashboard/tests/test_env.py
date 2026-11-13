"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import csv, os

def thresholds(value, warn, crit):
    return "crit" if value >= crit else ("warn" if value >= warn else "ok")

def test_threshold_boundaries():
    assert thresholds(26.9, 27, 30) == "ok"
    assert thresholds(27.0, 27, 30) == "warn"
    assert thresholds(30.0, 27, 30) == "crit"
    assert thresholds(65, 65, 75) == "warn"
    assert thresholds(0, 1, 1) == "ok"
    assert thresholds(1, 1, 1) == "crit"  # leak: any water is critical

def test_csv_has_all_sensor_types():
    p = os.path.join(os.path.dirname(__file__), "..", "assets", "sample-readings.csv")
    with open(p, newline="") as f:
        rows = list(csv.DictReader(f))
    types = {r["type"] for r in rows}
    assert {"temperature", "humidity", "leak", "door"} <= types
    leak_rows = [r for r in rows if r["type"] == "leak"]
    assert any(r["value"] == "1" for r in leak_rows)

def test_html_has_floor_plan_and_alerts():
    html = open(os.path.join(os.path.dirname(__file__), "..", "src", "index.html")).read()
    assert "Floor plan" in html and "Alert history" in html
    assert "Simulate leak" in html and "webhook" in html.lower()
