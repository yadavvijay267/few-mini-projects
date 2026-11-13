"""Train the RandomForest failure model and report metrics + feature importance."""
import argparse, json, os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             precision_score, recall_score, f1_score, roc_auc_score)
from sklearn.model_selection import train_test_split

FEATURES = ["vibration", "temperature", "runtime_hours", "load", "cycles_since_service"]

def main():
    ap = argparse.ArgumentParser(description="Train the predictive-maintenance model.")
    ap.add_argument("--data", default=os.path.join(os.path.dirname(__file__), "..", "assets", "sensor_data.csv"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "models"))
    a = ap.parse_args()
    df = pd.read_csv(a.data)
    X, y = df[FEATURES], df["failed_within_30d"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    proba = model.predict_proba(Xte)[:, 1]
    metrics = {
        "accuracy": round(float(accuracy_score(yte, pred)), 4),
        "precision": round(float(precision_score(yte, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(yte, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(yte, pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(yte, proba)), 4),
        "confusion_matrix": confusion_matrix(yte, pred).tolist(),
        "classification_report": classification_report(yte, pred, output_dict=True, zero_division=0),
        "feature_importance": {f: round(float(v), 4) for f, v in zip(FEATURES, model.feature_importances_)},
        "n_train": len(Xtr), "n_test": len(Xte),
        "model": "RandomForestClassifier(n_estimators=200)",
    }
    os.makedirs(a.out, exist_ok=True)
    joblib.dump(model, os.path.join(a.out, "model.pkl"))
    with open(os.path.join(a.out, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    try:
        import matplotlib; matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(8, 4))
        imp = sorted(metrics["feature_importance"].items(), key=lambda t: -t[1])
        ax.barh([k for k, _ in imp], [v for _, v in imp])
        ax.set_title("Feature importance"); fig.tight_layout()
        fig.savefig(os.path.join(a.out, "feature_importance.png")); plt.close(fig)
    except Exception as e:
        print("chart skipped:", e)
    print(json.dumps({k: metrics[k] for k in ("accuracy", "precision", "recall", "f1", "roc_auc")}, indent=2))
    print("feature importance:", metrics["feature_importance"])

if __name__ == "__main__":
    main()
