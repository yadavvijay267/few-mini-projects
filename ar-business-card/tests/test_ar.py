#!/usr/bin/env python3
"""Tests: AR scene markup (marker, entities, buttons), preview fallback,
marker asset, JS syntax. Run: python3 tests/test_ar.py
"""
import os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def main():
    errors = []
    html = open(os.path.join(ROOT, "src", "index.html")).read()
    for feat in ["a-scene", "a-marker", 'preset="hiro"', "aframe-ar", "btn-web", "btn-mail", "btn-preview", "startPreview"]:
        if feat not in html and feat not in open(os.path.join(ROOT, "src", "app.js")).read():
            errors.append(f"missing {feat}")
    if "arjs=" not in html: errors.append("scene missing arjs attribute")
    if "https:" not in open(os.path.join(ROOT, "src", "app.js")).read():
        errors.append("no HTTPS check before camera start")
    marker = open(os.path.join(ROOT, "assets", "marker.html")).read()
    if "hiro" not in marker.lower(): errors.append("marker asset does not reference the Hiro marker")
    js = open(os.path.join(ROOT, "src", "app.js")).read()
    if "THREE.WebGLRenderer" not in js: errors.append("preview is not a real Three.js scene")
    r = subprocess.run(["node", "--check", os.path.join(ROOT, "src", "app.js")], capture_output=True, text=True)
    if r.returncode: errors.append("app.js failed node --check: " + r.stderr)
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print("PASS: AR business card valid (marker + AR scene + 3D preview fallback)"); return 0
if __name__ == "__main__": sys.exit(main())
