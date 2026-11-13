"""Financial Portfolio Tracker — Streamlit app.

Run:  streamlit run src/app.py
"""
from datetime import date
from pathlib import Path

import portfolio

try:
    import streamlit as st
except ImportError:  # pragma: no cover
    raise SystemExit("streamlit is required for the dashboard: pip install -r requirements.txt")

BASE = Path(__file__).resolve().parent.parent

st.set_page_config(page_title="Portfolio Tracker", layout="wide")
st.title("Financial Portfolio Tracker")

live = st.checkbox("Try live prices (yfinance, NSE)", value=False)
threshold = st.slider("Price alert threshold (%)", 1, 20, 5)

holdings = portfolio.load_holdings(BASE / "assets" / "holdings.csv")
dividends = portfolio.load_dividends(BASE / "assets" / "dividends.csv")
prices = portfolio.get_prices(holdings, BASE / "assets" / "sample_prices.csv", live=live)
summary = portfolio.portfolio_summary(holdings, prices)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Current value", f"₹{summary['current_value']:,.2f}")
c2.metric("Invested", f"₹{summary['invested']:,.2f}")
c3.metric("Total P/L", f"₹{summary['pnl']:,.2f}", f"{summary['pnl_pct']}%")
rate = portfolio.portfolio_xirr(holdings, prices, as_of=date(2026, 11, 12))
c4.metric("XIRR", f"{rate * 100:.2f}%" if rate is not None else "n/a")

st.subheader("Holdings")
st.table(summary["holdings"])

alloc = portfolio.allocation(holdings, prices)
c1, c2 = st.columns(2)
with c1:
    st.subheader("Allocation by asset type")
    st.bar_chart(alloc["by_type"])
with c2:
    st.subheader("Allocation by holding")
    st.bar_chart({h["symbol"]: h["pct"] for h in alloc["by_holding"]})

st.subheader("Dividends")
divs = portfolio.dividend_summary(holdings, dividends)
st.write(f"Total received: ₹{divs['total']:,.2f}")
st.table([{"symbol": k, "total": v} for k, v in divs["per_symbol"].items()])
st.subheader("Dividend calendar (by month)")
st.bar_chart(divs["by_month"])

st.subheader("Price alerts")
alerts = portfolio.price_alerts(holdings, prices, threshold)
if alerts:
    st.table(alerts)
else:
    st.write("No holding moved beyond the threshold.")
