"""Tests: training metrics are sane, predictions and alerts work."""
import json, os, subprocess, sys
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENV = os.path.join(os.path.expanduser("~"), "workspace", ".venv-test", "bin", "python")
PY = VENV if os.path.exists(VENV) else sys.executable

def run(*args):
    return subprocess.run([PY, *args], capture_output=True, text=True, cwd=BASE)

def test_training_metrics():
    r = run(os.path.join("src", "train.py"))
    assert r.returncode == 0, r.stderr
    m = json.load(open(os.path.join(BASE, "models", "metrics.json")))
    assert m["roc_auc"] > 0.7, m
    assert m["recall"] > 0.5, m
    assert abs(sum(m["feature_importance"].values()) - 1.0) < 0.01
    assert set(m["feature_importance"]) == {"vibration", "temperature", "runtime_hours", "load", "cycles_since_service"}

def test_predict_high_risk():
    r = run(os.path.join("src", "predict.py"), "--vibration", "6.0", "--temperature", "95",
            "--runtime", "2000", "--load", "0.95", "--cycles", "900")
    assert r.returncode == 0, r.stderr
    out = json.loads(r.stdout)
    assert out["failure_probability"] > 0.5
    assert out["alert"] in ("HIGH", "WATCH")

def test_predict_low_risk():
    r = run(os.path.join("src", "predict.py"), "--vibration", "1.0", "--temperature", "60",
            "--runtime", "100", "--load", "0.5", "--cycles", "50")
    assert r.returncode == 0, r.stderr
    assert json.loads(r.stdout)["failure_probability"] < 0.5

def test_alerts_ranked():
    r = run(os.path.join("src", "predict.py"), "--alerts", "--top", "5")
    assert r.returncode == 0, r.stderr
    rows = json.loads(r.stdout)
    assert len(rows) == 5
    probs = [x["failure_probability"] for x in rows]
    assert probs == sorted(probs, reverse=True)

def test_help_exits_zero():
    for s in ("train.py", "predict.py"):
        assert run(os.path.join("src", s), "--help").returncode == 0
