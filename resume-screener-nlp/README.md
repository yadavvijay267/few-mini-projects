# Resume Screener (NLP)

Score resumes against a job description using keyword/skill matching plus
TF-IDF cosine similarity, and rank candidates. Built for the first pass of
hiring: a recruiter sees *which* skills each candidate is missing, not
just a number.

## Features

- Score any number of plain-text resumes against one job description.
- Per-resume match score (0-100) combining skill coverage and TF-IDF
  cosine similarity.
- Top matching skills and missing skills listed per candidate.
- Ranked candidate table, exportable to CSV.
- Side-by-side comparison of the top two candidates.
- Optional Streamlit web UI (`src/app.py`).

## How scoring works

See `docs/ARCHITECTURE.md`. In short: 60% skill coverage (skills found in
the resume / skills required by the job description) + 40% TF-IDF cosine
similarity between the resume and the job description. The skill list is
explicit and editable in `assets/skills.txt`, so the scoring is fully
transparent — this is a rule-based + TF-IDF scorer, not a black-box model.

## Tech stack

- Python 3.10+
- scikit-learn (TF-IDF + cosine similarity), pandas (optional, for CSV export)

## How to run

```bash
pip install -r requirements.txt
# Demo with the bundled job description and 4 sample resumes:
python3 src/screener.py --demo
# Your own files:
python3 src/screener.py --job assets/job_description.txt --resumes assets/resumes/*.txt --out ranked.csv
# Compare the top two candidates:
python3 src/screener.py --demo --compare
# Web UI (optional, needs Streamlit):
streamlit run src/app.py
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
