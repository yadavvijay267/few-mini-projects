#!/usr/bin/env python3
"""Log shipper/parser: reads Nginx combined + JSON logs, normalises them to
JSONL records (ts, level, service, method, path, status, latency_ms, raw),
writes data/parsed.jsonl, and prints a summary. Stdlib only.
Usage: python3 src/shipper.py [--in assets/sample.log] [--out data/parsed.jsonl]
"""
import argparse, json, os, re
NGINX_RE = re.compile(r'^(\S+) - - \[(?P<ts>[^\]]+)\] "(?P<method>\w+) (?P<path>\S+) [^"]*" (?P<status>\d{3}) (?P<bytes>\d+) "[^"]*" "[^"]*" (?P<latency>\d+)')
def level_for(status):
    return "ERROR" if status >= 500 else ("WARN" if status >= 400 else "INFO")
def parse_line(line):
    line = line.strip()
    if not line: return None
    if line.startswith("{"):
        try:
            d = json.loads(line)
            return {"ts": d.get("ts", ""), "level": d.get("level", "INFO"), "service": d.get("service", "app"),
                    "method": "GET", "path": d.get("msg", ""), "status": int(d.get("status", 200)),
                    "latency_ms": int(d.get("latency_ms", 0)), "raw": line}
        except json.JSONDecodeError: return None
    m = NGINX_RE.match(line)
    if not m: return None
    return {"ts": m.group("ts"), "level": level_for(int(m.group("status"))), "service": "web",
            "method": m.group("method"), "path": m.group("path"),
            "status": int(m.group("status")), "latency_ms": int(m.group("latency")), "raw": line}
def ship(in_path, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    parsed, skipped = [], 0
    with open(in_path) as f:
        for line in f:
            rec = parse_line(line)
            if rec: parsed.append(rec)
            else: skipped += 1
    with open(out_path, "w") as f:
        for r in parsed: f.write(json.dumps(r) + "\n")
    errors = sum(1 for r in parsed if r["status"] >= 500)
    print(f"parsed {len(parsed)} records, skipped {skipped}; errors={errors} "
          f"({100*errors/max(len(parsed),1):.1f}% error rate)")
    return parsed
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--in", dest="inp", default="assets/sample.log")
    ap.add_argument("--out", default="data/parsed.jsonl"); a = ap.parse_args()
    ship(a.inp, a.out)
