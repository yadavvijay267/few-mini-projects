"""Sales Analytics Dashboard — Streamlit app.

Run:  streamlit run src/app.py
"""
from pathlib import Path

import analysis

try:
    import streamlit as st
except ImportError:  # pragma: no cover
    raise SystemExit("streamlit is required for the dashboard: pip install -r requirements.txt")

DATA = Path(__file__).resolve().parent.parent / "assets" / "sales.csv"

st.set_page_config(page_title="Sales Analytics Dashboard", layout="wide")
st.title("Sales Analytics Dashboard")

df = analysis.load_sales_df(DATA)
if df is None:
    st.error("pandas is required for the dashboard. The CLI still works: python3 src/sales_dashboard.py --demo")
    st.stop()

dates = sorted(df["date"].dt.strftime("%Y-%m-%d").unique())
categories = ["All"] + sorted(df["category"].unique())
regions = ["All"] + sorted(df["region"].unique())

col1, col2, col3, col4 = st.columns(4)
with col1:
    start = st.selectbox("From", dates, index=0)
with col2:
    end = st.selectbox("To", dates, index=len(dates) - 1)
with col3:
    category = st.selectbox("Category", categories)
with col4:
    region = st.selectbox("Region", regions)

rows = analysis.load_sales(DATA)
rows = analysis.filter_sales(rows, start, end,
                             None if category == "All" else category,
                             None if region == "All" else region)
k = analysis.kpis(rows)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Revenue", f"${k['revenue']:,.2f}")
c2.metric("Orders", k["orders"])
c3.metric("Avg order value", f"${k['avg_order_value']:,.2f}")
c4.metric("Units sold", k["units"])

st.subheader("Revenue trend")
trend = analysis.revenue_by_day(rows)
st.line_chart({p["date"]: p["revenue"] for p in trend})

st.subheader("Top products")
st.bar_chart({p["product"]: p["revenue"] for p in analysis.top_products(rows, 10)})

c1, c2 = st.columns(2)
with c1:
    st.subheader("Revenue by region")
    st.bar_chart({r["region"]: r["revenue"] for r in analysis.revenue_by_region(rows)})
with c2:
    st.subheader("Revenue by category")
    st.bar_chart({r["category"]: r["revenue"] for r in analysis.revenue_by_category(rows)})

st.subheader("What changed — biggest movers vs previous period")
movers = analysis.what_changed(rows)
if movers:
    st.table(movers[:5])
else:
    st.write("Not enough data to compare periods.")

if st.button("Export filtered view to CSV"):
    import csv as _csv
    out = Path(__file__).resolve().parent.parent / "filtered_sales.csv"
    with open(out, "w", newline="", encoding="utf-8") as fh:
        writer = _csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    st.success(f"Exported {len(rows)} rows to {out}")
