import json, os

BASE = os.path.join(os.path.dirname(__file__), "..")
HTML = open(os.path.join(BASE, "src", "index.html")).read()
PRODS = json.load(open(os.path.join(BASE, "assets", "products.json")))["products"]


def test_products_have_price_and_room():
    assert len(PRODS) == 4
    for p in PRODS:
        assert p["price_inr"] > 0 and p["room"] in ("living", "dining")
        assert {"id", "name", "desc"} <= set(p)


def test_shortlist_and_day_night_present():
    assert "shortlist" in HTML.lower() and "Add to shortlist" in HTML
    assert "Switch to night" in HTML and "night" in HTML


def test_hotspots_and_raycaster_present():
    assert "hotspot" in HTML and "Raycaster" in HTML
    assert "three@0.160.0" in HTML
