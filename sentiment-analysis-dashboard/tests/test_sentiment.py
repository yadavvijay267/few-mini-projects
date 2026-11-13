import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from sentiment import SentimentModel, analyse, aspect_of

BASE = os.path.join(os.path.dirname(__file__), "..")
MODEL = SentimentModel(os.path.join(BASE, "assets", "reviews_labeled.csv"))


def test_positive_text_is_positive():
    label, conf = MODEL.predict(["I love this product, excellent quality and great value"])[0]
    assert label == "positive"
    assert conf > 0.5


def test_negative_text_is_negative():
    label, _ = MODEL.predict(["Terrible quality, broke in a week, total waste of money"])[0]
    assert label == "negative"


def test_aspect_detection():
    assert "price" in aspect_of("The price is far too high for what you get")
    assert "delivery" in aspect_of("Delivery was very slow and late")


def test_analyse_returns_distribution_and_aspects():
    rows = [{"date": "2026-10-01", "text": "Great quality, fast delivery, love it"},
            {"date": "2026-10-02", "text": "Terrible quality, broke immediately"}]
    summary = analyse(MODEL, rows)
    assert sum(summary["distribution"].values()) == 2
    assert "quality" in summary["aspects"]
    assert all(r["sentiment"] in ("positive", "neutral", "negative") for r in rows)


def test_evaluate_returns_accuracy_in_range():
    acc = MODEL.evaluate()
    assert acc is None or 0.5 <= acc <= 1.0
