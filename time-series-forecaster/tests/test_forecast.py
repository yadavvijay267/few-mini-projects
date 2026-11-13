import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from forecast import load_series, fit, forecast, backtest, anomalies

DATA = os.path.join(os.path.dirname(__file__), "..", "assets", "load.csv")


def test_seasonality_detected_as_weekly():
    assert fit(load_series(DATA))["season"] == 7


def test_forecast_length_and_bands():
    out = forecast(load_series(DATA), 7)
    assert len(out) == 7
    for row in out:
        assert row["lower"] <= row["forecast"] <= row["upper"]
        assert row["date"] > "2026-10-12"


def test_backtest_reports_mae_and_mape():
    res = backtest(load_series(DATA), 14)
    assert res["mae"] >= 0 and res["mape_pct"] >= 0
    assert res["mape_pct"] < 10  # weekly pattern is strong in the sample


def test_anomalies_are_subset_of_series():
    series = load_series(DATA)
    dates = {d.isoformat() for d, _ in series}
    assert all(a["date"] in dates for a in anomalies(series))
