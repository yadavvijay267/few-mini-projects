#!/usr/bin/env python3
"""Tests: backup/restore round-trip, checksum tamper detection, full drill.
Run: python3 tests/test_dr.py
"""
import os, sqlite3, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import backup as bk, restore as rs, drill
def main():
    errors = []
    with tempfile.TemporaryDirectory() as wd:
        db = os.path.join(wd, "app.db")
        drill.seed(db, 20)
        m = bk.backup(db, os.path.join(wd, "backups"))
        if m["rows"] != 20: errors.append(f"backup row count {m['rows']} != 20")
        if m["bytes"] <= 0: errors.append("backup is empty")
        dest = os.path.join(wd, "restored", "app.db")
        if not rs.restore(os.path.join(wd, "backups", "latest"), dest): errors.append("restore failed")
        with sqlite3.connect(dest) as c:
            if c.execute("SELECT COUNT(*) FROM users").fetchone()[0] != 20: errors.append("restored row count wrong")
        # tamper detection: flip a byte in the backup copy and expect failure
        bf = os.path.join(wd, "backups", m["name"])
        with open(bf, "r+b") as f: f.seek(10); f.write(b"\x00")
        if rs.restore(os.path.join(wd, "backups", "latest"), os.path.join(wd, "restored2", "app.db")):
            errors.append("tampered backup was NOT rejected")
        # full drill
        result = drill.drill(os.path.join(wd, "drill"))
        if result["verdict"] != "PASS" or result["rows_restored"] != 50:
            errors.append(f"drill failed: {result}")
        if result["rto_seconds"] > 60: errors.append(f"RTO too high: {result['rto_seconds']}s")
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print("PASS: backup/restore/drill all verified"); return 0
if __name__ == "__main__": sys.exit(main())
