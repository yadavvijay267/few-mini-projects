#!/usr/bin/env python3
"""Snapshot backup: copies a database file, records a SHA-256 checksum and a
manifest (name, timestamp, size, checksum, row count). Stdlib only.
Usage: python3 src/backup.py --db data/app.db --out backups/
"""
import argparse, hashlib, json, os, shutil, sqlite3
from datetime import datetime, timezone
def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""): h.update(chunk)
    return h.hexdigest()
def row_count(db):
    try:
        with sqlite3.connect(f"file:{db}?mode=ro", uri=True) as c:
            return c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    except Exception: return None
def backup(db, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = os.path.join(out_dir, f"app-{stamp}.db")
    shutil.copy2(db, dest)
    manifest = {"name": os.path.basename(dest), "created_utc": stamp, "bytes": os.path.getsize(dest),
                "sha256": sha256(dest), "rows": row_count(dest), "source": os.path.abspath(db)}
    with open(os.path.join(out_dir, f"app-{stamp}.json"), "w") as f: json.dump(manifest, f, indent=2)
    with open(os.path.join(out_dir, "latest"), "w") as f: f.write(manifest["name"])
    print(f"backup OK: {dest} ({manifest['bytes']} bytes, {manifest['rows']} rows, sha256 {manifest['sha256'][:12]}...)")
    return manifest
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--db", default="data/app.db"); ap.add_argument("--out", default="backups/")
    a = ap.parse_args(); backup(a.db, a.out)
