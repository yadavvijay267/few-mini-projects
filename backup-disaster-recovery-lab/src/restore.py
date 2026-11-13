#!/usr/bin/env python3
"""Restore: verifies a backup's checksum against its manifest, then copies it
to a fresh destination (a fresh host / container in production).
Usage: python3 src/restore.py --backup backups/latest --dest data/restored/app.db
"""
import argparse, hashlib, json, os, shutil, sys
def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""): h.update(chunk)
    return h.hexdigest()
def restore(backup_ref, dest):
    if os.path.isdir(backup_ref) or backup_ref.endswith("latest"):
        base = backup_ref if os.path.isdir(backup_ref) else os.path.dirname(backup_ref)
        name = open(os.path.join(base, "latest")).read().strip()
        backup_file = os.path.join(base, name)
    else:
        backup_file = backup_ref
    manifest_file = backup_file.rsplit(".", 1)[0] + ".json"
    manifest = json.load(open(manifest_file))
    actual = sha256(backup_file)
    if actual != manifest["sha256"]:
        print(f"CHECKSUM MISMATCH: expected {manifest['sha256']}, got {actual}", file=sys.stderr); return None
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(backup_file, dest)
    print(f"restore OK: {dest} (checksum verified, {manifest['rows']} rows)")
    return dest
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--backup", default="backups/latest"); ap.add_argument("--dest", default="data/restored/app.db")
    a = ap.parse_args()
    sys.exit(0 if restore(a.backup, a.dest) else 1)
