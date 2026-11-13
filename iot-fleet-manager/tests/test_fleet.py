"""Tests — run with: python3 -m pytest tests/ -v"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import os, random, tempfile, pytest
from fleet import (provision, simulate_telemetry, firmware_rollout,
                   offline_devices, send_command, load, save)

def fresh():
    return os.path.join(tempfile.mkdtemp(), "fleet.json")

def seeded_state(n=10):
    st = {"devices": [], "audit": [], "campaigns": []}
    for i in range(n):
        provision(st, f"sensor-{i:02d}", "warehouse")
    return st

def test_provision_unique_names_and_keys():
    st = seeded_state(3)
    assert len({d["provisioning_key"] for d in st["devices"]}) == 3
    with pytest.raises(ValueError):
        provision(st, "sensor-00", "warehouse")

def test_staged_rollout_10_percent():
    st = seeded_state(10)
    r = firmware_rollout(st, "2.4.0", 10, rng=random.Random(0))
    assert len(r["updated"]) == 1  # 10% of 10
    assert sum(1 for d in st["devices"] if d["firmware"] == "2.4.0") == 1

def test_rollout_100_updates_all():
    st = seeded_state(5)
    r = firmware_rollout(st, "2.4.0", 100, rng=random.Random(0))
    assert len(r["updated"]) == 5
    assert all(d["firmware"] == "2.4.0" for d in st["devices"])

def test_failure_rolls_back_and_pauses():
    st = seeded_state(5)
    class FailFirst:
        def random(self): return 0.01  # always "fail"
    r = firmware_rollout(st, "2.4.0", 100, rng=FailFirst())
    assert r["failed"] == ["sensor-00"]
    assert r["rolled_back"] == ["sensor-00"]
    assert st["devices"][0]["firmware"] == "2.3.1"  # rolled back
    assert len(r["updated"]) == 0  # campaign paused at first failure

def test_offline_detection():
    from datetime import datetime, timedelta, timezone
    st = seeded_state(2)
    st["devices"][0]["last_seen"] = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    off = offline_devices(st)
    assert len(off) == 1 and off[0]["name"] == "sensor-00"

def test_command_and_audit():
    st = seeded_state(2)
    assert "reboot sent to sensor-00" in send_command(st, "sensor-00", "reboot")
    with pytest.raises(ValueError):
        send_command(st, "sensor-00", "self-destruct")
    with pytest.raises(ValueError):
        send_command(st, "nope", "reboot")
    assert any(e["action"] == "command" for e in st["audit"])

def test_save_load_roundtrip():
    p = fresh()
    st = seeded_state(2)
    save(p, st)
    assert len(load(p)["devices"]) == 2
