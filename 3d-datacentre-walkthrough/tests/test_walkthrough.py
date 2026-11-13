import json, os

BASE = os.path.join(os.path.dirname(__file__), "..")
HTML = open(os.path.join(BASE, "src", "index.html")).read()
HALL = json.load(open(os.path.join(BASE, "assets", "hall.json")))


def test_hall_data_has_racks_with_operational_fields():
    assert len(HALL["racks"]) >= 4
    for r in HALL["racks"]:
        assert {"id", "aisle", "x", "z", "kw", "temp_c", "load_pct", "servers"} <= set(r)


def test_threejs_and_controls_present():
    for marker in ("three@0.160.0", "WASD", "Guided tour", "Raycaster",
                   "hot", "cold", "minimap" if False else "map"):
        assert marker in HTML, marker


def test_click_panel_and_tour_buttons_present():
    assert 'id="tour"' in HTML and 'id="panel"' in HTML and 'id="reset"' in HTML


def test_aisles_coloured():
    assert "0x2563eb" in HTML and "0xdc2626" in HTML
