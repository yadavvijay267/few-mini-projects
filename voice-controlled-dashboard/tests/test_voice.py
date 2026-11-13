#!/usr/bin/env python3
"""Tests: command matching + did-you-mean logic (mirrors app.js rules),
dashboard markup, JS syntax. Run: python3 tests/test_voice.py
"""
import os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Mirror of the JS command table, for cross-checking behaviour in Python.
CASES = [("show sales", "sales"), ("Show Users please", "users"), ("SHOW REVENUE", "revenue"),
         ("next panel", "next"), ("previous slide", "prev"), ("dark mode", "dark"),
         ("light mode", "light"), ("read values", "read"), ("stop listening", "stop")]
def main():
    errors = []
    js = open(os.path.join(ROOT, "src", "app.js")).read()
    html = open(os.path.join(ROOT, "src", "index.html")).read()
    # every expected phrase must appear as a pattern in the JS
    for phrase, _ in CASES:
        key = phrase.lower().split()[0] if phrase.lower() not in ("dark mode", "light mode") else phrase.lower()
        if key not in js.lower(): errors.append(f"JS missing command pattern for '{phrase}'")
    if "matchCommand" not in js or "didYouMean" not in js: errors.append("pure command functions missing")
    if "SpeechRecognition" not in js or "webkitSpeechRecognition" not in js: errors.append("no SpeechRecognition setup")
    if "speechSynthesis" not in js: errors.append("no read-aloud (speechSynthesis)")
    if "transcript" not in js or "confidence" not in js: errors.append("no transcript/confidence panel")
    for feat in ["typed-form", "show sales", "dark mode", "read values", "v-sales", "v-users", "v-revenue"]:
        if feat not in html: errors.append(f"index.html missing {feat}")
    if "NOT available" not in html and "NOT available" not in js: errors.append("no unsupported-browser message")
    # run the real JS logic in Node: extract the pure command functions from
    # app.js in Python (everything before the DOM section) and test them
    app_js = open(os.path.join(ROOT, "src", "app.js")).read()
    pure = app_js.split("const $ =")[0]
    harness = pure + """
const cases = [["show sales","sales"],["Show Users please","users"],["SHOW REVENUE","revenue"],
["next panel","next"],["previous slide","prev"],["dark mode","dark"],["light mode","light"],
["read values","read"],["stop listening","stop"],["open the pod bay doors",null]];
let fail = 0;
for (const [text, want] of cases) {
  const got = matchCommand(text);
  const kind = got ? (got.panel || (got.dark===true?"dark":got.dark===false?"light":got.type)) : null;
  if (kind !== want) { console.error("mismatch", text, "got", kind, "want", want); fail++; }
}
if (didYouMean("show sail") !== "show sales") { console.error("didYouMean failed"); fail++; }
if (didYouMean("xyzzy") !== null) { console.error("didYouMean should be null"); fail++; }
process.exit(fail ? 1 : 0);
"""
    hp = os.path.join(ROOT, "tests", "harness.cjs")
    with open(hp, "w") as f: f.write(harness)
    r = subprocess.run(["node", hp], capture_output=True, text=True)
    if r.returncode: errors.append("JS command-logic harness failed: " + r.stderr + r.stdout)
    os.remove(hp)
    r2 = subprocess.run(["node", "--check", os.path.join(ROOT, "src", "app.js")], capture_output=True, text=True)
    if r2.returncode: errors.append("app.js failed node --check: " + r2.stderr)
    if errors:
        print("FAIL:"); [print(" -", e) for e in errors]; return 1
    print(f"PASS: voice dashboard valid ({len(CASES)} commands matched, did-you-mean works)"); return 0
if __name__ == "__main__": sys.exit(main())
