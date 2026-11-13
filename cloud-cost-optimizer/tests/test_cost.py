#!/usr/bin/env python3
"""Tests: billing totals, waste rules, budget alerts, dashboard JS syntax.
Run: python3 tests/test_cost.py
"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import analyzer
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def main():
    errors = []
    billing = analyzer.load_billing(os.path.join(ROOT, "assets", "billing.csv"))
    resources = analyzer.load_resources(os.path.join(ROOT, "assets", "resources.csv"))
    if len(billing) != 18: errors.append(f"expected 18 billing rows, got {len(billing)}")
    rep = analyzer.analyze(billing, resources, budget=500)
    if abs(rep["total_usd"] - 1047.50) > 0.01: errors.append(f"total {rep['total_usd']} != 1047.50")
    if rep["by_service"].get("EC2", 0) < 600: errors.append("EC2 spend looks wrong")
    ids = {r["resource"] for r in rep["recommendations"]}
    for want in ["i-001", "i-003", "vol-001", "eip-001"]:
        if want not in ids: errors.append(f"missing recommendation for {want}")
    if rep["total_saving_usd"] <= 0: errors.append("no savings found")
    # budget alerts: 1252 > 500 budget -> all three thresholds must fire
    if len(rep["budget_alerts"]) != 3: errors.append(f"expected 3 budget alerts, got {len(rep['budget_alerts'])}")
    rep2 = analyzer.analyze(billing, resources, budget=100000)
    if rep2["budget_alerts"]: errors.append("budget alerts fired with a huge budget")
    # savings must never exceed total spend
    if rep["total_saving_usd"] > rep["total_usd"]: errors.append("savings exceed total spend")
    r = subprocess.run(["node", "--check", os.path.join(ROOT, "src", "dashboard", "app.js")], capture_output=True, text=True)
    if r.returncode: errors.append("dashboard app.js failed node --check: " + r.stderr)
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print(f"PASS: cost optimizer valid (total ${rep['total_usd']}, save ${rep['total_saving_usd']}/mo)"); return 0
if __name__ == "__main__": sys.exit(main())
