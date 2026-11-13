import os, sys
import pandas as pd
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from survey import load_and_clean, distribution, crosstab, likert_summary

BASE = os.path.join(os.path.dirname(__file__), "..")
SAMPLE = os.path.join(BASE, "assets", "survey_sample.csv")


def test_cleaning_removes_duplicate_bad_and_empty_rows():
    df, report = load_and_clean(SAMPLE)
    assert report["rows_in"] == 123
    assert report["duplicates_removed"] == 1
    assert report["empty_rows_removed"] == 1
    assert report["bad_likert_removed"] >= 1
    assert report["rows_out"] == 120
    assert df["satisfaction"].between(1, 5).all()


def test_distribution_sums_to_total():
    df, _ = load_and_clean(SAMPLE)
    dist = distribution(df, "department")
    assert sum(d["count"] for d in dist) == len(df)
    assert abs(sum(d["pct"] for d in dist) - 100) < 0.5


def test_likert_summary_bounds():
    df, _ = load_and_clean(SAMPLE)
    s = likert_summary(df, "satisfaction")
    assert 1 <= s["mean"] <= 5
    assert 0 <= s["promoters_pct"] <= 100


def test_crosstab_returns_interpretation():
    df, _ = load_and_clean(SAMPLE)
    result = crosstab(df, "department", "satisfaction")
    assert result["chi2"] is not None
    assert result["interpretation"] is not None
    assert "p=" in result["interpretation"] or "scipy" in result["interpretation"]
