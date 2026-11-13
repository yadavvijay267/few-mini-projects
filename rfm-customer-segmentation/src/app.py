"""Streamlit dashboard for RFM segmentation (optional dependency)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import streamlit as st
    import pandas as pd
except ImportError:
    raise SystemExit("Streamlit/pandas not installed. Run: pip install -r requirements.txt")
from rfm import compute_rfm, summary, ACTIONS

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
st.set_page_config(page_title="RFM Segmentation", layout="wide")
st.title("E-Commerce Analytics — RFM Segmentation")
uploaded = st.file_uploader("Transaction CSV", type=["csv"])
df = pd.read_csv(uploaded) if uploaded is not None else pd.read_csv(os.path.join(BASE, "assets", "transactions.csv"))
rfm = compute_rfm(df)
st.metric("Customers", len(rfm))
st.subheader("Segment summary")
st.dataframe(summary(rfm))
st.subheader("Customers per segment")
st.bar_chart(rfm["Segment"].value_counts())
st.subheader("Recommended actions")
for seg, action in ACTIONS.items():
    if seg in set(rfm["Segment"]):
        st.write(f"**{seg}** — {action}")
st.subheader("Customer table")
st.dataframe(rfm.sort_values("RFM_Score", ascending=False))
st.download_button("Download RFM table", rfm.to_csv(index=False), "rfm_segments.csv")
