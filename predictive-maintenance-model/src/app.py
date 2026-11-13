"""Streamlit dashboard: metrics, feature importance, ranked alert list."""
import json, os, subprocess, sys
import pandas as pd
import streamlit as st
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
st.set_page_config(page_title="Predictive Maintenance", layout="wide")
st.title("Predictive Maintenance — failure risk dashboard")
mp = os.path.join(BASE, "models", "metrics.json")
if os.path.exists(mp):
    m = json.load(open(mp))
    c = st.columns(5)
    for col, k in zip(c, ("accuracy", "precision", "recall", "f1", "roc_auc")):
        col.metric(k, f"{m[k]:.1%}" if k != "roc_auc" else f"{m[k]:.3f}")
    st.subheader("Feature importance")
    st.bar_chart(m["feature_importance"])
    st.subheader("Confusion matrix (rows=true, cols=pred)")
    st.write(m["confusion_matrix"])
st.subheader("Alert list — machines ranked by failure probability")
out = subprocess.run([sys.executable, os.path.join(BASE, "src", "predict.py"), "--alerts", "--top", "10"],
                     capture_output=True, text=True)
if out.returncode == 0:
    st.dataframe(pd.DataFrame(json.loads(out.stdout)))
