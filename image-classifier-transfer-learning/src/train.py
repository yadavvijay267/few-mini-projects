"""Train the baseline classifier and report honest metrics."""
import argparse, json, os
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
import joblib
from features import load_dataset

def main():
    ap = argparse.ArgumentParser(description="Train the image classifier baseline.")
    ap.add_argument("--samples", default=os.path.join(os.path.dirname(__file__), "..", "assets", "samples"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "models"))
    a = ap.parse_args()
    X, y, _ = load_dataset(a.samples)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    acc = accuracy_score(yte, pred)
    labels = sorted(set(y))
    report = classification_report(yte, pred, labels=labels, output_dict=True, zero_division=0)
    cm = confusion_matrix(yte, pred, labels=labels).tolist()
    # learning curve: accuracy vs training-set size
    curve = []
    for frac in (0.25, 0.5, 0.75, 1.0):
        n = max(10, int(len(Xtr) * frac))
        m = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
        m.fit(Xtr[:n], ytr[:n])
        curve.append({"train_size": n, "accuracy": round(float(accuracy_score(yte, m.predict(Xte))), 4)})
    os.makedirs(a.out, exist_ok=True)
    joblib.dump(model, os.path.join(a.out, "model.pkl"))
    metrics = {"accuracy": round(float(acc), 4), "labels": labels,
               "classification_report": report, "confusion_matrix": cm,
               "learning_curve": curve, "n_train": len(Xtr), "n_test": len(Xte),
               "model": "LogisticRegression on 280 hand-built features (baseline, NOT a frozen backbone)"}
    with open(os.path.join(a.out, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(1, 2, figsize=(10, 4))
        ax[0].plot([c["train_size"] for c in curve], [c["accuracy"] for c in curve], marker="o")
        ax[0].set_title("Learning curve"); ax[0].set_xlabel("Train size"); ax[0].set_ylabel("Accuracy")
        ax[1].imshow(cm, cmap="Blues"); ax[1].set_xticks(range(len(labels))); ax[1].set_yticks(range(len(labels)))
        ax[1].set_xticklabels(labels, rotation=20, ha="right"); ax[1].set_yticklabels(labels)
        ax[1].set_title("Confusion matrix")
        for i in range(len(labels)):
            for j in range(len(labels)):
                ax[1].text(j, i, cm[i][j], ha="center", va="center")
        fig.tight_layout(); fig.savefig(os.path.join(a.out, "training_curves.png")); plt.close(fig)
    except Exception as e:
        print("chart skipped:", e)
    print(f"accuracy={acc:.3f}  n_train={len(Xtr)} n_test={len(Xte)}")
    print("confusion matrix (rows=true, cols=pred):", labels, cm)

if __name__ == "__main__":
    main()
