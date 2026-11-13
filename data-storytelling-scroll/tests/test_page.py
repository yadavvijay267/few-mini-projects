import os, re

SRC = os.path.join(os.path.dirname(__file__), "..", "src")
ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")


def _read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()


def test_html_has_five_steps_and_sticky_panel():
    html = _read("index.html")
    assert html.count('class="step"') == 5
    assert "chart-panel" in html
    assert "Replay story" in html or "replay" in html


def test_js_uses_intersection_observer_and_reduced_motion():
    js = _read("app.js")
    assert "IntersectionObserver" in js
    assert "prefers-reduced-motion" in js


def test_charts_cover_bar_line_area_trend():
    js = _read("charts.js")
    for view in ("drawBar", "drawLine", "drawArea", "drawTrend"):
        assert view in js


def test_dataset_spans_2000_to_2024():
    with open(os.path.join(ASSETS, "renewable_energy.csv"), encoding="utf-8") as f:
        lines = f.read().strip().splitlines()
    assert len(lines) == 26  # header + 25 years
    assert lines[1].startswith("2000,")
    assert lines[-1].startswith("2024,")
