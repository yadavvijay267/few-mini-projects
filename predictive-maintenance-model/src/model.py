"""Predictive maintenance: RUL estimation from sensor history.

Demo model (stdlib only): per-machine linear trend of a degradation score
(vibration + temperature) vs cycles; RUL = cycles until the score crosses
the failure threshold. The same interface fits a scikit-learn Random
Forest trained on NASA C-MAPSS — see docs/USAGE.md.
"""
import argparse, csv, json, math, os

FAILURE_SCORE = 200.0


def load_history(path):
    rows = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            rows.append({k: (float(v) if k != "machine" else v)
                         for k, v in row.items()})
    return rows


def degradation(row):
    return row["vibration"] * 8.0 + row["temperature"] * 1.5 + row["cycles"] * 0.05


def _linfit(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    den = sum((x - mx) ** 2 for x in xs) or 1.0
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den
    return slope, my - slope * mx


def _corr(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = math.sqrt(sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) or 1.0
    return num / den


def train(rows):
    """Fit one trend per machine. Returns {machine: {slope, intercept, last_cycle, last_score}}."""
    by_machine = {}
    for r in rows:
        by_machine.setdefault(r["machine"], []).append(r)
    model = {}
    for machine, rs in by_machine.items():
        rs = sorted(rs, key=lambda r: r["cycles"])
        xs = [r["cycles"] for r in rs]
        ys = [degradation(r) for r in rs]
        slope, intercept = _linfit(xs, ys)
        model[machine] = {"slope": slope, "intercept": intercept,
                          "last_cycle": xs[-1], "last_score": ys[-1],
                          "n": len(rs)}
    return model


def rul(model, machine):
    """Remaining useful life in cycles (0 if already at threshold)."""
    m = model[machine]
    if m["slope"] <= 0:
        return float("inf")
    cross = (FAILURE_SCORE - m["intercept"]) / m["slope"]
    return max(0.0, cross - m["last_cycle"])


def failure_probability(model, machine):
    r = rul(model, machine)
    if r == float("inf"):
        return 0.0
    return round(1.0 / (1.0 + r / 25.0), 3)


def feature_importance(rows):
    """Correlation of each sensor with remaining life (proxy: -cycles)."""
    out = {}
    for col in ("vibration", "temperature", "runtime_h"):
        out[col] = round(_corr([r[col] for r in rows], [-r["cycles"] for r in rows]), 3)
    return dict(sorted(out.items(), key=lambda kv: -abs(kv[1])))


def alerts(model):
    ranked = sorted(model, key=lambda m: failure_probability(model, m), reverse=True)
    return [{"machine": m, "rul_cycles": round(rul(model, m), 1),
             "failure_probability": failure_probability(model, m)} for m in ranked]


def main(argv=None):
    p = argparse.ArgumentParser(description="Predictive maintenance model")
    p.add_argument("--demo", action="store_true")
    p.add_argument("--alerts", action="store_true")
    p.add_argument("--data", default=os.path.join(os.path.dirname(__file__), "..", "assets", "sensor_history.csv"))
    args = p.parse_args(argv)
    rows = load_history(args.data)
    model = train(rows)
    if args.alerts or args.demo:
        print("feature importance:", json.dumps(feature_importance(rows)))
        for a in alerts(model):
            print(a)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
