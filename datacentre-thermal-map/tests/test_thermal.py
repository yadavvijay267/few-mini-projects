"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import csv, os

def rows():
    p = os.path.join(os.path.dirname(__file__), "..", "assets", "sample-sensors.csv")
    with open(p, newline="") as f:
        return list(csv.DictReader(f))

def test_csv_shape():
    rs = rows()
    assert len(rs) == 10
    assert all(len(r) == 13 for r in rs)  # hour + 12 racks
    assert all(20 <= float(r["R05"]) <= 30 for r in rs)

def test_hotspot_threshold():
    rs = rows()
    hot = [r for r in rs if float(r["R05"]) > 27]
    assert hot  # R05 exceeds 27 C in the afternoon
    assert all(float(r["R05"]) <= 27 for r in rs if int(r["hour"]) < 9)

def test_peak_in_afternoon():
    rs = rows()
    by_hour = {int(r["hour"]): float(r["R05"]) for r in rs}
    assert by_hour[14] > by_hour[0] > by_hour[3] or by_hour[14] > by_hour[3]
    assert by_hour[14] == max(by_hour.values())

def test_html_has_slider_and_hotspot():
    html = open(os.path.join(os.path.dirname(__file__), "..", "src", "index.html")).read()
    assert 'type="range"' in html and "Hotspot report" in html and "27" in html
