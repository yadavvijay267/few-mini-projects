import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from detector import detect, count_by_zone

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")
IMG = os.path.join(ASSETS, "sample.ppm")


def test_detect_finds_two_blobs():
    dets = detect(IMG, threshold=0.5)
    assert len(dets) == 2


def test_detections_have_boxes_and_confidence():
    for d in detect(IMG):
        assert d["w"] > 0 and d["h"] > 0 and d["area"] >= 4
        assert 0.0 < d["confidence"] <= 1.0


def test_higher_threshold_finds_fewer_or_equal():
    assert len(detect(IMG, threshold=0.9)) <= len(detect(IMG, threshold=0.5))


def test_count_by_zone():
    dets = detect(IMG)
    assert count_by_zone(dets, {"x": 0, "y": 0, "w": 100, "h": 100}) == len(dets)
    assert count_by_zone(dets, {"x": 0, "y": 0, "w": 1, "h": 1}) == 0
