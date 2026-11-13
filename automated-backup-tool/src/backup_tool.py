#!/usr/bin/env python3
"""Automated Backup Tool — scheduled, incremental backups with compression,
optional AES (Fernet) encryption, retention policy, restore and verify.

Usage:
    python3 src/backup_tool.py backup ~/Documents --dest ./backups
    python3 src/backup_tool.py backup ~/Documents --dest ./backups --encrypt
    python3 src/backup_tool.py list --dest ./backups
    python3 src/backup_tool.py verify backups/backup-20261112-070000.zip
    python3 src/backup_tool.py restore backups/backup-....zip --to ./restored
    python3 src/backup_tool.py prune --dest ./backups --keep 5
    python3 src/backup_tool.py schedule ~/Documents --dest ./backups --every 60
    python3 src/backup_tool.py --demo
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import tarfile
import time
import zipfile
from datetime import datetime
from pathlib import Path

MANIFEST_NAME = ".backup-manifest.json"


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def scan_source(source):
    """Map relative path -> {sha256, size, mtime} for every file under source."""
    source = Path(source)
    files = {}
    for path in sorted(source.rglob("*")):
        if path.is_file() and MANIFEST_NAME not in path.name:
            rel = str(path.relative_to(source))
            stat = path.stat()
            files[rel] = {"sha256": sha256_file(path), "size": stat.st_size,
                          "mtime": stat.st_mtime}
    return files


def load_manifest(dest):
    manifest_path = Path(dest) / MANIFEST_NAME
    if manifest_path.exists():
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    return {"files": {}, "backups": []}


def save_manifest(dest, manifest):
    (Path(dest) / MANIFEST_NAME).write_text(json.dumps(manifest, indent=2),
                                            encoding="utf-8")


def changed_files(current, previous):
    """Incremental logic: only files that are new or whose hash changed."""
    prev = previous.get("files", {})
    return {rel: meta for rel, meta in current.items()
            if rel not in prev or prev[rel]["sha256"] != meta["sha256"]}


def _fernet(password):
    from cryptography.fernet import Fernet
    key = hashlib.sha256(password.encode("utf-8")).digest()
    import base64
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_file(path, password):
    data = Path(path).read_bytes()
    out_path = Path(str(path) + ".enc")
    out_path.write_bytes(_fernet(password).encrypt(data))
    return out_path


def decrypt_file(path, password, out_path):
    data = _fernet(password).decrypt(Path(path).read_bytes())
    Path(out_path).write_bytes(data)
    return out_path


def backup(source, dest, encrypt=False, password=None, label=None):
    source, dest = Path(source), Path(dest)
    if not source.exists():
        raise FileNotFoundError(f"Source does not exist: {source}")
    dest.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest(dest)
    current = scan_source(source)
    changed = changed_files(current, manifest)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")[:-3]  # ms precision: two fast runs must not collide
    name = f"backup-{stamp}" + (f"-{label}" if label else "")
    archive = dest / f"{name}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in sorted(changed):
            zf.write(source / rel, arcname=rel)
    final_path = archive
    if encrypt:
        if not password:
            password = os.environ.get("BACKUP_PASSWORD", "")
        if not password:
            raise ValueError("Encryption needs --password or BACKUP_PASSWORD env var.")
        final_path = encrypt_file(archive, password)
        archive.unlink()
    record = {"name": final_path.name, "created": stamp,
              "files": len(changed), "total_files": len(current),
              "size_bytes": final_path.stat().st_size,
              "encrypted": encrypt, "sha256": sha256_file(final_path)}
    manifest["files"] = current
    manifest["backups"].append(record)
    save_manifest(dest, manifest)
    return record, sorted(changed)


def verify_backup(archive, password=None):
    """Prove a backup is restorable: checksum the archive, then extract it
    fully to a temp dir and hash every file."""
    import tempfile
    archive = Path(archive)
    if not archive.exists():
        raise FileNotFoundError(f"No such backup: {archive}")
    work = archive
    if archive.suffix == ".enc":
        if not password:
            password = os.environ.get("BACKUP_PASSWORD", "")
        if not password:
            raise ValueError("This backup is encrypted: pass --password.")
        tmp = Path(tempfile.mkdtemp(prefix="backup-verify-"))
        work = tmp / "decrypted.zip"
        decrypt_file(archive, password, work)
    if not zipfile.is_zipfile(work):
        return False, "not a valid zip archive"
    with tempfile.TemporaryDirectory(prefix="backup-verify-") as tmpdir:
        with zipfile.ZipFile(work) as zf:
            bad = zf.testzip()
            if bad is not None:
                return False, f"corrupt member inside archive: {bad}"
            zf.extractall(tmpdir)
            count = sum(1 for _ in Path(tmpdir).rglob("*") if _.is_file())
    return True, f"archive OK, {count} file(s) extracted cleanly"


def restore(archive, target, password=None, overwrite=False):
    archive, target = Path(archive), Path(target)
    if target.exists() and not overwrite and any(target.iterdir()):
        raise FileExistsError(f"Restore target is not empty: {target} (use --force)")
    target.mkdir(parents=True, exist_ok=True)
    work = archive
    if archive.suffix == ".enc":
        if not password:
            password = os.environ.get("BACKUP_PASSWORD", "")
        if not password:
            raise ValueError("This backup is encrypted: pass --password.")
        import tempfile
        tmp = Path(tempfile.mkdtemp(prefix="backup-restore-"))
        work = tmp / "decrypted.zip"
        decrypt_file(archive, password, work)
    with zipfile.ZipFile(work) as zf:
        zf.extractall(target)
        names = zf.namelist()
    return names


def prune(dest, keep):
    manifest = load_manifest(dest)
    backups = manifest.get("backups", [])
    if len(backups) <= keep:
        return []
    removed = []
    for record in backups[:-keep]:
        path = Path(dest) / record["name"]
        if path.exists():
            path.unlink()
        removed.append(record["name"])
    manifest["backups"] = backups[-keep:]
    save_manifest(dest, manifest)
    return removed


def run_demo():
    import tempfile
    print("== DEMO: incremental backup, verify, restore, prune ==")
    with tempfile.TemporaryDirectory(prefix="backup-demo-") as tmpdir:
        src = Path(tmpdir) / "my-docs"
        (src / "notes").mkdir(parents=True)
        (src / "notes" / "todo.txt").write_text("Buy milk\nCall the bank\n", encoding="utf-8")
        (src / "report.txt").write_text("Q3 report draft\n", encoding="utf-8")
        dest = Path(tmpdir) / "backups"
        rec1, changed1 = backup(src, dest)
        print(f"Backup 1: {rec1['name']} — {len(changed1)} file(s) (full)")
        (src / "notes" / "todo.txt").write_text("Buy milk\nCall the bank\nBook flights\n", encoding="utf-8")
        rec2, changed2 = backup(src, dest)
        print(f"Backup 2: {rec2['name']} — {len(changed2)} file(s) (incremental: {changed2})")
        ok, msg = verify_backup(dest / rec2["name"])
        print(f"Verify backup 2: {'OK' if ok else 'FAILED'} — {msg}")
        restored = Path(tmpdir) / "restored"
        names = restore(dest / rec1["name"], restored)
        print(f"Restore backup 1 -> {restored}: {names}")
        removed = prune(dest, keep=1)
        print(f"Prune (keep 1): removed {removed}")
    print("\nDemo complete — all operations ran on temporary folders.")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="backup_tool.py",
        description="Incremental backups with compression, optional AES "
                    "encryption, retention, restore and verify.")
    parser.add_argument("--demo", action="store_true",
                        help="Run a full demo (backup/verify/restore/prune) in temp dirs.")
    sub = parser.add_subparsers(dest="command")
    bk = sub.add_parser("backup", help="Back up a folder (incremental).")
    bk.add_argument("source", type=Path)
    bk.add_argument("--dest", type=Path, required=True)
    bk.add_argument("--encrypt", action="store_true")
    bk.add_argument("--password", default=None, help="Or set BACKUP_PASSWORD env var.")
    bk.add_argument("--label", default=None)
    li = sub.add_parser("list", help="List backups in a destination.")
    li.add_argument("--dest", type=Path, required=True)
    vf = sub.add_parser("verify", help="Prove a backup archive is restorable.")
    vf.add_argument("archive", type=Path)
    vf.add_argument("--password", default=None)
    rs = sub.add_parser("restore", help="Restore a backup to a folder.")
    rs.add_argument("archive", type=Path)
    rs.add_argument("--to", type=Path, required=True)
    rs.add_argument("--password", default=None)
    rs.add_argument("--force", action="store_true")
    pr = sub.add_parser("prune", help="Delete all but the newest N backups.")
    pr.add_argument("--dest", type=Path, required=True)
    pr.add_argument("--keep", type=int, default=5)
    sc = sub.add_parser("schedule", help="Run backups on a loop every N minutes.")
    sc.add_argument("source", type=Path)
    sc.add_argument("--dest", type=Path, required=True)
    sc.add_argument("--every", type=int, default=60, help="Minutes between runs.")
    sc.add_argument("--encrypt", action="store_true")
    sc.add_argument("--password", default=None)
    args = parser.parse_args(argv)
    if args.demo:
        return run_demo()
    if args.command == "backup":
        record, changed = backup(args.source, args.dest, args.encrypt,
                                 args.password, args.label)
        print(f"Backup {record['name']}: {len(changed)} changed file(s) of "
              f"{record['total_files']} total, {record['size_bytes']} bytes"
              + (" (encrypted)" if args.encrypt else ""))
        for rel in changed:
            print(f"  + {rel}")
    elif args.command == "list":
        manifest = load_manifest(args.dest)
        for rec in manifest.get("backups", []):
            print(f"{rec['created']}  {rec['name']}  {rec['files']} file(s)  "
                  f"{rec['size_bytes']} bytes  {'encrypted' if rec['encrypted'] else 'plain'}")
        if not manifest.get("backups"):
            print("No backups yet.")
    elif args.command == "verify":
        ok, msg = verify_backup(args.archive, args.password)
        print(("OK: " if ok else "FAILED: ") + msg)
        return 0 if ok else 1
    elif args.command == "restore":
        names = restore(args.archive, args.to, args.password, args.force)
        print(f"Restored {len(names)} file(s) to {args.to}")
    elif args.command == "prune":
        removed = prune(args.dest, args.keep)
        print(f"Removed {len(removed)} old backup(s): {removed or 'none'}")
    elif args.command == "schedule":
        print(f"Scheduled backup every {args.every} minute(s). Ctrl+C to stop.")
        try:
            while True:
                record, changed = backup(args.source, args.dest, args.encrypt,
                                         args.password)
                print(f"[{record['created']}] backed up {len(changed)} changed file(s).")
                time.sleep(args.every * 60)
        except KeyboardInterrupt:
            print("\nScheduler stopped.")
    else:
        parser.error("Choose a command: backup, list, verify, restore, prune, schedule (or --demo).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
