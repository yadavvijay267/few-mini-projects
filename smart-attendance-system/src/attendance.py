#!/usr/bin/env python3
"""Smart attendance system — RFID/manual check-in with SQLite, face-recognition integration point."""
import argparse, os, sqlite3, sys
from datetime import datetime, time as dtime

LATE_AFTER = dtime(9, 30)
DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "attendance.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, rfid_uid TEXT UNIQUE, face_enrolled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL,
  date TEXT NOT NULL, in_time TEXT, out_time TEXT, method TEXT,
  UNIQUE(employee_id, date));
"""

def connect(db):
    c = sqlite3.connect(db)
    c.executescript(SCHEMA)
    return c

def enrol(db, name, rfid=None):
    c = connect(db)
    cur = c.execute("INSERT INTO employees (name, rfid_uid) VALUES (?, ?)", (name, rfid))
    c.commit(); eid = cur.lastrowid; c.close()
    return eid

def find_employee(db, rfid=None, name=None):
    c = connect(db)
    row = c.execute("SELECT id, name FROM employees WHERE rfid_uid = ? OR name = ?",
                    (rfid, name)).fetchone()
    c.close()
    return row

def checkin(db, rfid=None, name=None, method="rfid", when=None):
    emp = find_employee(db, rfid, name)
    if not emp:
        raise ValueError("unknown employee (enrol first)")
    when = when or datetime.now()
    c = connect(db)
    today = when.date().isoformat()
    row = c.execute("SELECT in_time FROM attendance WHERE employee_id=? AND date=?",
                    (emp[0], today)).fetchone()
    if row and row[0]:
        c.close(); return emp[1], "already checked in at " + row[0]
    c.execute("INSERT INTO attendance (employee_id, date, in_time, method) VALUES (?,?,?,?) "
              "ON CONFLICT(employee_id, date) DO UPDATE SET in_time=excluded.in_time, method=excluded.method",
              (emp[0], today, when.strftime("%H:%M"), method))
    c.commit(); c.close()
    late = when.time() > LATE_AFTER
    return emp[1], ("LATE" if late else "on time") + " — in at " + when.strftime("%H:%M")

def checkout(db, rfid=None, name=None, when=None):
    emp = find_employee(db, rfid, name)
    if not emp:
        raise ValueError("unknown employee (enrol first)")
    when = when or datetime.now()
    c = connect(db)
    today = when.date().isoformat()
    c.execute("UPDATE attendance SET out_time=? WHERE employee_id=? AND date=?",
              (when.strftime("%H:%M"), emp[0], today))
    c.commit(); c.close()
    return emp[1], "out at " + when.strftime("%H:%M")

def daily_report(db, date_str):
    c = connect(db)
    emps = c.execute("SELECT id, name FROM employees ORDER BY name").fetchall()
    rows = []
    for eid, name in emps:
        r = c.execute("SELECT in_time, out_time, method FROM attendance WHERE employee_id=? AND date=?",
                      (eid, date_str)).fetchone()
        if not r:
            rows.append({"name": name, "status": "ABSENT", "in": "-", "out": "-", "hours": 0.0})
        else:
            in_t, out_t, method = r
            hours = 0.0
            if in_t and out_t:
                h1, m1 = map(int, in_t.split(":")); h2, m2 = map(int, out_t.split(":"))
                hours = round((h2 * 60 + m2 - h1 * 60 - m1) / 60, 2)
            late = in_t and in_t > "09:30"
            rows.append({"name": name, "status": "LATE" if late else "PRESENT",
                         "in": in_t or "-", "out": out_t or "-", "hours": hours, "method": method})
    c.close()
    return rows

def recognise_face(image_path):
    """Integration point for real face recognition.

    Requires a camera + the `face_recognition` (dlib) package:
        pip install face_recognition
    then compare the 128-d embedding of `image_path` against stored
    embeddings. NOT bundled: the native stack is ~500 MB and needs a
    camera, so this demo ships the full RFID/manual flow instead.
    """
    raise NotImplementedError(
        "Face recognition needs a camera + the face_recognition (dlib) package. "
        "Install it and implement the embedding comparison here; RFID/manual check-in works without it.")

def delete_face_data(db, employee_id):
    c = connect(db)
    c.execute("UPDATE employees SET face_enrolled=0 WHERE id=?", (employee_id,))
    c.commit(); c.close()

def main(argv=None):
    ap = argparse.ArgumentParser(description="Smart attendance system: enrol, RFID/manual check-in/out, daily report. Face recognition is a documented integration point (see README).")
    ap.add_argument("--db", default=DB_DEFAULT, help="SQLite database path")
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("enrol"); e.add_argument("--name", required=True); e.add_argument("--rfid")
    ci = sub.add_parser("checkin"); ci.add_argument("--rfid"); ci.add_argument("--name"); ci.add_argument("--method", default="rfid")
    co = sub.add_parser("checkout"); co.add_argument("--rfid"); co.add_argument("--name")
    r = sub.add_parser("report"); r.add_argument("--date", default=datetime.now().date().isoformat())
    d = sub.add_parser("delete-face"); d.add_argument("--id", type=int, required=True)
    a = ap.parse_args(argv)
    if a.cmd == "enrol":
        print(f"Enrolled {a.name} as employee #{enrol(a.db, a.name, a.rfid)} (RFID {a.rfid or '—'})")
    elif a.cmd == "checkin":
        name, msg = checkin(a.db, a.rfid, a.name, method=a.method)
        print(f"{name}: {msg}")
    elif a.cmd == "checkout":
        name, msg = checkout(a.db, a.rfid, a.name)
        print(f"{name}: {msg}")
    elif a.cmd == "report":
        rows = daily_report(a.db, a.date)
        print(f"Daily report {a.date}")
        for row in rows:
            print(f"  {row['name']:<15} {row['status']:<7} in {row['in']:>5} out {row['out']:>5} hours {row['hours']:.2f}")
    elif a.cmd == "delete-face":
        delete_face_data(a.db, a.id)
        print(f"Face data deleted for employee #{a.id} (local embeddings only; RFID still works)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
