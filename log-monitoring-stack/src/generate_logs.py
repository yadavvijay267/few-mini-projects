#!/usr/bin/env python3
"""Generate realistic sample logs (Nginx combined + JSON app logs)."""
import argparse, json, random
from datetime import datetime, timedelta
random.seed(42)
PATHS = ["/", "/api/users", "/api/orders", "/api/products", "/login", "/checkout", "/health"]
SERVICES = ["web", "api", "worker"]
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--lines", type=int, default=500)
    ap.add_argument("--out", default="assets/sample.log"); a = ap.parse_args()
    now = datetime.now(); lines = []
    for i in range(a.lines):
        t = now - timedelta(seconds=(a.lines - i) * 2)
        ts = t.strftime("%d/%b/%Y:%H:%M:%S +0000")
        # plant an incident: minutes 5-8 of the stream are 500-heavy
        incident = 120 < i < 200
        status = random.choices([200, 200, 200, 201, 404, 500, 502],
                                weights=[70, 10, 5, 3, 4, 6 if incident else 1, 3 if incident else 1])[0]
        latency = random.randint(20, 120) if status < 400 else random.randint(400, 1800)
        ip = f"10.0.{random.randint(0,3)}.{random.randint(2,250)}"
        lines.append(f'{ip} - - [{ts}] "GET {random.choice(PATHS)} HTTP/1.1" {status} {random.randint(200,9000)} "-" "curl/8.0" {latency}')
        if i % 3 == 0:
            level = "ERROR" if status >= 500 else ("WARN" if status == 404 else "INFO")
            lines.append(json.dumps({"ts": t.isoformat(), "level": level, "service": random.choice(SERVICES),
                                     "msg": f"request {random.choice(PATHS)} -> {status}", "latency_ms": latency, "status": status}))
    with open(a.out, "w") as f: f.write("\n".join(lines) + "\n")
    print(f"wrote {len(lines)} lines to {a.out}")
if __name__ == "__main__": main()
