# Usage — Survey Analysis Toolkit

## Cleaning rules (documented, deterministic)

1. Drop exact duplicate rows.
2. Drop rows where every answer is empty.
3. Strip whitespace from text answers.
4. Coerce Likert columns (`satisfaction`, `recommend`) to integers and
   drop values outside 1-5 (they are counted and reported).
5. Normalise categorical answers to title case ("eng" -> "Eng" is not
   guessed; only case/whitespace is fixed).

The cleaning report prints how many rows were dropped and why, so the
analysis is auditable.

## Chi-square test

`crosstab(df, q1, q2)` builds a contingency table and runs
`scipy.stats.chi2_contingency` when scipy is installed. The report gives
the chi-square statistic, degrees of freedom, p-value, and a
plain-English interpretation: p < 0.05 means "these two answers are
related"; otherwise "no evidence they are related". If scipy is absent,
the statistic is still computed but no p-value is claimed.

## Likert summary

For 1-5 Likert questions the toolkit reports the mean, the share of
promoters (4-5) vs detractors (1-2), and a diverging bar chart centred
on the neutral point.
