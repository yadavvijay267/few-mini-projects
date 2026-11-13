import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from classifier import train, predict, accuracy, confusion_matrix, load_csv, extract_features

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")


def _model():
    return train(load_csv(os.path.join(ASSETS, "sample_features.csv")))


def test_accuracy_is_high_on_train_set():
    rows = load_csv(os.path.join(ASSETS, "sample_features.csv"))
    assert accuracy(_model(), rows) == 1.0


def test_predict_returns_top3_with_confidences_summing_to_one():
    model = _model()
    rows = load_csv(os.path.join(ASSETS, "sample_features.csv"))
    preds = predict(model, rows[0][1])
    assert len(preds) == 3
    assert preds[0][0] == "good"
    assert abs(sum(c for _, c in preds) - 1.0) < 1e-6


def test_confusion_matrix_counts_all_rows():
    rows = load_csv(os.path.join(ASSETS, "sample_features.csv"))
    matrix = confusion_matrix(_model(), rows)
    assert sum(sum(r.values()) for r in matrix.values()) == len(rows)


def test_ppm_features_have_12_values_in_range():
    feats = extract_features(os.path.join(ASSETS, "sample.ppm"))
    assert len(feats) == 12
    assert all(0.0 <= v <= 1.0 for v in feats)
