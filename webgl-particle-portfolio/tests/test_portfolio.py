#!/usr/bin/env python3
"""Tests: particle logic constants, theme/reduced-motion/fallback presence,
JS syntax. Run: python3 tests/test_portfolio.py
"""
import os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def main():
    errors = []
    js = open(os.path.join(ROOT, "src", "app.js")).read()
    html = open(os.path.join(ROOT, "src", "index.html")).read()
    for feat in ["letter", "dispersed", "prefers-reduced-motion", "__setParticleColor", "ScrollTrigger", "pointermove"]:
        if feat not in js: errors.append(f"app.js missing {feat}")
    if "COUNT = 900" not in js: errors.append("particle count changed")
    for theme in ["ocean", "sunset", "forest"]:
        if theme not in js or theme not in html: errors.append(f"theme {theme} missing")
    for sec in ["about", "projects", "contact"]:
        if f'id="{sec}"' not in html: errors.append(f"section {sec} missing")
    if "fallback" not in html: errors.append("no CDN fallback element")
    r = subprocess.run(["node", "--check", os.path.join(ROOT, "src", "app.js")], capture_output=True, text=True)
    if r.returncode: errors.append("app.js failed node --check: " + r.stderr)
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print("PASS: particle portfolio valid (900 particles, 3 themes)"); return 0
if __name__ == "__main__": sys.exit(main())
