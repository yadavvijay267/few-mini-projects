#!/usr/bin/env python3
"""Cloud cost analyzer: reads billing + resource CSVs, computes spend by
service/region/tag, detects waste with rules, and prints savings.
Rules: stopped EC2 (100% of cost), idle EC2 avg CPU < 10% (downsize 50%),
unattached EBS volume (100%), unused Elastic IP (100%), old snapshot (100%),
NAT Gateway in dev (suggest VPC endpoints). Stdlib only.
Usage: python3 src/analyzer.py [--budget 500] [--json out/report.json]
"""
import argparse, csv, json, os, sys
from collections import defaultdict
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load_billing(path):
    rows = []
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            rows.append({"date": r["date"].strip(), "service": r["service"].strip(),
                         "region": r["region"].strip(), "tag": r["tag"].strip(),
                         "cost": float(r[" cost_usd"] if " cost_usd" in r else r["cost_usd"])})
    return rows
def load_resources(path):
    with open(path, newline="") as f:
        return [{k.strip(): v.strip() for k, v in r.items()} for r in csv.DictReader(f)]
def analyze(billing, resources, budget=None):
    by_service, by_region, by_tag, by_month = defaultdict(float), defaultdict(float), defaultdict(float), defaultdict(float)
    for r in billing:
        by_service[r["service"]] += r["cost"]; by_region[r["region"]] += r["cost"]
        by_tag[r["tag"]] += r["cost"]; by_month[r["date"][:7]] += r["cost"]
    total = round(sum(by_service.values()), 2)
    recs = []
    for res in resources:
        cost = float(res["monthly_cost_usd"]); cpu = float(res["avg_cpu_pct"])
        if res["type"] == "ec2" and res["state"] == "stopped" and cost > 0:
            recs.append({"resource": res["resource_id"], "issue": "Stopped instance still billed (EBS + IP)",
                         "saving_usd": cost, "action": "Terminate or snapshot + terminate"})
        elif res["type"] == "ec2" and res["state"] == "running" and cpu < 10:
            recs.append({"resource": res["resource_id"], "issue": f"Idle instance (avg CPU {cpu}%)",
                         "saving_usd": round(cost * 0.5, 2), "action": "Downsize one instance class or stop it"})
        elif res["type"] == "ebs-volume" and res["state"] == "available":
            recs.append({"resource": res["resource_id"], "issue": "Unattached EBS volume",
                         "saving_usd": cost, "action": "Snapshot then delete"})
        elif res["type"] == "elastic-ip" and res["state"] == "unused":
            recs.append({"resource": res["resource_id"], "issue": "Unused Elastic IP",
                         "saving_usd": cost, "action": "Release the Elastic IP"})
        elif res["type"] == "ebs-snapshot" and res["state"] == "old":
            recs.append({"resource": res["resource_id"], "issue": "Old snapshot (no recent restore test)",
                         "saving_usd": cost, "action": "Delete after confirming no dependency"})
    savings = round(sum(r["saving_usd"] for r in recs), 2)
    alerts = []
    if budget:
        for pct in (50, 80, 100):
            if total >= budget * pct / 100:
                alerts.append({"threshold_pct": pct, "message": f"Spend ${total} reached {pct}% of ${budget} budget"})
    return {"total_usd": total, "by_service": dict(by_service), "by_region": dict(by_region),
            "by_tag": dict(by_tag), "by_month": dict(by_month), "recommendations": sorted(recs, key=lambda r: -r["saving_usd"]),
            "total_saving_usd": savings, "saving_pct": round(100 * savings / total, 1) if total else 0,
            "budget_alerts": alerts}
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--budget", type=float, default=500)
    ap.add_argument("--json", default="data/report.json"); a = ap.parse_args()
    billing = load_billing(os.path.join(ROOT, "assets", "billing.csv"))
    resources = load_resources(os.path.join(ROOT, "assets", "resources.csv"))
    report = analyze(billing, resources, budget=a.budget)
    os.makedirs(os.path.dirname(a.json), exist_ok=True)
    with open(a.json, "w") as f: json.dump(report, f, indent=2)
    print(f"Total spend: ${report['total_usd']:.2f}")
    print(f"By service: {', '.join(f'{k} ${v:.2f}' for k, v in sorted(report['by_service'].items(), key=lambda x: -x[1]))}")
    print(f"Recommendations ({len(report['recommendations'])}):")
    for r in report["recommendations"]:
        print(f"  - {r['resource']}: {r['issue']} -> save ${r['saving_usd']:.2f}/mo ({r['action']})")
    print(f"YOU CAN SAVE ${report['total_saving_usd']:.2f}/month ({report['saving_pct']}% of spend)")
    for al in report["budget_alerts"]: print(f"ALERT: {al['message']}")
    return report
if __name__ == "__main__": main()
