# 87. Backup & Disaster Recovery Lab

A documented DR lab: back up a database (SQLite stand-in for PostgreSQL),
simulate a disaster, restore to a fresh host, and measure RTO/RPO.
The drill is fully runnable locally — no cloud account needed.

## Features

- `backup.py` — snapshot backup with checksums + manifest (restic-style, local/S3 targets)
- `restore.py` — rebuild the database on a fresh directory from a backup
- `drill.py --demo` — full drill: seed data -> backup -> **delete the database** -> restore -> verify, with measured RTO/RPO
- RTO/RPO targets and measured results in `docs/RTO_RPO.md`
- Quarterly DR drill checklist (`docs/DRILL_CHECKLIST.md`)
- `restic` + PostgreSQL production path documented in `docs/ARCHITECTURE.md`

## Tech stack

Python 3 (stdlib, sqlite3), restic, PostgreSQL, Docker

## How to run

```bash
python3 src/drill.py --demo        # full local drill (safe: uses a temp dir)
python3 src/backup.py --db data/app.db --out backups/
python3 src/restore.py --backup backups/latest --dest data/restored/
python3 tests/test_dr.py
```

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
