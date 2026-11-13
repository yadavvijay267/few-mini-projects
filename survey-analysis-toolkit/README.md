# Survey Data Analysis Toolkit

Load a survey CSV, clean it, compute distributions and cross-tabs, and
export charts plus a shareable HTML summary report.

## Features

- Upload a survey CSV; automatic cleaning (duplicates, empty rows,
  bad values, whitespace).
- Per-question distributions with counts and percentages.
- Cross-tab any two questions with a chi-square test — including a
  plain-English interpretation ("these two answers are related,
  p=0.02").
- Likert-scale summary with a diverging bar chart.
- One-click HTML report export (plus charts as PNGs).

## Tech stack

- Python 3.10+, pandas, matplotlib (charts), scipy (chi-square,
  optional — the toolkit reports the statistic and says so if scipy
  is absent).

## How to run

```bash
pip install -r requirements.txt
python3 src/survey.py --demo
python3 src/survey.py --csv assets/survey_sample.csv --crosstab department --with satisfaction --report report.html
streamlit run src/app.py
```

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
