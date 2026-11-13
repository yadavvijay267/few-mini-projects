"""Predict the class of one image. Usage: python3 src/predict.py --image <png> [--top 3]"""
import argparse, json, os
import joblib
from features import extract_features

CLASSES = ["cable_defect", "cable_ok", "connector"]

def main():
    ap = argparse.ArgumentParser(description="Classify an image with the trained baseline model.")
    ap.add_argument("--image", required=True, help="Path to a PNG/JPG image")
    ap.add_argument("--top", type=int, default=3, help="How many top predictions to show")
    ap.add_argument("--model", default=os.path.join(os.path.dirname(__file__), "..", "models", "model.pkl"))
    a = ap.parse_args()
    if not os.path.exists(a.model):
        print("Model not found. Train first: python3 src/train.py"); raise SystemExit(1)
    model = joblib.load(a.model)
    feats = extract_features(a.image).reshape(1, -1)
    proba = model.predict_proba(feats)[0]
    classes = list(model.classes_) if hasattr(model, "classes_") else CLASSES
    ranked = sorted(zip(classes, proba), key=lambda t: -t[1])[: a.top]
    print(json.dumps([{"label": k, "confidence": round(float(v), 4)} for k, v in ranked], indent=2))

if __name__ == "__main__":
    main()
