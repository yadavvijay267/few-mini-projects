"""JSON asset store: load/save, validation, search, rollups, alerts."""
import csv, datetime, io, json, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INVENTORY = os.path.join(BASE, "assets", "inventory.json")
RACKS = os.path.join(BASE, "assets", "racks.json")
FIELDS = ["id", "type", "model", "room", "rack", "u_start", "u_height", "owner",
          "status", "power_w", "warranty_end", "purchase_date", "serial"]
STATUSES = {"in-service", "maintenance", "spare", "end-of-life", "decommissioned"}

def load():
    with open(INVENTORY) as f:
        return json.load(f)

def save(assets):
    tmp = INVENTORY + ".tmp"
    with open(tmp, "w") as f:
        json.dump(assets, f, indent=2)
    os.replace(tmp, INVENTORY)

def load_racks():
    with open(RACKS) as f:
        return json.load(f)

def validate(asset, existing):
    errors = []
    for field in FIELDS:
        if field not in asset:
            errors.append(f"missing field: {field}")
    if asset.get("status") not in STATUSES:
        errors.append(f"bad status: {asset.get('status')}")
    if asset.get("u_height", 0) > 0:
        for other in existing:
            if other["id"] == asset["id"] or other["rack"] != asset["rack"]:
                continue
            a1, a2 = asset["u_start"], asset["u_start"] + asset["u_height"] - 1
            b1, b2 = other["u_start"], other["u_start"] + other["u_height"] - 1
            if a1 <= b2 and b1 <= a2:
                errors.append(f"U-space overlap with {other['id']} in rack {asset['rack']}")
    return errors

def search(assets, query="", type_="", room="", status=""):
    q = query.lower()
    out = []
    for a in assets:
        if q and q not in " ".join(str(v) for v in a.values()).lower():
            continue
        if type_ and a["type"] != type_:
            continue
        if room and a["room"] != room:
            continue
        if status and a["status"] != status:
            continue
        out.append(a)
    return out

def capacity(assets):
    racks = load_racks()
    roll = {}
    for rack, spec in racks.items():
        items = [a for a in assets if a["rack"] == rack and a["status"] != "decommissioned"]
        u_used = sum(a["u_height"] for a in items)
        watts = sum(a["power_w"] for a in items)
        roll[rack] = {"room": spec["room"], "u_total": spec["u_total"], "u_used": u_used,
                      "u_free": spec["u_total"] - u_used,
                      "power_capacity_w": spec["power_capacity_w"], "power_used_w": watts,
                      "power_free_w": spec["power_capacity_w"] - watts,
                      "u_pct": round(100 * u_used / spec["u_total"], 1),
                      "power_pct": round(100 * watts / spec["power_capacity_w"], 1) if spec["power_capacity_w"] else 0,
                      "over_85pct": (u_used / spec["u_total"] >= 0.85) or
                                    (spec["power_capacity_w"] and watts / spec["power_capacity_w"] >= 0.85),
                      "assets": len(items)}
    return roll

def alerts(assets, days=90, today=None):
    today = today or datetime.date.today()
    out = []
    for a in assets:
        if a["status"] == "decommissioned":
            continue
        try:
            end = datetime.date.fromisoformat(a["warranty_end"])
        except ValueError:
            continue
        delta = (end - today).days
        if delta < 0:
            out.append({**a, "alert": "warranty-expired", "days_left": delta})
        elif delta <= days:
            out.append({**a, "alert": "warranty-expiring", "days_left": delta})
        if a["status"] == "end-of-life":
            out.append({**a, "alert": "end-of-life", "days_left": delta})
    return sorted(out, key=lambda x: x["days_left"])

def to_csv(assets):
    buf = io.StringIO()
    wr = csv.DictWriter(buf, fieldnames=FIELDS)
    wr.writeheader()
    for a in assets:
        wr.writerow({k: a.get(k, "") for k in FIELDS})
    return buf.getvalue()

def from_csv(text):
    rows = list(csv.DictReader(io.StringIO(text)))
    assets = []
    for r in rows:
        r["u_start"] = int(r["u_start"] or 0)
        r["u_height"] = int(r["u_height"] or 0)
        r["power_w"] = int(r["power_w"] or 0)
        assets.append(r)
    return assets

def label_svg(asset_id):
    """Deterministic SVG code block derived from the asset ID (not a real QR code)."""
    import hashlib
    bits = hashlib.sha256(asset_id.encode()).digest()
    cells, size = 21, 8
    rects = []
    for i in range(cells * cells):
        byte = bits[i % len(bits)]
        if (byte >> (i % 8)) & 1:
            x, y = (i % cells) * size, (i // cells) * size
            rects.append(f'<rect x="{x}" y="{y}" width="{size}" height="{size}"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="220" viewBox="0 0 168 220">'
            f'<rect width="168" height="220" fill="white"/><g fill="black">{"".join(rects)}</g>'
            f'<text x="84" y="200" text-anchor="middle" font-family="monospace" font-size="14">{asset_id}</text></svg>')
