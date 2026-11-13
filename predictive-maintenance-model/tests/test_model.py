import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from model import load_history, train, rul, failure_probability, alerts, feature_importance

DATA = os.path.join(os.path.dirname(__file__), "..", "assets", "sensor_history.csv")


def _model():
    return train(load_history(DATA))


def test_worst_machine_has_shortest_rul():
    model = _model()
    assert rul(model, "M-103") < rul(model, "M-101") < rul(model, "M-102")


def test_alerts_ranked_by_probability_descending():
    rows = alerts(_model())
    probs = [a["failure_probability"] for a in rows]
    assert probs == sorted(probs, reverse=True)
    assert rows[0]["machine"] == "M-103"


def test_probability_in_range():
    model = _model()
    for m in model:
        assert 0.0 <= failure_probability(model, m) <= 1.0


def test_feature_importance_covers_all_sensors():
    rows = load_history(DATA)
    imp = feature_importance(rows)
    assert set(imp) == {"vibration", "temperature", "runtime_h"}
    assert all(-1.0 <= v <= 1.0 for v in imp.values())
