"""Streamlit dashboard for sentiment analysis (optional dependency)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import streamlit as st
    import pandas as pd
except ImportError:
    raise SystemExit("Streamlit/pandas not installed. Run: pip install -r requirements.txt")
from sentiment import SentimentModel, analyse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
st.set_page_config(page_title="Sentiment Dashboard", layout="wide")
st.title("Sentiment Analysis Dashboard")
model = SentimentModel(os.path.join(BASE, "assets", "reviews_labeled.csv"))
st.caption(f"Model: TF-IDF + LogisticRegression ({model.method}) trained on bundled labelled reviews.")
uploaded = st.file_uploader("Upload a reviews CSV (columns: date, text)", type=["csv"])
text = st.text_area("Or paste a single review")
if text and st.button("Analyse text"):
    label, conf = model.predict([text])[0]
    st.success(f"{label} (confidence {conf:.2f})")
df = pd.read_csv(uploaded) if uploaded is not None else pd.read_csv(os.path.join(BASE, "assets", "reviews.csv"))
rows = df.to_dict("records")
summary = analyse(model, rows)
st.subheader("Distribution")
st.bar_chart(pd.Series(summary["distribution"]))
st.subheader("Trend over time")
df2 = pd.DataFrame(rows)
df2["score"] = df2["sentiment"].map({"positive": 1, "neutral": 0, "negative": -1})
trend = df2.groupby("date")["score"].mean()
st.line_chart(trend)
st.subheader("Aspect view")
st.json(summary["aspects"])
st.subheader("Labelled reviews")
st.dataframe(df2)
st.download_button("Download labelled CSV", df2.to_csv(index=False), "labelled_reviews.csv")
