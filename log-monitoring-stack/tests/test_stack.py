#!/usr/bin/env python3
"""Tests: shipper parses both log formats, stats math is right, alert rules
and compose file are valid YAML. Run: python3 tests/test_stack.py
"""
import json, os, subprocess, sys
try: import yaml
except ImportError: yaml = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
import shipper
def main():
    errors = []
    # parser unit tests
    rec = shipper.parse_line('10.0.0.1 - - [12/Nov/2026:10:00:00 +0000] "GET /api/users HTTP/1.1" 500 123 "-" "curl" 900')
    assert rec and rec["status"] == 500 and rec["level"] == "ERROR" and rec["latency_ms"] == 900, rec
    rec2 = shipper.parse_line(json.dumps({"ts": "2026-11-12T10:00:00", "level": "WARN", "service": "api", "msg": "/x", "latency_ms": 42, "status": 404}))
    assert rec2 and rec2["service"] == "api" and rec2["status"] == 404
    assert shipper.parse_line("garbage line") is None
    assert shipper.parse_line("") is None
    # end-to-end: generate + ship
    subprocess.run([sys.executable, os.path.join(ROOT, "src", "generate_logs.py"), "--lines", "100",
                    "--out", os.path.join(ROOT, "assets", "sample.log")], check=True, cwd=ROOT)
    parsed = shipper.ship(os.path.join(ROOT, "assets", "sample.log"), os.path.join(ROOT, "data", "parsed.jsonl"))
    if len(parsed) < 90: errors.append(f"too few parsed records: {len(parsed)}")
    if not any(r["status"] >= 500 for r in parsed): errors.append("no error records in sample (incident missing)")
    if yaml:
        alerts = yaml.safe_load(open(os.path.join(ROOT, "src", "alerts.yaml")))
        if len(alerts["groups"][0]["rules"]) < 3: errors.append("fewer than 3 alert rules")
        if not all("runbook_url" in r.get("annotations", {}) for r in alerts["groups"][0]["rules"]):
            errors.append("an alert rule lacks a runbook_url")
        compose = yaml.safe_load(open(os.path.join(ROOT, "docker-compose.yml")))
        for svc in ["loki", "promtail", "prometheus", "grafana"]:
            if svc not in compose["services"]: errors.append(f"compose missing {svc}")
    else: print("PyYAML missing — YAML checks skipped")
    r = subprocess.run(["node", "--check", os.path.join(ROOT, "src", "dashboard", "app.js")], capture_output=True, text=True)
    if r.returncode: errors.append("dashboard app.js failed node --check: " + r.stderr)
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print(f"PASS: log stack valid ({len(parsed)} records parsed)"); return 0
if __name__ == "__main__": sys.exit(main())
