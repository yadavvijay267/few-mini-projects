"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import os, tempfile, pytest
from datetime import datetime
from attendance import enrol, checkin, checkout, daily_report, recognise_face

def fresh_db():
    return os.path.join(tempfile.mkdtemp(), "test.db")

def test_enrol_checkin_checkout_report():
    db = fresh_db()
    eid = enrol(db, "Asha Verma", "A1B2C3D4")
    assert eid == 1
    name, msg = checkin(db, rfid="A1B2C3D4", when=datetime(2026, 11, 12, 9, 5))
    assert name == "Asha Verma" and "on time" in msg
    name, msg = checkout(db, rfid="A1B2C3D4", when=datetime(2026, 11, 12, 18, 5))
    assert "18:05" in msg
    rows = daily_report(db, "2026-11-12")
    assert rows[0]["status"] == "PRESENT"
    assert rows[0]["hours"] == pytest.approx(9.0)

def test_late_flag():
    db = fresh_db()
    enrol(db, "Rohit Kumar", "E5F6A7B8")
    checkin(db, rfid="E5F6A7B8", when=datetime(2026, 11, 12, 10, 15))
    rows = daily_report(db, "2026-11-12")
    assert rows[0]["status"] == "LATE"

def test_absent_when_no_record():
    db = fresh_db()
    enrol(db, "Meera Singh", "C9D0E1F2")
    assert daily_report(db, "2026-11-12")[0]["status"] == "ABSENT"

def test_double_checkin_rejected():
    db = fresh_db()
    enrol(db, "Arjun Patel", "11223344")
    checkin(db, rfid="11223344", when=datetime(2026, 11, 12, 9, 0))
    _, msg = checkin(db, rfid="11223344", when=datetime(2026, 11, 12, 9, 10))
    assert "already checked in" in msg

def test_unknown_card_rejected():
    db = fresh_db()
    with pytest.raises(ValueError):
        checkin(db, rfid="DEADBEEF", when=datetime(2026, 11, 12, 9, 0))

def test_face_recognition_is_honest_stub():
    with pytest.raises(NotImplementedError):
        recognise_face("photo.jpg")
