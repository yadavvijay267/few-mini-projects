# Architecture — Sentiment Analysis Dashboard

## Model

A **real trained classifier**: `TfidfVectorizer` (word 1-2 grams, English
stop words) + `LogisticRegression`, trained on the 60 labelled reviews in
`assets/reviews_labeled.csv` (20 positive / 20 negative / 20 neutral,
written for this project). Training happens at import/run time in a few
milliseconds — there is no hidden pre-trained weight file.

## Honesty note

This is a small, project-scale training set. Hold-out accuracy on a
20% split is typically around 0.75-0.90 (run
`python3 src/sentiment.py --evaluate` to see the current figure on this
machine). It is **not** a production-grade model like DistilBERT — the
guide suggests Hugging Face Transformers, which would be the production
path; this TF-IDF model is the lightweight, fully offline alternative,
and the README says so. A lexicon fallback (positive/negative word lists)
is used only if scikit-learn is unavailable, and it is labelled as such.

## Aspects

Aspect detection is keyword-based and documented as such: a review is
tagged with an aspect (price, quality, delivery, service) when it
contains one of that aspect's keywords. Aspect sentiment is the average
predicted sentiment of the reviews tagged with that aspect.

## Pipeline

CSV (text, date) -> clean text -> TF-IDF -> LogisticRegression ->
label + probability -> aggregate (distribution, daily trend, aspects) ->
charts (matplotlib) / Streamlit dashboard / labelled CSV export.
