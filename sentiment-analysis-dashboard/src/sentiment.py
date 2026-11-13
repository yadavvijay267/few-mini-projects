"""Sentiment analysis: TF-IDF + LogisticRegression trained on the bundled
labelled reviews. Falls back to a documented lexicon scorer only when
scikit-learn is unavailable.
"""
import argparse, csv, os, re, sys
from collections import Counter

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    HAVE_SKLEARN = True
except ImportError:
    HAVE_SKLEARN = False

LABELS = ["negative", "neutral", "positive"]
ASPECTS = {
    "price": ["price", "cost", "cheap", "expensive", "money", "value", "overpriced", "penny"],
    "quality": ["quality", "durable", "sturdy", "flimsy", "broke", "broken", "material", "finish", "build"],
    "delivery": ["delivery", "shipping", "arrived", "late", "fast", "packaging", "tracking"],
    "service": ["service", "support", "customer", "refund", "reply", "rude", "helpful"],
}
POS_WORDS = {"love", "great", "excellent", "amazing", "fantastic", "superb", "happy", "pleased", "delighted", "perfect", "brilliant", "wonderful", "outstanding", "impressed"}
NEG_WORDS = {"terrible", "awful", "worst", "bad", "poor", "disappointed", "disappointing", "horrible", "faulty", "defective", "waste", "regret", "unhappy", "slow"}


def clean(text):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z\s]", " ", text.lower())).strip()


def load_labeled(path):
    texts, labels = [], []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            texts.append(row["text"]); labels.append(row["label"])
    return texts, labels


class SentimentModel:
    def __init__(self, labeled_path):
        self.labeled_path = labeled_path
        self.method = "lexicon"
        if HAVE_SKLEARN:
            texts, labels = load_labeled(labeled_path)
            self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
            X = self.vectorizer.fit_transform(texts)
            self.clf = LogisticRegression(max_iter=1000)
            self.clf.fit(X, labels)
            self.method = "tfidf-logreg"
        else:
            print("Note: scikit-learn missing; using the documented lexicon fallback.", file=sys.stderr)

    def predict(self, texts):
        if self.method == "tfidf-logreg":
            X = self.vectorizer.transform(texts)
            preds = self.clf.predict(X)
            proba = self.clf.predict_proba(X)
            return [(p, float(max(row))) for p, row in zip(preds, proba)]
        out = []
        for text in texts:
            words = set(clean(text).split())
            score = len(words & POS_WORDS) - len(words & NEG_WORDS)
            label = "positive" if score > 0 else ("negative" if score < 0 else "neutral")
            out.append((label, min(0.95, 0.55 + 0.1 * abs(score))))
        return out

    def evaluate(self):
        if self.method != "tfidf-logreg":
            return None
        texts, labels = load_labeled(self.labeled_path)
        Xtr, Xte, ytr, yte = train_test_split(texts, labels, test_size=0.2, random_state=42, stratify=labels)
        vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        clf = LogisticRegression(max_iter=1000).fit(vec.fit_transform(Xtr), ytr)
        return accuracy_score(yte, clf.predict(vec.transform(Xte)))


def aspect_of(text):
    words = set(clean(text).split())
    return [a for a, kws in ASPECTS.items() if words & set(kws)]


def analyse(model, rows):
    texts = [r["text"] for r in rows]
    preds = model.predict(texts)
    for row, (label, conf) in zip(rows, preds):
        row["sentiment"] = label; row["confidence"] = round(conf, 3)
        row["aspects"] = aspect_of(row["text"])
    dist = Counter(r["sentiment"] for r in rows)
    aspect_stats = {}
    for aspect in ASPECTS:
        tagged = [r for r in rows if aspect in r["aspects"]]
        if tagged:
            score = {"positive": 1, "neutral": 0, "negative": -1}
            aspect_stats[aspect] = {
                "count": len(tagged),
                "mean_score": round(sum(score[r["sentiment"]] for r in tagged) / len(tagged), 2),
                "distribution": dict(Counter(r["sentiment"] for r in tagged)),
            }
    return {"distribution": dict(dist), "aspects": aspect_stats}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Sentiment analysis dashboard (CLI). Trains TF-IDF + LogisticRegression on bundled labelled reviews.")
    parser.add_argument("--text", help="Analyse a single piece of text.")
    parser.add_argument("--csv", help="CSV of reviews with columns date,text.")
    parser.add_argument("--out", help="Write labelled reviews to this CSV.")
    parser.add_argument("--evaluate", action="store_true", help="Print hold-out accuracy of the model.")
    parser.add_argument("--demo", action="store_true", help="Analyse the bundled sample reviews.")
    args = parser.parse_args(argv)
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model = SentimentModel(os.path.join(base, "assets", "reviews_labeled.csv"))
    if args.evaluate:
        acc = model.evaluate()
        print(f"Hold-out accuracy (20% split): {acc:.2f}" if acc is not None else "Evaluation needs scikit-learn.")
        return 0
    if args.text:
        label, conf = model.predict([args.text])[0]
        print(f"{label} (confidence {conf:.2f}) — method: {model.method}")
        return 0
    path = args.csv or (os.path.join(base, "assets", "reviews.csv") if args.demo else None)
    if not path:
        parser.error("Give --text, --csv, or --demo.")
    rows = []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append({"date": row.get("date", ""), "text": row["text"]})
    summary = analyse(model, rows)
    print(f"Method: {model.method} | {len(rows)} reviews")
    print("Distribution:", summary["distribution"])
    print("Aspects:")
    for aspect, stats in summary["aspects"].items():
        print(f"  {aspect}: n={stats['count']} mean={stats['mean_score']} {stats['distribution']}")
    if args.out:
        with open(args.out, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["date", "text", "sentiment", "confidence", "aspects"])
            w.writeheader()
            for r in rows:
                row = dict(r); row["aspects"] = ";".join(r["aspects"]); w.writerow(row)
        print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
