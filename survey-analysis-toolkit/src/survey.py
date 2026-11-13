"""Survey analysis toolkit: clean, distributions, cross-tabs with
chi-square, Likert summary, HTML report export.
"""
import argparse, os, sys

try:
    import pandas as pd
    HAVE_PANDAS = True
except ImportError:
    HAVE_PANDAS = False

LIKERT_COLS = ["satisfaction", "recommend"]
CATEGORICAL = ["department", "age_group", "work_mode", "would_refer"]


def load_and_clean(path):
    """Return (clean_df, report_dict) describing what was removed."""
    df = pd.read_csv(path, dtype=str)
    report = {"rows_in": len(df)}
    df = df.drop_duplicates()
    report["duplicates_removed"] = report["rows_in"] - len(df)
    answer_cols = [c for c in df.columns if c != "respondent_id"]
    empty_mask = df[answer_cols].isna().all(axis=1) if answer_cols else df.isna().all(axis=1)
    report["empty_rows_removed"] = int(empty_mask.sum())
    df = df[~empty_mask]
    for col in df.columns:
        df[col] = df[col].astype(str).str.strip().replace({"nan": None, "None": None, "": None})
    bad = 0
    for col in LIKERT_COLS:
        if col in df.columns:
            nums = pd.to_numeric(df[col], errors="coerce")
            bad += int(((nums < 1) | (nums > 5) | nums.isna()).sum())
            df[col] = nums
            df = df[df[col].between(1, 5)]
    report["bad_likert_removed"] = bad
    report["rows_out"] = len(df)
    return df.reset_index(drop=True), report


def distribution(df, question):
    counts = df[question].value_counts(dropna=False)
    total = len(df)
    return [{"value": str(v), "count": int(c), "pct": round(100 * c / total, 1)}
            for v, c in counts.items()]


def crosstab(df, q1, q2):
    table = pd.crosstab(df[q1], df[q2])
    result = {"table": table, "chi2": None, "p": None, "dof": None, "interpretation": None}
    try:
        from scipy.stats import chi2_contingency
        chi2, p, dof, _ = chi2_contingency(table)
        result.update({"chi2": round(float(chi2), 3), "p": round(float(p), 4), "dof": int(dof)})
        result["interpretation"] = (
            f"These two answers are related (p={p:.3f})." if p < 0.05
            else f"No evidence these two answers are related (p={p:.3f}).")
    except ImportError:
        # Chi-square statistic without a p-value; never invent one.
        observed = table.values.astype(float)
        expected = observed.sum(axis=1, keepdims=True) * observed.sum(axis=0) / observed.sum()
        chi2 = float(((observed - expected) ** 2 / expected).sum())
        result.update({"chi2": round(chi2, 3),
                       "interpretation": "scipy not installed: chi-square statistic shown, p-value unavailable."})
    return result


def likert_summary(df, question):
    series = pd.to_numeric(df[question], errors="coerce").dropna()
    return {
        "question": question, "n": int(len(series)),
        "mean": round(float(series.mean()), 2),
        "promoters_pct": round(100 * float((series >= 4).mean()), 1),
        "detractors_pct": round(100 * float((series <= 2).mean()), 1),
        "distribution": distribution(df, question),
    }


def charts(df, out_dir):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed; skipping charts.", file=sys.stderr)
        return
    os.makedirs(out_dir, exist_ok=True)
    for col in LIKERT_COLS:
        if col not in df.columns:
            continue
        counts = df[col].value_counts().sort_index()
        colors = ["#e53e3e", "#ed8936", "#a0aec0", "#68d391", "#38a169"]
        plt.figure(figsize=(7, 4))
        plt.bar([str(i) for i in counts.index], counts.values,
                color=[colors[int(i) - 1] for i in counts.index])
        plt.title(f"Likert distribution: {col}"); plt.ylabel("Respondents"); plt.tight_layout()
        plt.savefig(os.path.join(out_dir, f"likert_{col}.png")); plt.close()
    print(f"Charts written to {out_dir}")


def html_report(df, clean_report, crosstab_result=None, path="report.html"):
    rows = "".join(
        f"<tr><td>{q}</td><td>{s['mean']}</td><td>{s['promoters_pct']}%</td><td>{s['detractors_pct']}%</td></tr>"
        for q, s in ((c, likert_summary(df, c)) for c in LIKERT_COLS if c in df.columns))
    dist_html = ""
    for col in CATEGORICAL:
        if col in df.columns:
            items = "".join(f"<li>{d['value']}: {d['count']} ({d['pct']}%)</li>" for d in distribution(df, col))
            dist_html += f"<h3>{col}</h3><ul>{items}</ul>"
    ct_html = ""
    if crosstab_result:
        ct_html = f"<h2>Cross-tab</h2><p>chi² = {crosstab_result['chi2']}, p = {crosstab_result['p']}, dof = {crosstab_result['dof']}</p><p>{crosstab_result['interpretation']}</p>" + crosstab_result["table"].to_html()
    html = f"""<!doctype html><html><head><meta charset="utf-8"><title>Survey Report</title>
    <style>body{{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem}}
    table{{border-collapse:collapse}}td,th{{border:1px solid #ddd;padding:.4rem .6rem}}</style></head>
    <body><h1>Survey Report</h1>
    <p>Rows in: {clean_report['rows_in']} · duplicates removed: {clean_report['duplicates_removed']} ·
    empty rows removed: {clean_report['empty_rows_removed']} · bad Likert values removed: {clean_report['bad_likert_removed']} ·
    rows analysed: {clean_report['rows_out']}</p>
    <h2>Likert summary</h2><table><tr><th>Question</th><th>Mean</th><th>Promoters (4-5)</th><th>Detractors (1-2)</th></tr>{rows}</table>
    <h2>Distributions</h2>{dist_html}{ct_html}</body></html>"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Report written to {path}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Analyse a survey CSV: clean, cross-tab, Likert summary, HTML report.")
    parser.add_argument("--csv", help="Survey CSV file.")
    parser.add_argument("--demo", action="store_true", help="Use the bundled sample survey.")
    parser.add_argument("--crosstab", help="First question for the cross-tab.")
    parser.add_argument("--with", dest="with_q", help="Second question for the cross-tab.")
    parser.add_argument("--charts", help="Directory to write charts into.")
    parser.add_argument("--report", help="Write an HTML report to this path.")
    args = parser.parse_args(argv)
    if not HAVE_PANDAS:
        print("pandas is required: pip install -r requirements.txt", file=sys.stderr)
        return 1
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = args.csv or (os.path.join(base, "assets", "survey_sample.csv") if args.demo else None)
    if not path:
        parser.error("Give --csv or --demo.")
    df, report = load_and_clean(path)
    print(f"Cleaning: {report}")
    for col in LIKERT_COLS:
        if col in df.columns:
            s = likert_summary(df, col)
            print(f"{col}: n={s['n']} mean={s['mean']} promoters={s['promoters_pct']}% detractors={s['detractors_pct']}%")
    for col in CATEGORICAL:
        if col in df.columns:
            print(f"{col}: {distribution(df, col)}")
    ct = None
    if args.crosstab and args.with_q:
        ct = crosstab(df, args.crosstab, args.with_q)
        print(f"\nCross-tab {args.crosstab} x {args.with_q}:\n{ct['table']}")
        print(f"chi2={ct['chi2']} p={ct['p']} dof={ct['dof']}")
        print(ct["interpretation"])
    if args.charts:
        charts(df, args.charts)
    if args.report:
        html_report(df, report, ct, args.report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
