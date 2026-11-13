#!/usr/bin/env python3
"""Sales Analytics Dashboard — CLI.

Prints the same KPIs, trends and 'what changed' panel as the Streamlit app
(src/app.py), from the same analysis module. Run the dashboard with:

    streamlit run src/app.py

Usage:
    python3 src/sales_dashboard.py --demo
    python3 src/sales_dashboard.py --data assets/sales.csv
    python3 src/sales_dashboard.py --data assets/sales.csv --category Electronics
    python3 src/sales_dashboard.py --data assets/sales.csv --from 2026-09-01 --to 2026-09-30
    python3 src/sales_dashboard.py --data assets/sales.csv --export filtered.csv
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import analysis


def _money(value):
    return f"${value:,.2f}"


def report(rows, label=""):
    k = analysis.kpis(rows)
    print(f"== Sales report {label} ==")
    print(f"  Revenue:           {_money(k['revenue'])}")
    print(f"  Orders:            {k['orders']}")
    print(f"  Avg order value:   {_money(k['avg_order_value'])}")
    print(f"  Units sold:        {k['units']}")
    print(f"  Products:          {k['products']}")
    print("\nTop products:")
    for i, item in enumerate(analysis.top_products(rows, 5), 1):
        print(f"  {i}. {item['product']:<28} {_money(item['revenue'])}")
    print("\nRevenue by region:")
    for item in analysis.revenue_by_region(rows):
        print(f"  {item['region']:<12} {_money(item['revenue'])}")
    print("\nRevenue by category:")
    for item in analysis.revenue_by_category(rows):
        print(f"  {item['category']:<12} {_money(item['revenue'])}")
    print("\nRevenue trend (first 10 days):")
    for point in analysis.revenue_by_day(rows)[:10]:
        print(f"  {point['date']}  {_money(point['revenue'])}")
    movers = analysis.what_changed(rows)
    print("\nWhat changed (biggest movers vs previous period):")
    if not movers:
        print("  Not enough data to compare periods.")
    for m in movers[:5]:
        arrow = "▲" if m["change"] >= 0 else "▼"
        print(f"  {arrow} {m['product']:<28} {_money(m['previous'])} -> "
              f"{_money(m['current'])}  ({m['change_pct']:+.1f}%)")
    return k


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="sales_dashboard.py",
        description="Sales analytics CLI — KPIs, top products, regions and "
                    "a 'what changed' panel. Same numbers as the Streamlit app.")
    parser.add_argument("--demo", action="store_true",
                        help="Run the report on the bundled sample dataset.")
    parser.add_argument("--data", type=Path, default=None, help="Sales CSV file.")
    parser.add_argument("--from", dest="start", default=None, help="Start date YYYY-MM-DD.")
    parser.add_argument("--to", dest="end", default=None, help="End date YYYY-MM-DD.")
    parser.add_argument("--category", default=None)
    parser.add_argument("--region", default=None)
    parser.add_argument("--export", type=Path, default=None,
                        help="Write the filtered rows to this CSV.")
    args = parser.parse_args(argv)
    base = Path(__file__).resolve().parent.parent
    data = args.data or (base / "assets" / "sales.csv")
    if not data.exists():
        print(f"Data file not found: {data}", file=sys.stderr)
        return 2
    rows = analysis.load_sales(data)
    rows = analysis.filter_sales(rows, args.start, args.end, args.category, args.region)
    if not rows:
        print("No rows match those filters.", file=sys.stderr)
        return 1
    report(rows, f"({data.name})")
    if args.export:
        with open(args.export, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        print(f"\nExported {len(rows)} row(s) -> {args.export}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
