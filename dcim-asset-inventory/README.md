# DCIM Asset Inventory

A full asset register for a data centre: servers, PDUs, switches —
with location, owner, warranty, and lifecycle.

## Features

- Asset CRUD with location (room / rack / U), owner, and warranty dates.
- QR/barcode label generation per asset (printable SVG label).
- Warranty-expiry alerts and end-of-life reports.
- Search, filter, and CSV import/export.

## Standout feature — QR labels

QR labels you can print and stick on hardware — the register connects
to the physical world. (Demo labels are SVG with the asset code and a
barcode-style stripe pattern; swap in `segno` for real QR codes —
see `docs/USAGE.md`.)

## Tech stack

- Python 3.10+, SQLite (standard library) for the demo store.
- Real-stack path: Next.js, PostgreSQL, Prisma, Tailwind CSS —
  see `docs/USAGE.md`.

## How to run

```bash
python3 src/inventory.py --demo
python3 src/inventory.py add --name "Dell R750" --type server --room A --rack R-12 --u 10 --owner NOC --warranty 2027-06-01
python3 src/inventory.py list --room A
python3 src/inventory.py alerts --within-days 180
python3 -m pytest tests/ -q
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
