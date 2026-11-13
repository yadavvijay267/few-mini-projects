import os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from pipeline import EventGenerator, StreamProcessor, validate, window_start


def test_window_start_floors_to_minute():
    assert window_start(125) == 120
    assert window_start(60) == 60


def test_validate_rejects_bad_events():
    assert validate({"event_id": 1}) is not None
    assert validate({"event_id": 1, "ts": 0, "type": "explode", "page": "/"}) is not None
    assert validate({"event_id": 1, "ts": 0, "type": "order", "page": "/", "amount": -5}) is not None
    assert validate({"event_id": 1, "ts": 0, "type": "click", "page": "/"}) is None


def test_processor_counts_and_revenue():
    proc = StreamProcessor()
    now = 1_700_000_000
    proc.process({"event_id": 1, "ts": now, "type": "page_view", "page": "/"}, now=now)
    proc.process({"event_id": 2, "ts": now, "type": "order", "page": "/checkout", "amount": 42.5}, now=now)
    snap = proc.snapshot(now=now)
    assert len(snap["windows"]) == 1
    w = snap["windows"][0]
    assert w["events"] == 2 and w["orders"] == 1 and w["revenue"] == 42.5
    assert w["top_page"] in ("/", "/checkout")


def test_late_event_is_logged_not_counted():
    proc = StreamProcessor()
    now = 1_700_000_000
    old = now - 600  # 10 minutes old: window long closed
    assert proc.process({"event_id": 9, "ts": old, "type": "click", "page": "/"}, now=now) == "late"
    assert proc.snapshot(now=now)["late_events"] == 1
    assert proc.snapshot(now=now)["windows"] == []


def test_generator_produces_valid_events():
    gen = EventGenerator(seed=1)
    for _ in range(50):
        event = gen.next_event(now=1_700_000_000)
        assert validate(event) is None
