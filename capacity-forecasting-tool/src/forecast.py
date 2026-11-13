#!/usr/bin/env python3
"""Capacity forecasting — OLS linear regression, run-out dates per resource."""
import argparse, csv, math, sys
from datetime import date
from calendar import monthrange

def ols(xs, ys):
    n = len(xs)
    mx = sum(xs) / n; my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    b = sxy / sxx if sxx else 0.0
    a = my - b * mx
    resid = [y - (a + b * x) for x, y in zip(xs, ys)]
    ss_res = sum(r * r for r in resid)
    ss_tot = sum((y - my) ** 2 for y in ys)
    r2 = 1 - ss_res / ss_tot if ss_tot else 1.0
    sigma = math.sqrt(ss_res / max(n - 2, 1))
    return {"intercept": a, "slope": b, "r2": r2, "sigma": sigma}

def add_months(d, months):
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, min(d.day, monthrange(y, m)[1]))

def run_out_date(months, values, capacity, growth=1.0, last_date=None):
    """Return (run_out_date, months_from_last) or (None, None) if it never runs out."""
    xs = list(range(len(values)))
    fit = ols(xs, values)
    slope = fit["slope"] * growth
    if slope <= 0:
        return None, None, fit
    t_star = (capacity - fit["intercept"]) / slope
    months_ahead = t_star - (len(values) - 1)
    if months_ahead < 0:
        return last_date, 0.0, fit  # already over capacity
    base = last_date or date.today()
    return add_months(base, math.ceil(months_ahead)), months_ahead, fit

def parse_month(s):
    y, m = s.split("-")
    return date(int(y), int(m), 1)

def main(argv=None):
    ap = argparse.ArgumentParser(description="Capacity forecasting: linear-regression run-out dates for power, space and cooling.")
    ap.add_argument("--csv", required=True, help="CSV with month,power_kw,racks,cooling_kw")
    ap.add_argument("--growth", type=float, default=1.0, help="Scenario growth multiplier (default 1.0)")
    ap.add_argument("--capacity-power", type=float, default=1000, help="Power capacity kW (default 1000)")
    ap.add_argument("--capacity-racks", type=float, default=40, help="Rack capacity (default 40)")
    ap.add_argument("--capacity-cooling", type=float, default=900, help="Cooling capacity kW (default 900)")
    a = ap.parse_args(argv)
    rows = list(csv.DictReader(open(a.csv, newline="")))
    months = [parse_month(r["month"]) for r in rows]
    last = months[-1]
    for name, key, cap in [("Power", "power_kw", a.capacity_power),
                           ("Racks", "racks", a.capacity_racks),
                           ("Cooling", "cooling_kw", a.capacity_cooling)]:
        vals = [float(r[key]) for r in rows]
        d, ahead, fit = run_out_date(months, vals, cap, growth=a.growth, last_date=last)
        unit = "kW" if "kw" in key else "racks"
        print(f"{name}: {vals[-1]:.0f} {unit} now, growing {fit['slope']*a.growth:+.1f} {unit}/month "
              f"(R2={fit['r2']:.3f}) -> runs out {d} ({ahead:.1f} months) at {cap:.0f} {unit}" if d
              else f"{name}: never runs out at current growth (slope {fit['slope']:+.2f})")
    return 0

if __name__ == "__main__":
    sys.exit(main())
