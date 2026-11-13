import os, sys
import pandas as pd
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from rfm import compute_rfm, segment_name, summary

BASE = os.path.join(os.path.dirname(__file__), "..")


def _df():
    return pd.DataFrame([
        {"InvoiceNo": 1, "Quantity": 2, "UnitPrice": 10.0, "InvoiceDate": "2026-10-30", "CustomerID": 1},
        {"InvoiceNo": 2, "Quantity": 1, "UnitPrice": 50.0, "InvoiceDate": "2026-10-29", "CustomerID": 1},
        {"InvoiceNo": 3, "Quantity": 1, "UnitPrice": 5.0, "InvoiceDate": "2026-01-05", "CustomerID": 2},
    ])


def test_segment_name_rules():
    assert segment_name(5, 5, 5) == "Champions"
    assert segment_name(1, 1, 1) == "Lost"
    assert segment_name(2, 2, 2) == "At Risk"
    assert segment_name(5, 1, 1) == "New Customers"


def test_compute_rfm_recency_frequency_monetary():
    rfm = compute_rfm(_df())
    c1 = rfm[rfm["CustomerID"] == 1].iloc[0]
    assert c1["Recency"] == 0
    assert c1["Frequency"] == 2
    assert c1["Monetary"] == 70.0
    c2 = rfm[rfm["CustomerID"] == 2].iloc[0]
    assert c2["Recency"] > 200
    assert c2["Frequency"] == 1


def test_scores_bounded_1_to_5():
    rfm = compute_rfm(pd.read_csv(os.path.join(BASE, "assets", "transactions.csv")))
    assert rfm["R"].between(1, 5).all() and rfm["F"].between(1, 5).all() and rfm["M"].between(1, 5).all()
    assert len(summary(rfm)) >= 3
