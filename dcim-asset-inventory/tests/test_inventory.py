import os, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import datetime
from inventory import connect, add, list_assets, warranty_alerts, export_csv, import_csv, qr_label_svg


def _conn():
    return connect(os.path.join(tempfile.mkdtemp(), "test.db"))


def test_add_and_list_and_search():
    conn = _conn()
    add(conn, "Dell R750", "server", "A", "R-12", 10, "NOC", "2027-06-01")
    add(conn, "APC PDU", "pdu", "A", "R-12", 1, "Facilities", "2026-12-15")
    assert len(list_assets(conn)) == 2
    assert len(list_assets(conn, room="A", type_="server")) == 1
    assert len(list_assets(conn, query="Dell")) == 1
    assert list_assets(conn, query="zzz") == []


def test_warranty_alerts_flag_expiring_and_expired():
    conn = _conn()
    add(conn, "Soon", "server", "A", "R-1", 1, "NOC", "2026-12-01")
    add(conn, "Later", "server", "A", "R-1", 2, "NOC", "2029-01-01")
    add(conn, "Gone", "server", "A", "R-1", 3, "NOC", "2025-01-01")
    today = datetime.date(2026, 11, 12)
    alerts = warranty_alerts(conn, within_days=180, today=today)
    names = [a["name"] for a in alerts]
    assert "Soon" in names and "Gone" in names and "Later" not in names
    assert [a for a in alerts if a["name"] == "Gone"][0]["expired"] is True


def test_csv_roundtrip():
    conn = _conn()
    add(conn, "Dell R750", "server", "A", "R-12", 10, "NOC", "2027-06-01")
    path = os.path.join(tempfile.mkdtemp(), "out.csv")
    assert export_csv(conn, path) == 1
    conn2 = _conn()
    assert import_csv(conn2, path) == 1
    assert list_assets(conn2)[0]["name"] == "Dell R750"


def test_qr_label_contains_code_and_location():
    conn = _conn()
    aid = add(conn, "Dell R750", "server", "A", "R-12", 10, "NOC", "2027-06-01")
    asset = list_assets(conn)[0]
    svg = qr_label_svg(asset)
    assert "SER-0001" in svg and "R-12" in svg and svg.startswith("<svg")
