"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import math, re, os, pytest

def haversine(a, b):
    R = 6371000
    dlat = math.radians(b[0] - a[0]); dlon = math.radians(b[1] - a[1])
    h = math.sin(dlat/2)**2 + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(dlon/2)**2
    return 2 * R * math.asin(math.sqrt(h))

def nmea_lat(s, hemi):
    v = float(s[:2]) + float(s[2:]) / 60
    return -v if hemi == "S" else v

def nmea_lon(s, hemi):
    v = float(s[:3]) + float(s[3:]) / 60
    return -v if hemi == "W" else v

def test_haversine_known_distance():
    # Noida depot to a point 0.01 deg north ~= 1112 m
    d = haversine((28.5355, 77.3910), (28.5455, 77.3910))
    assert 1100 < d < 1125

def test_haversine_zero():
    assert haversine((28.5, 77.4), (28.5, 77.4)) == 0.0

def test_nmea_parsing():
    assert nmea_lat("2832.1300", "N") == pytest.approx(28.5355, abs=1e-4)
    assert nmea_lon("07723.4600", "E") == pytest.approx(77.3910, abs=1e-4)

def test_sample_gpx_has_trackpoints():
    p = os.path.join(os.path.dirname(__file__), "..", "assets", "sample-track.gpx")
    txt = open(p).read()
    pts = re.findall(r'trkpt lat="([\d.]+)" lon="([\d.]+)"', txt)
    assert len(pts) == 5
    lats = [float(a) for a, _ in pts]
    assert lats == sorted(lats)  # route heads north
    total = sum(haversine((float(a), float(b)), (float(c), float(d)))
                for (a, b), (c, d) in zip(pts, pts[1:]))
    assert 4000 < total < 8000  # ~5.5 km delivery run

def test_html_mentions_leaflet_and_geofence():
    html = open(os.path.join(os.path.dirname(__file__), "..", "src", "index.html")).read()
    assert "leaflet" in html.lower() and "geofence" in html.lower()
    assert "GPGGA" in html and "GPX" in html
