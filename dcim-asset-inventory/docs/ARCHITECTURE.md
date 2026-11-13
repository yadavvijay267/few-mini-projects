# Architecture

## Store

`assets/inventory.json` — a JSON list of assets. Each asset:

```json
{"id": "SRV-001", "type": "server", "model": "Dell R750", "room": "Hall A",
 "rack": "A-01", "u_start": 10, "u_height": 2, "owner": "Platform",
 "status": "in-service", "power_w": 450, "warranty_end": "2027-06-30",
 "purchase_date": "2024-06-15", "serial": "SN-10001"}
```

`src/store.py` loads/saves it with file locking semantics (write to a
temp file, then atomic rename) and validates U-space overlaps within a
rack on insert.

## App

`src/app.py` — a `http.server` app:
- `GET /` serves the UI (`src/index.html`).
- `GET /api/assets?...` list/search/filter; `POST /api/assets` create;
  `PUT /api/assets/<id>` update; `DELETE /api/assets/<id>` delete.
- `GET /api/capacity` — per-rack U and power rollups.
- `GET /api/alerts` — warranty expiring within 90 days + end-of-life.
- `GET /api/export.csv` and `POST /api/import.csv` (CSV round-trip).
- `GET /api/label/<id>` — printable SVG label code for the asset.

## Capacity model

Racks are 42U with a power capacity defined in `assets/racks.json`
(default 8000 W). Rollups report U used/free and watts used/free, and
flag racks over 85% on either dimension.

## Production path

Replace the JSON store with PostgreSQL + Prisma (as the guide names),
add authentication and an audit trail, and swap the label endpoint for a
real QR code (`qrcode` library) encoding the asset URL. Keep the same
API shape so the UI does not change.
