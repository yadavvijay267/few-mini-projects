"""Streamlit dashboard: history, forecast chart, backtest metrics."""
import json, os, subprocess, sys
import pandas as pd
import streamlit as st
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
st.set_page_config(page_title="Time-Series Forecaster", layout="wide")
st.title("Time-Series Forecasting — data-centre load")
df = pd.read_csv(os.path.join(BASE, "assets", "load_data.csv"), parse_dates=["date"])
st.line_chart(df.set_index("date")["load_kw"].tail(180))
if st.button("Run backtest"):
    out = subprocess.run([sys.executable, os.path.join(BASE, "src", "forecast.py"), "--backtest"],
                         capture_output=True, text=True)
    st.code(out.stdout or out.stderr)
fp = os.path.join(BASE, "models", "forecast.json")
if os.path.exists(fp):
    m = json.load(open(fp))
    if "backtest" in m:
        st.metric("Backtest MAPE", f"{m['backtest']['mape_pct']}%")
        st.metric("Backtest RMSE", f"{m['backtest']['rmse_kw']} kW")
    st.dataframe(pd.DataFrame(m.get("forecast", [])))
