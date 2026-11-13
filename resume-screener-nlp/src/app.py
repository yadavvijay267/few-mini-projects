"""Streamlit UI for the resume screener (optional dependency)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import streamlit as st
except ImportError:
    raise SystemExit("Streamlit is not installed. Run: pip install streamlit")
from screener import load_skills, score_resumes

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
st.set_page_config(page_title="Resume Screener", layout="wide")
st.title("Resume Screener (NLP)")
st.write("Score resumes against a job description — skill coverage + TF-IDF similarity.")
job = st.text_area("Job description", height=180)
uploaded = st.file_uploader("Resumes (.txt)", type=["txt"], accept_multiple_files=True)
if st.button("Rank candidates") and job and uploaded:
    skills = load_skills(os.path.join(BASE, "assets", "skills.txt"))
    resumes = [{"name": f.name.rsplit(".", 1)[0], "text": f.read().decode("utf-8", "ignore")} for f in uploaded]
    results = score_resumes(job, resumes, skills)
    st.table([{k: (", ".join(v) if isinstance(v, list) else v) for k, v in r.items()} for r in results])
    if len(results) >= 2:
        a, b = results[0], results[1]
        c1, c2 = st.columns(2)
        c1.subheader(f"#1 {a['candidate']} — {a['score']}")
        c1.write("Matched: " + ", ".join(a["matched_skills"]))
        c1.write("Missing: " + ", ".join(a["missing_skills"]))
        c2.subheader(f"#2 {b['candidate']} — {b['score']}")
        c2.write("Matched: " + ", ".join(b["matched_skills"]))
        c2.write("Missing: " + ", ".join(b["missing_skills"]))
