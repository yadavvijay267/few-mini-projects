"""Streamlit dashboard: upload an image, see top-3 predictions + metrics."""
import json, os
import streamlit as st
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
st.set_page_config(page_title="Image Classifier", layout="wide")
st.title("Image Classifier — QC Defect Detection (baseline)")
st.write("Baseline: LogisticRegression on hand-built features. See README for the transfer-learning production path.")
metrics_path = os.path.join(BASE, "models", "metrics.json")
if os.path.exists(metrics_path):
    m = json.load(open(metrics_path))
    st.metric("Test accuracy", f"{m['accuracy']:.1%}")
    st.json(m["classification_report"])
up = st.file_uploader("Upload an image (PNG/JPG)", type=["png", "jpg", "jpeg"])
if up:
    tmp = os.path.join("/tmp", up.name)
    open(tmp, "wb").write(up.getbuffer())
    st.image(tmp, width=256)
    import subprocess, sys
    out = subprocess.run([sys.executable, os.path.join(BASE, "src", "predict.py"), "--image", tmp],
                         capture_output=True, text=True)
    st.code(out.stdout or out.stderr)
