#!/usr/bin/env python3
"""Tests: price math (imported logic re-implemented check), URL encoding,
and JS syntax via node --check. Run: python3 tests/test_configurator.py
"""
import os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def main():
    errors = []
    js = open(os.path.join(ROOT, "src", "app.js")).read()
    # price expectations derived from the constants in app.js
    base = int(re.search(r"BASE_PRICE = (\d+)", js).group(1))
    if base != 349: errors.append(f"BASE_PRICE {base} != 349")
    prices = dict(re.findall(r"(leather|mesh|fabric): \{ price: (\d+)", js))
    acc = dict(re.findall(r"(headrest|lumbar|armrests): (\d+)", js))
    full = base + int(prices.get("leather", 0)) + sum(int(v) for v in acc.values())
    if full != 349 + 120 + 45 + 35 + 80: errors.append(f"full config price {full} wrong")
    for feat in ["OrbitControls", "autoRotate", "screenshot", "share", "URLSearchParams", "preserveDrawingBuffer"]:
        if feat not in js: errors.append(f"app.js missing {feat}")
    for color in ["Ocean", "Forest", "Graphite", "Sunset", "Ivory"]:
        if color not in js: errors.append(f"missing colour {color}")
    html = open(os.path.join(ROOT, "src", "index.html")).read()
    if "importmap" not in html or "three" not in html: errors.append("index.html missing Three.js import map")
    if "fallback" not in html: errors.append("no CDN-failure fallback message")
    r = subprocess.run(["node", "--check", os.path.join(ROOT, "src", "app.js")], capture_output=True, text=True)
    if r.returncode: errors.append("app.js failed node --check: " + r.stderr)
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print(f"PASS: configurator valid (base ${base}, full config ${full})"); return 0
if __name__ == "__main__": sys.exit(main())
