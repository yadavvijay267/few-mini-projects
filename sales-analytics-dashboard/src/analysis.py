"""Sales analysis — pure functions over a sales CSV.

The same functions power the Streamlit dashboard (app.py) and the CLI
(sales_dashboard.py), so both always agree. Works with pandas when it is
installed; falls back to the standard-library csv module otherwise.
"""
import csv
from collections import defaultdict
from datetime import date

COLUMNS = ["date", "order_id", "product", "category", "region",
           "quantity", "unit_price"]


def _rows_from_csv(path):
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            row["quantity"] = int(row["quantity"])
            row["unit_price"] = float(row["unit_price"])
            row["revenue"] = row["quantity"] * row["unit_price"]
            yield row


def load_sales(path):
    """Return a list of row dicts (stdlib path — always available)."""
    return list(_rows_from_csv(path))


def load_sales_df(path):
    """Return a pandas DataFrame with a revenue column, or None if pandas
    is not installed."""
    try:
        import pandas as pd
    except ImportError:
        return None
    df = pd.read_csv(path, parse_dates=["date"])
    df["revenue"] = df["quantity"] * df["unit_price"]
    return df


def filter_sales(rows, start=None, end=None, category=None, region=None):
    out = []
    for row in rows:
        if start and row["date"] < start:
            continue
        if end and row["date"] > end:
            continue
        if category and row["category"] != category:
            continue
        if region and row["region"] != region:
            continue
        out.append(row)
    return out


def kpis(rows):
    """Revenue, orders, average order value, unique products, growth helper."""
    revenue = sum(r["revenue"] for r in rows)
    orders = len({r["order_id"] for r in rows})
    return {
        "revenue": round(revenue, 2),
        "orders": orders,
        "avg_order_value": round(revenue / orders, 2) if orders else 0.0,
        "units": sum(r["quantity"] for r in rows),
        "products": len({r["product"] for r in rows}),
    }


def revenue_by_day(rows):
    totals = defaultdict(float)
    for row in rows:
        totals[row["date"]] += row["revenue"]
    return [{"date": d, "revenue": round(v, 2)} for d, v in sorted(totals.items())]


def top_products(rows, n=10):
    totals = defaultdict(float)
    for row in rows:
        totals[row["product"]] += row["revenue"]
    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:n]
    return [{"product": p, "revenue": round(v, 2)} for p, v in ranked]


def revenue_by_region(rows):
    totals = defaultdict(float)
    for row in rows:
        totals[row["region"]] += row["revenue"]
    return [{"region": r, "revenue": round(v, 2)}
            for r, v in sorted(totals.items(), key=lambda kv: kv[1], reverse=True)]


def revenue_by_category(rows):
    totals = defaultdict(float)
    for row in rows:
        totals[row["category"]] += row["revenue"]
    return [{"category": c, "revenue": round(v, 2)}
            for c, v in sorted(totals.items(), key=lambda kv: kv[1], reverse=True)]


def split_periods(rows):
    """Split rows into two halves by date so 'what changed' can compare them."""
    dates = sorted({r["date"] for r in rows})
    if len(dates) < 2:
        return rows, []
    mid = dates[len(dates) // 2]
    return ([r for r in rows if r["date"] < mid],
            [r for r in rows if r["date"] >= mid])


def what_changed(rows):
    """Stand-out feature: the biggest movers vs the previous period.

    Compares product revenue in the second half of the date range with the
    first half and ranks products by absolute change.
    """
    first, second = split_periods(rows)
    if not second:
        return []
    rev_first, rev_second = defaultdict(float), defaultdict(float)
    for r in first:
        rev_first[r["product"]] += r["revenue"]
    for r in second:
        rev_second[r["product"]] += r["revenue"]
    movers = []
    for product in set(rev_first) | set(rev_second):
        old, new = rev_first[product], rev_second[product]
        change = new - old
        pct = (change / old * 100) if old else (100.0 if new else 0.0)
        movers.append({"product": product, "previous": round(old, 2),
                       "current": round(new, 2), "change": round(change, 2),
                       "change_pct": round(pct, 1)})
    movers.sort(key=lambda m: abs(m["change"]), reverse=True)
    return movers
