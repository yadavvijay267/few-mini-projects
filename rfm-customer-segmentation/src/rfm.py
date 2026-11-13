"""RFM segmentation: real Recency/Frequency/Monetary computation from a
transaction CSV, quintile scoring, named segments, recommended actions.
"""
import argparse, os, sys
from datetime import datetime

try:
    import pandas as pd
    HAVE_PANDAS = True
except ImportError:
    HAVE_PANDAS = False

SEGMENT_RULES = [
    (lambda r, f, m: r >= 4 and f >= 4 and m >= 4, "Champions"),
    (lambda r, f, m: r >= 4 and f >= 3, "Loyal Customers"),
    (lambda r, f, m: r >= 3 and f >= 3, "Potential Loyalists"),
    (lambda r, f, m: r >= 4 and f <= 2, "New Customers"),
    (lambda r, f, m: r == 3 and f <= 2, "About to Sleep"),
    (lambda r, f, m: r == 2, "At Risk"),
    (lambda r, f, m: r == 1 and f >= 3, "Hibernating"),
    (lambda r, f, m: True, "Lost"),
]
ACTIONS = {
    "Champions": "Reward them, ask for referrals and reviews; early access to new products.",
    "Loyal Customers": "Upsell and cross-sell; invite to a loyalty programme.",
    "Potential Loyalists": "Offer membership perks and personalised recommendations.",
    "New Customers": "Onboard well; first-purchase follow-up and welcome offer.",
    "About to Sleep": "Re-engage with a reminder and a small incentive.",
    "At Risk": "Win-back offer within two weeks; ask for feedback.",
    "Hibernating": "Deep discount or survey; last-chance campaign.",
    "Lost": "Do not spend much here; a single low-cost win-back attempt only.",
}


def _score(series, higher_is_better=True):
    """Quintile score 1-5 (rank-based, so ties never crash qcut)."""
    ranks = series.rank(method="first")
    n = len(series)
    score = ((ranks - 1) / max(n, 1) * 5).astype(int) + 1
    score = score.clip(1, 5)
    return (6 - score) if not higher_is_better else score


def compute_rfm(df):
    df = df.copy()
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"])
    df["Total"] = df["Quantity"] * df["UnitPrice"]
    ref = df["InvoiceDate"].max()
    grouped = df.groupby("CustomerID").agg(
        Recency=("InvoiceDate", lambda s: (ref - s.max()).days),
        Frequency=("InvoiceNo", "nunique"),
        Monetary=("Total", "sum"),
    ).reset_index()
    grouped["R"] = _score(grouped["Recency"], higher_is_better=False)
    grouped["F"] = _score(grouped["Frequency"], higher_is_better=True)
    grouped["M"] = _score(grouped["Monetary"], higher_is_better=True)
    grouped["RFM_Score"] = grouped["R"] + grouped["F"] + grouped["M"]
    grouped["RFM_Code"] = grouped["R"].astype(str) + grouped["F"].astype(str) + grouped["M"].astype(str)
    grouped["Segment"] = [segment_name(r, f, m) for r, f, m in zip(grouped["R"], grouped["F"], grouped["M"])]
    grouped["Recommended_Action"] = grouped["Segment"].map(ACTIONS)
    return grouped


def segment_name(r, f, m):
    for rule, name in SEGMENT_RULES:
        if rule(r, f, m):
            return name
    return "Lost"


def summary(rfm):
    return (rfm.groupby("Segment")
              .agg(customers=("CustomerID", "count"), avg_monetary=("Monetary", "mean"),
                   avg_recency=("Recency", "mean"), avg_frequency=("Frequency", "mean"))
              .reset_index().sort_values("customers", ascending=False))


def kmeans_check(rfm, k=5):
    try:
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler
    except ImportError:
        return None
    X = StandardScaler().fit_transform(rfm[["Recency", "Frequency", "Monetary"]])
    rfm = rfm.copy()
    rfm["KMeans_Cluster"] = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(X)
    return rfm


def charts(rfm, out_dir):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed; skipping charts.", file=sys.stderr)
        return
    os.makedirs(out_dir, exist_ok=True)
    counts = rfm["Segment"].value_counts()
    plt.figure(figsize=(9, 5)); counts.plot(kind="bar", color="#2563eb")
    plt.title("Customers per segment"); plt.ylabel("Customers"); plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "segment_sizes.png")); plt.close()
    plt.figure(figsize=(7, 5))
    plt.scatter(rfm["Recency"], rfm["Monetary"], c=rfm["Frequency"], cmap="viridis", alpha=0.6)
    plt.xlabel("Recency (days)"); plt.ylabel("Monetary (total spend)"); plt.colorbar(label="Frequency")
    plt.title("Recency vs Monetary (colour = Frequency)"); plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "recency_vs_monetary.png")); plt.close()
    print(f"Charts written to {out_dir}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="RFM customer segmentation from a transaction CSV.")
    parser.add_argument("--csv", help="Transaction CSV (InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID).")
    parser.add_argument("--demo", action="store_true", help="Use the bundled sample transactions.")
    parser.add_argument("--charts", help="Directory to write segment charts into.")
    parser.add_argument("--export-dir", help="Write one CSV per segment into this directory.")
    parser.add_argument("--kmeans", action="store_true", help="Also run a K-Means cross-check (needs scikit-learn).")
    args = parser.parse_args(argv)
    if not HAVE_PANDAS:
        print("pandas is required: pip install -r requirements.txt", file=sys.stderr)
        return 1
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = args.csv or (os.path.join(base, "assets", "transactions.csv") if args.demo else None)
    if not path:
        parser.error("Give --csv or --demo.")
    df = pd.read_csv(path)
    rfm = compute_rfm(df)
    print(f"{len(rfm)} customers segmented from {len(df)} transactions.")
    summ = summary(rfm)
    print(summ.to_string(index=False, float_format=lambda v: f"{v:.1f}"))
    print("\nRecommended actions:")
    for _, row in summ.iterrows():
        print(f"  {row['Segment']}: {ACTIONS[row['Segment']]}")
    if args.kmeans:
        checked = kmeans_check(rfm)
        print("\nK-Means cross-check: " + ("clusters added (see KMeans_Cluster column)." if checked is not None else "scikit-learn not installed."))
        if checked is not None:
            rfm = checked
    if args.charts:
        charts(rfm, args.charts)
    if args.export_dir:
        os.makedirs(args.export_dir, exist_ok=True)
        for segment, group in rfm.groupby("Segment"):
            fname = os.path.join(args.export_dir, segment.lower().replace(" ", "_") + ".csv")
            group.to_csv(fname, index=False)
        print(f"Segment lists written to {args.export_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
