#!/usr/bin/env python3
"""Full DR drill (local, safe): seed a database -> backup -> simulate disaster
(delete the database) -> restore to a fresh directory -> verify row-for-row.
Measures RTO (time from disaster to restored+verified) and RPO (data lost =
rows written after the last backup). Run: python3 src/drill.py --demo
"""
import argparse, os, shutil, sqlite3, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backup import backup
from restore import restore
def seed(db, n=50):
    os.makedirs(os.path.dirname(db), exist_ok=True)
    with sqlite3.connect(db) as c:
        c.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)")
        c.executemany("INSERT INTO users (name, email) VALUES (?, ?)",
                      [(f"User {i}", f"user{i}@example.local") for i in range(n)])
def count(db):
    with sqlite3.connect(db) as c: return c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
def drill(workdir):
    db = os.path.join(workdir, "app.db"); backups = os.path.join(workdir, "backups")
    seed(db, 50)
    t0 = time.monotonic()
    manifest = backup(db, backups)
    # writes AFTER the backup = the RPO window (data that would be lost)
    with sqlite3.connect(db) as c:
        c.executemany("INSERT INTO users (name, email) VALUES (?, ?)",
                      [(f"Late {i}", f"late{i}@example.local") for i in range(5)])
    lost_rows = 5
    # DISASTER: the database is gone
    os.remove(db)
    assert not os.path.exists(db)
    t_disaster = time.monotonic()
    restored = restore(os.path.join(backups, "latest"), os.path.join(workdir, "restored", "app.db"))
    assert restored and count(restored) == manifest["rows"]
    rto = time.monotonic() - t_disaster
    total = time.monotonic() - t0
    result = {"rto_seconds": round(rto, 3), "rpo_lost_rows": lost_rows,
              "rows_before": manifest["rows"], "rows_restored": count(restored),
              "total_drill_seconds": round(total, 3), "verdict": "PASS"}
    print(f"DRILL {result['verdict']}: RTO={result['rto_seconds']}s, RPO={lost_rows} rows lost, "
          f"{result['rows_restored']}/{result['rows_before']} rows restored")
    return result
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--demo", action="store_true"); ap.add_argument("--workdir", default=None)
    a = ap.parse_args()
    wd = a.workdir or tempfile.mkdtemp(prefix="dr-lab-")
    print(f"workdir: {wd}")
    drill(wd)
