# Automated Backup Tool

Scheduled, incremental backups with compression, optional AES encryption,
a retention policy, a restore command — and a `verify` command that proves
a backup is actually restorable.

## Features

- **Incremental** — only new or changed files (detected by SHA-256 hash)
  go into each backup; unchanged files are skipped
- **Compression** — every backup is a deflated ZIP archive
- **AES encryption** — Fernet (AES-128-CBC + HMAC) with a passphrase from
  `--password` or the `BACKUP_PASSWORD` environment variable
- **Retention policy** — `prune --keep N` deletes all but the newest N
- **Restore** — extract any backup to a folder
- **Verify** — the stand-out feature: checksums the archive, extracts it
  fully to a temp dir and confirms every file comes out clean
- **Schedule** — loop mode that backs up every N minutes

## Tech stack

Python 3 standard library (`zipfile`, `hashlib`) plus `cryptography` for
Fernet encryption.

## How to run

```bash
pip install -r requirements.txt

# Back up a folder (second run is incremental)
python3 src/backup_tool.py backup ~/Documents --dest ./backups

# Encrypted backup
export BACKUP_PASSWORD='a strong passphrase'
python3 src/backup_tool.py backup ~/Documents --dest ./backups --encrypt

# List, verify, restore
python3 src/backup_tool.py list --dest ./backups
python3 src/backup_tool.py verify ./backups/backup-20261112-070000.zip
python3 src/backup_tool.py restore ./backups/backup-20261112-070000.zip --to ./restored

# Keep only the newest 5 backups
python3 src/backup_tool.py prune --dest ./backups --keep 5

# Run every 60 minutes until stopped
python3 src/backup_tool.py schedule ~/Documents --dest ./backups --every 60

# Full demo in temporary folders
python3 src/backup_tool.py --demo
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
python3 -m pytest tests/ -v
```

## License

MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
