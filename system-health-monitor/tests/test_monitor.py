"""Tests for monitor.py — uses the real machine, no mocks of psutil itself."""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import monitor as mon


def test_snapshot_has_all_metrics():
    snap = mon.snapshot()
    for key in ("timestamp", "cpu_percent", "memory_percent", "disk_percent",
                "memory_used_gb", "disk_total_gb", "net_sent_mb", "net_recv_mb"):
        assert key in snap
    assert 0 <= snap["cpu_percent"] <= 100
    assert 0 <= snap["memory_percent"] <= 100
    assert 0 <= snap["disk_percent"] <= 100


def test_check_thresholds_flags_breaches():
    snap = {"cpu_percent": 95, "memory_percent": 40, "disk_percent": 99}
    breaches = mon.check_thresholds(snap, mon.DEFAULT_THRESHOLDS)
    metrics = [m for m, _, _ in breaches]
    assert "cpu_percent" in metrics
    assert "disk_percent" in metrics
    assert "memory_percent" not in metrics


def test_check_thresholds_quiet_when_healthy():
    snap = {"cpu_percent": 5, "memory_percent": 10, "disk_percent": 20}
    assert mon.check_thresholds(snap, mon.DEFAULT_THRESHOLDS) == []


def test_log_snapshot_writes_csv(tmp_path):
    log = tmp_path / "health.csv"
    mon.log_snapshot(log, mon.snapshot())
    mon.log_snapshot(log, mon.snapshot())
    with open(log, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 2
    assert "cpu_percent" in rows[0]


def test_top_processes_returns_rows():
    top = mon.top_processes(3)
    assert 1 <= len(top) <= 3
    assert "pid" in top[0] and "name" in top[0]


def test_format_snapshot_is_readable():
    text = mon.format_snapshot(mon.snapshot())
    assert "CPU" in text and "Memory" in text and "Disk" in text
