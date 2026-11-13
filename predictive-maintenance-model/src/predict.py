"""Predict failure risk for one reading, or rank all machines by risk.
Usage: python3 src/predict.py --vibration 4.2 --temperature 82 --runtime 1200 --load 0.9 [--cycles 500]
       python3 src/predict.py --alerts [--top 10]"""
import argparse, json, os
import joblib
import pandas as pd

FEATURES = ["vibration", "temperature", "runtime_hours", "load", "cycles_since_service"]

def rul_days(failure_prob):
    return int(round((1 - failure_prob) * 180))

def main():
    ap = argparse.ArgumentParser(description="Predict equipment failure risk.")
    ap.add_argument("--vibration", type=float, help="Vibration in mm/s")
    ap.add_argument("--temperature", type=float, help="Temperature in C")
    ap.add_argument("--runtime", type=float, default=500, help="Runtime hours")
    ap.add_argument("--load", type=float, default=0.7, help="Load factor 0-1")
    ap.add_argument("--cycles", type=int, default=300, help="Cycles since service")
    ap.add_argument("--alerts", action="store_true", help="Rank all machines in the dataset by failure risk")
    ap.add_argument("--top", type=int, default=10)
    ap.add_argument("--model", default=os.path.join(os.path.dirname(__file__), "..", "models", "model.pkl"))
    ap.add_argument("--data", default=os.path.join(os.path.dirname(__file__), "..", "assets", "sensor_data.csv"))
    a = ap.parse_args()
    if not os.path.exists(a.model):
        print("Model not found. Train first: python3 src/train.py"); raise SystemExit(1)
    model = joblib.load(a.model)
    if a.alerts:
        df = pd.read_csv(a.data)
        latest = df.sort_values("runtime_hours").groupby("machine_id").tail(1)
        latest = latest.copy()
        latest["failure_probability"] = model.predict_proba(latest[FEATURES])[:, 1]
        latest["rul_days"] = latest["failure_probability"].apply(rul_days)
        ranked = latest.sort_values("failure_probability", ascending=False).head(a.top)
        out = [{"machine_id": r.machine_id, "failure_probability": round(float(r.failure_probability), 3),
                "rul_days_estimate": int(r.rul_days), "vibration": float(r.vibration),
                "temperature": float(r.temperature)} for r in ranked.itertuples()]
        print(json.dumps(out, indent=2)); return
    if a.vibration is None or a.temperature is None:
        ap.error("--vibration and --temperature are required (or use --alerts)")
    x = pd.DataFrame([[a.vibration, a.temperature, a.runtime, a.load, a.cycles]], columns=FEATURES)
    p = float(model.predict_proba(x)[0, 1])
    print(json.dumps({"failure_probability": round(p, 4), "predicted_failure_within_30d": bool(p >= 0.5),
                      "rul_days_estimate": rul_days(p),
                      "alert": "HIGH" if p >= 0.7 else ("WATCH" if p >= 0.4 else "OK")}, indent=2))

if __name__ == "__main__":
    main()
