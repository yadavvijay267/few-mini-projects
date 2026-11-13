"""Streamlit UI for the survey toolkit (optional dependency)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import streamlit as st
    import pandas as pd
except ImportError:
    raise SystemExit("Streamlit/pandas not installed. Run: pip install -r requirements.txt")
from survey import load_and_clean, distribution, crosstab, likert_summary, LIKERT_COLS, CATEGORICAL
import tempfile

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
st.set_page_config(page_title="Survey Toolkit", layout="wide")
st.title("Survey Data Analysis Toolkit")
uploaded = st.file_uploader("Survey CSV", type=["csv"])
if uploaded is not None:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    tmp.write(uploaded.read()); tmp.close()
    path = tmp.name
else:
    path = os.path.join(BASE, "assets", "survey_sample.csv")
df, report = load_and_clean(path)
st.write("Cleaning report:", report)
for col in LIKERT_COLS:
    if col in df.columns:
        st.subheader(f"Likert: {col}")
        st.json(likert_summary(df, col))
        st.bar_chart(pd.Series({d["value"]: d["count"] for d in distribution(df, col)}))
q1 = st.selectbox("Cross-tab question 1", [c for c in CATEGORICAL if c in df.columns])
q2 = st.selectbox("Cross-tab question 2", [c for c in CATEGORICAL if c in df.columns and c != q1])
if st.button("Run cross-tab"):
    result = crosstab(df, q1, q2)
    st.dataframe(result["table"])
    st.write(f"chi2={result['chi2']} p={result['p']} dof={result['dof']}")
    st.info(result["interpretation"])
