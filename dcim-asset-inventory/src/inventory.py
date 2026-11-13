"""DCIM asset inventory: SQLite-backed register with QR labels, warranty
alerts, CSV import/export. Standard library only.
"""
import argparse, csv, datetime, json, os, sqlite3, sys

SCHEMA = """CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, type TEXT NOT NULL, room TEXT, rack TEXT,
  u INTEGER, owner TEXT, warranty TEXT, status TEXT DEFAULT 'active'
)"""
DB = os.path.join(os.path.dirname(__file__), "..", "assets", "inventory.db")


def connect(path=DB):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute(SCHEMA)
    conn.row_factory = sqlite3.Row
    return conn


def add(conn, name, type_, room, rack, u, owner, warranty, status="active"):
    cur = conn.execute(
        "INSERT INTO assets (name,type,room,rack,u,owner,warranty,status) VALUES (?,?,?,?,?,?,?,?)",
        (name, type_, room, rack, u, owner, warranty, status))
    conn.commit()
    return cur.lastrowid


def list_assets(conn, room=None, type_=None, query=None):
    sql, params = "SELECT * FROM assets WHERE 1=1", []
    if room:
        sql += " AND room=?"; params.append(room)
    if type_:
        sql += " AND type=?"; params.append(type_)
    if query:
        sql += " AND (name LIKE ? OR owner LIKE ?)"; params += [f"%{query}%", f"%{query}%"]
    return [dict(r) for r in conn.execute(sql + " ORDER BY room, rack, u", params)]


def warranty_alerts(conn, within_days=180, today=None):
    today = today or datetime.date.today()
    out = []
    for a in list_assets(conn):
        try:
            w = datetime.date.fromisoformat(a["warranty"])
        except (ValueError, TypeError):
            continue
        delta = (w - today).days
        if 0 <= delta <= within_days:
            out.append({**a, "days_left": delta})
        elif delta < 0:
            out.append({**a, "days_left": delta, "expired": True})
    return sorted(out, key=lambda a: a["days_left"])


def export_csv(conn, path):
    rows = list_assets(conn)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "name", "type", "room", "rack", "u", "owner", "warranty", "status"])
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def import_csv(conn, path):
    n = 0
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            add(conn, row["name"], row["type"], row.get("room"), row.get("rack"),
                int(row["u"]) if row.get("u") else None, row.get("owner"),
                row.get("warranty"), row.get("status") or "active")
            n += 1
    return n


def qr_label_svg(asset):
    """Printable label: asset code + barcode-style stripes (stand-in for
    a real QR code; swap in `segno` for scannable QR — see docs)."""
    code = f"{asset['type'][:3].upper()}-{asset['id']:04d}"
    bars = "".join(
        f'<rect x="{10 + i * 6}" y="40" width="{3 if (hash(code + str(i)) % 2) else 1}" height="30" fill="black"/>'
        for i in range(30))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="220" height="90">'
            f'<rect width="220" height="90" fill="white" stroke="black"/>'
            f'<text x="10" y="20" font-family="monospace" font-size="13">{asset["name"]}</text>'
            f'<text x="10" y="36" font-family="monospace" font-size="11">{code} | {asset.get("room")}/{asset.get("rack")}/U{asset.get("u")}</text>'
            f'{bars}</svg>')


def main(argv=None):
    p = argparse.ArgumentParser(description="DCIM asset inventory")
    sub = p.add_subparsers(dest="cmd")
    sub.add_parser("demo")
    a = sub.add_parser("add")
    for f in ("name", "type", "room", "rack", "owner", "warranty"):
        a.add_argument("--" + f, required=(f in ("name", "type")))
    a.add_argument("--u", type=int)
    l = sub.add_parser("list"); l.add_argument("--room"); l.add_argument("--type"); l.add_argument("--query")
    al = sub.add_parser("alerts"); al.add_argument("--within-days", type=int, default=180)
    args = p.parse_args(argv)
    conn = connect()
    if args.cmd == "demo" or args.cmd is None:
        if not list_assets(conn):
            add(conn, "Dell PowerEdge R750", "server", "A", "R-12", 10, "NOC", "2027-06-01")
            add(conn, "APC AP8858 PDU", "pdu", "A", "R-12", 1, "Facilities", "2026-12-15")
            add(conn, "Cisco Nexus 9316", "switch", "A", "R-14", 22, "Network", "2028-01-20")
        print(json.dumps(list_assets(conn), indent=2))
        print("alerts:", json.dumps(warranty_alerts(conn), indent=2))
        return 0
    if args.cmd == "add":
        print("added id", add(conn, args.name, args.type, args.room, args.rack, args.u, args.owner, args.warranty))
    elif args.cmd == "list":
        print(json.dumps(list_assets(conn, args.room, args.type, args.query), indent=2))
    elif args.cmd == "alerts":
        print(json.dumps(warranty_alerts(conn, args.within_days), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
