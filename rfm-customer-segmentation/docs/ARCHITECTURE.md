# Architecture — RFM Segmentation

## RFM computation

For each customer, from the transaction table (`InvoiceDate`,
`CustomerID`, `Quantity`, `UnitPrice`):

- **Recency (R)**: days between the customer's last purchase and the
  reference date (the latest invoice date in the file). Lower is better.
- **Frequency (F)**: number of distinct invoices. Higher is better.
- **Monetary (M)**: total spend = sum(Quantity * UnitPrice). Higher is
  better.

Each of R, F, M is scored 1-5 by quintiles (`pandas.qcut`, with
rank-based fallback when values tie). The RFM score is the concatenated
R-F-M digits (e.g. 555) and the numeric sum.

## Segment mapping (rule-based, documented)

| Rule | Segment |
|---|---|
| R>=4 and F>=4 and M>=4 | Champions |
| R>=4 and F>=3 | Loyal Customers |
| R>=3 and F>=3 | Potential Loyalists |
| R>=4 and F<=2 | New Customers |
| R==3 and F<=2 | About to Sleep |
| R==2 | At Risk |
| R==1 and F>=3 | Hibernating |
| R==1 and F<=2 | Lost |

## K-Means cross-check

When scikit-learn is installed, `--kmeans` also clusters the standardised
R/F/M values (k=5) so the rule-based segments can be compared with
unsupervised clusters. The rule-based segments are the primary output;
K-Means is a sanity check, not a replacement.

## Recommended actions

Each segment maps to one action (e.g. Champions -> "Reward and ask for
referrals"; At Risk -> "Win-back offer within 2 weeks"). These are
marketing rules of thumb, labelled as such in the code.
