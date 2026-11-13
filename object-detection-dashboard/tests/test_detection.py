"""Tests: detector counts known objects in the synthetic scenes."""
import json, os, subprocess, sys
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENV = os.path.join(os.path.expanduser("~"), "workspace", ".venv-test", "bin", "python")
PY = VENV if os.path.exists(VENV) else sys.executable

def run(*args):
    return subprocess.run([PY, *args], capture_output=True, text=True, cwd=BASE)

def setup_module():
    assert run(os.path.join("src", "generate_samples.py")).returncode == 0

def detect(scene, *extra):
    out = os.path.join(BASE, "assets", "detections")
    r = run(os.path.join("src", "detect.py"), "--image", os.path.join(BASE, "assets", "samples", scene),
            "--out", out, *extra)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)

def test_rack_scene_counts():
    res = detect("rack_scene.png")
    assert res["counts"] == {"server": 3, "switch": 2, "cable": 1}, res["counts"]
    assert res["total"] == 6
    assert os.path.exists(os.path.join(BASE, "assets", "detections", "rack_scene_annotated.png"))

def test_floor_scene_counts():
    res = detect("floor_scene.png")
    assert res["counts"] == {"server": 2, "switch": 1, "cable": 2}, res["counts"]

def test_zone_counting():
    res = detect("rack_scene.png", "--zone", "0,0,120,80")
    # only the top-left server falls inside this zone
    assert res["total"] == 1 and res["counts"] == {"server": 1}, res

def test_min_area_filters_small():
    res = detect("rack_scene.png", "--min-area", "100000")
    assert res["total"] == 0

def test_detection_log_written():
    detect("empty_rack.png")
    log = os.path.join(BASE, "assets", "detections", "detection_log.csv")
    assert os.path.exists(log) and "empty_rack" in open(log).read()

def test_help_exits_zero():
    assert run(os.path.join("src", "detect.py"), "--help").returncode == 0
