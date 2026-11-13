"""Tests: store validation, search, capacity rollups, alerts, CSV round-trip, HTTP API."""
import datetime, json, os, subprocess, sys, time, urllib.request
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "src"))
import store

def test_search_and_filter():
    assets = store.load()
    assert len(assets) == 10
    assert len(store.search(assets, query="dell")) == 3
    assert len(store.search(assets, type_="switch")) == 2
    assert len(store.search(assets, room="Hall B")) == 2
    assert len(store.search(assets, status="end-of-life")) == 1

def test_u_overlap_validation():
    assets = store.load()
    bad = {"id": "SRV-099", "type": "server", "model": "X", "room": "Hall A", "rack": "A-01",
           "u_start": 11, "u_height": 2, "owner": "T", "status": "in-service", "power_w": 100,
           "warranty_end": "2027-01-01", "purchase_date": "2024-01-01", "serial": "SN-9"}
    errors = store.validate(bad, assets)
    assert any("overlap" in e for e in errors), errors

def test_capacity_rollup():
    cap = store.capacity(store.load())
    assert cap["A-01"]["u_used"] == 5  # 2+2+1 U (PDU is 0U)
    assert cap["A-01"]["power_used_w"] == 1220
    assert cap["A-01"]["u_free"] == 37

def test_alerts_with_fixed_date():
    assets = store.load()
    alerts = store.alerts(assets, today=datetime.date(2026, 11, 1))
    kinds = {(a["id"], a["alert"]) for a in alerts}
    assert ("SRV-003", "warranty-expiring") in kinds
    assert ("SRV-005", "end-of-life") in kinds
    assert ("SRV-005", "warranty-expired") in kinds

def test_csv_round_trip():
    assets = store.load()
    back = store.from_csv(store.to_csv(assets))
    assert len(back) == len(assets) and back[0]["id"] == assets[0]["id"]

def test_label_svg():
    svg = store.label_svg("SRV-001")
    assert svg.startswith("<svg") and "SRV-001" in svg

def test_http_api():
    proc = subprocess.Popen([sys.executable, os.path.join(BASE, "src", "app.py"), "--port", "8765"],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for _ in range(30):
            time.sleep(0.3)
            try:
                data = json.load(urllib.request.urlopen("http://127.0.0.1:8765/api/assets?type=switch", timeout=2))
                break
            except Exception:
                continue
        assert len(data) == 2
        cap = json.load(urllib.request.urlopen("http://127.0.0.1:8765/api/capacity", timeout=2))
        assert cap["A-01"]["u_used"] == 5
        html = urllib.request.urlopen("http://127.0.0.1:8765/", timeout=2).read().decode()
        assert "DCIM Asset Inventory" in html
    finally:
        proc.terminate(); proc.wait(timeout=5)

def test_cli_help():
    r = subprocess.run([sys.executable, os.path.join(BASE, "src", "app.py"), "--help"], capture_output=True, text=True)
    assert r.returncode == 0
    r = subprocess.run([sys.executable, os.path.join(BASE, "src", "cli.py"), "--help"], capture_output=True, text=True)
    assert r.returncode == 0
