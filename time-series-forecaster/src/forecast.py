"""Time-series forecaster: seasonal-naive + trend, with confidence bands,
backtesting and anomaly flags. Standard library only.
"""
import argparse, csv, json, math, os
from datetime import date, timedelta


def load_series(path):
    rows = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            y, m, d = (int(v) for v in row["date"].split("-"))
            rows.append((date(y, m, d), float(row["value"])))
    return sorted(rows)


def _linfit(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    den = sum((x - mx) ** 2 for x in xs) or 1.0
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den
    return slope, my - slope * mx


def detect_seasonality(values, max_lag=14):
    """Lag with the highest autocorrelation (1..max_lag), or 7 by default."""
    n = len(values)
    mean = sum(values) / n
    var = sum((v - mean) ** 2 for v in values) or 1.0
    best_lag, best_ac = 7, -1.0
    for lag in range(1, min(max_lag, n // 2) + 1):
        ac = sum((values[i] - mean) * (values[i - lag] - mean)
                 for i in range(lag, n)) / var
        if ac > best_ac:
            best_lag, best_ac = lag, ac
    return best_lag


def fit(series):
    values = [v for _, v in series]
    season = detect_seasonality(values)
    slope, intercept = _linfit(list(range(len(values))), values)
    residuals = []
    for i, v in enumerate(values):
        base = values[i - season] if i >= season else values[0]
        residuals.append(v - (base + slope * i))
    sd = math.sqrt(sum(r * r for r in residuals) / max(1, len(residuals))) or 1.0
    return {"season": season, "slope": slope, "intercept": intercept, "resid_sd": sd}


def forecast(series, horizon):
    model = fit(series)
    values = [v for _, v in series]
    extended = list(values)  # grows with each forecast step
    last = series[-1][0]
    out = []
    for step in range(1, horizon + 1):
        idx = len(extended)
        j = idx - model["season"]
        base = extended[j] if j >= 0 else extended[-1]
        point = base + model["slope"] * step
        band = 1.96 * model["resid_sd"]
        extended.append(point)
        out.append({"date": (last + timedelta(days=step)).isoformat(),
                    "forecast": round(point, 2),
                    "lower": round(point - band, 2),
                    "upper": round(point + band, 2)})
    return out


def backtest(series, holdout):
    train, test = series[:-holdout], series[-holdout:]
    preds = forecast(train, holdout)
    errs = [abs(p["forecast"] - v) for p, (_, v) in zip(preds, test)]
    mae = sum(errs) / len(errs)
    mape = sum(e / v for e, (_, v) in zip(errs, test) if v) / len(errs) * 100
    return {"mae": round(mae, 2), "mape_pct": round(mape, 2),
            "holdout": holdout, "season": fit(train)["season"]}


def anomalies(series):
    model = fit(series)
    values = [v for _, v in series]
    out = []
    for i, (d, v) in enumerate(series):
        base = values[i - model["season"]] if i >= model["season"] else values[0]
        pred = base + model["slope"] * i
        if abs(v - pred) > 1.96 * model["resid_sd"]:
            out.append({"date": d.isoformat(), "value": v,
                        "expected": round(pred, 2)})
    return out


def main(argv=None):
    p = argparse.ArgumentParser(description="Time-series forecaster")
    p.add_argument("--demo", action="store_true")
    p.add_argument("--data", default=os.path.join(os.path.dirname(__file__), "..", "assets", "load.csv"))
    p.add_argument("--horizon", type=int, default=7)
    p.add_argument("--backtest", type=int, default=14)
    args = p.parse_args(argv)
    series = load_series(args.data)
    print("seasonality (days):", fit(series)["season"])
    print("backtest:", json.dumps(backtest(series, args.backtest)))
    print("anomalies:", json.dumps(anomalies(series)))
    print("forecast:", json.dumps(forecast(series, args.horizon), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
