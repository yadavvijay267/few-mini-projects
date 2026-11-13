"""Tests for the sales analysis module — computed from the sample CSV."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import analysis

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "assets" / "sales.csv"


def test_load_sales_and_kpis():
    rows = analysis.load_sales(DATA)
    assert len(rows) > 50
    k = analysis.kpis(rows)
    assert k["revenue"] == round(sum(r["revenue"] for r in rows), 2)
    assert k["orders"] == len({r["order_id"] for r in rows})
    assert k["avg_order_value"] > 0


def test_filter_by_category_and_date():
    rows = analysis.load_sales(DATA)
    elec = analysis.filter_sales(rows, category="Electronics")
    assert elec and all(r["category"] == "Electronics" for r in elec)
    assert len(elec) < len(rows)
    sept = analysis.filter_sales(rows, start="2026-09-01", end="2026-09-30")
    assert sept and all("2026-09-01" <= r["date"] <= "2026-09-30" for r in sept)


def test_top_products_ranked():
    rows = analysis.load_sales(DATA)
    top = analysis.top_products(rows, 5)
    assert len(top) == 5
    revenues = [t["revenue"] for t in top]
    assert revenues == sorted(revenues, reverse=True)


def test_revenue_by_day_sums_to_total():
    rows = analysis.load_sales(DATA)
    total = sum(p["revenue"] for p in analysis.revenue_by_day(rows))
    assert abs(total - analysis.kpis(rows)["revenue"]) < 0.01


def test_what_changed_ranks_movers():
    rows = analysis.load_sales(DATA)
    movers = analysis.what_changed(rows)
    assert movers
    changes = [abs(m["change"]) for m in movers]
    assert changes == sorted(changes, reverse=True)
    assert all("change_pct" in m for m in movers)
