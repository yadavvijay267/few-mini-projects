// Minimal linter: no tabs, no trailing whitespace, no `console.log` left
// outside server startup lines is not enforced — this checks style basics
// plus that every JS file parses. Run: node scripts/lint.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
let errors = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); }
    else if (p.endsWith(".js")) {
      const src = fs.readFileSync(p, "utf8");
      src.split("\n").forEach((line, i) => {
        if (/\t/.test(line)) errors.push(p + ":" + (i + 1) + " tab character");
        if (/ +$/.test(line)) errors.push(p + ":" + (i + 1) + " trailing whitespace");
        if (line.length > 160) errors.push(p + ":" + (i + 1) + " line over 160 chars");
      });
      try { execSync("node --check " + JSON.stringify(p), { stdio: "pipe" }); }
      catch { errors.push(p + ": node --check failed"); }
    }
  }
}
walk(path.join(__dirname, "..", "src"));
walk(path.join(__dirname, "..", "tests"));
if (errors.length) { console.error("Lint failed:\n" + errors.join("\n")); process.exit(1); }
console.log("Lint passed: src/ and tests/ are clean.");
