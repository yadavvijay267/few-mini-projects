# Sentiment Analysis Dashboard

Analyse the sentiment of product reviews or social posts and visualise
trends over time. Includes an aspect view: sentiment broken down by topic
(price, quality, delivery, service) instead of one overall score.

## Features

- Paste text or upload a CSV of reviews for batch analysis.
- A **real trained model**: TF-IDF + LogisticRegression, trained on the
  labelled reviews in `assets/reviews_labeled.csv` (90 reviews, 30 per class — see
  `docs/ARCHITECTURE.md` for the honest accuracy figure).
- Sentiment distribution chart and trend line over time.
- Aspect view: sentiment per topic (price / quality / delivery / service).
- Word lists of the most positive vs negative terms.
- Export the labelled dataset as CSV.
- Streamlit dashboard (`src/app.py`) or plain CLI (`src/sentiment.py`).

## Tech stack

- Python 3.10+, scikit-learn (TF-IDF + LogisticRegression), pandas,
  matplotlib (charts), Streamlit (dashboard, optional).

## How to run

```bash
pip install -r requirements.txt
python3 src/sentiment.py --demo            # analyse the bundled reviews
python3 src/sentiment.py --text "I love this product, great quality!"
python3 src/sentiment.py --csv assets/reviews.csv --out labelled.csv
streamlit run src/app.py                   # web dashboard
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
