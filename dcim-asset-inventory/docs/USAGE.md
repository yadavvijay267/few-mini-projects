# Usage — DCIM Asset Inventory

```bash
python3 src/inventory.py --demo
python3 src/inventory.py add --name "Dell R750" --type server --room A --rack R-12 --u 10 --owner NOC --warranty 2027-06-01
python3 src/inventory.py list --room A
python3 src/inventory.py alerts --within-days 180
python3 -m pytest tests/ -q
```

CSV import/export: `assets/sample_assets.csv` shows the format.
Warranty alerts list assets expiring within N days (expired ones flagged).

## Real-stack path

Next.js + Prisma + PostgreSQL: same tables (`assets` with room/rack/U,
owner, warranty, status), same alert rule (warranty within 180 days),
same CSV format. Real QR codes: `pip install segno` and replace
`qr_label_svg` with `segno.make(code).save(f"label-{id}.svg")`.
