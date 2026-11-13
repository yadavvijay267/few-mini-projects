// Log dashboard: loads sample logs (embedded fallback), filters, computes stats.
let records = [];
const $ = (id) => document.getElementById(id);
function percentile(sorted, p) { if (!sorted.length) return 0; return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]; }
function render() {
  const q = $("q").value.toLowerCase(), level = $("level").value, svc = $("service").value;
  const rows = records.filter((r) => (!level || r.level === level) && (!svc || r.service === svc)
    && (!q || (r.path + " " + r.status + " " + (r.raw || "")).toLowerCase().includes(q)));
  const lats = rows.map((r) => r.latency_ms).sort((a, b) => a - b);
  const errs = rows.filter((r) => r.status >= 500).length;
  $("stat-total").textContent = rows.length;
  $("stat-errors").textContent = rows.length ? (100 * errs / rows.length).toFixed(1) + "%" : "–";
  $("stat-p50").textContent = rows.length ? percentile(lats, 0.5) + " ms" : "–";
  $("stat-p95").textContent = rows.length ? percentile(lats, 0.95) + " ms" : "–";
  const rate = rows.length ? errs / rows.length : 0;
  const p95 = percentile(lats, 0.95);
  const alerts = [];
  if (rate > 0.01) alerts.push({ name: "HighErrorRate", text: "Error rate above 1% for 5 min — see runbook: High error rate." });
  if (p95 > 500) alerts.push({ name: "HighLatency", text: "p95 latency above 500 ms for 5 min — see runbook: High latency." });
  $("stat-alerts").textContent = alerts.length;
  $("alerts").innerHTML = alerts.map((a) => `<div class="alertbox"><strong>${a.name}</strong> — ${a.text} <a href="../docs/RUNBOOK.md" target="_blank">Runbook</a></div>`).join("");
  $("rows").innerHTML = rows.slice(0, 200).map((r) => `<tr><td><span class="badge ${r.level}">${r.level}</span></td><td>${r.service}</td><td>${r.path}</td><td>${r.status}</td><td>${r.latency_ms} ms</td></tr>`).join("")
    || `<tr><td colspan="5">No logs match the filters.</td></tr>`;
}
async function loadSample() {
  try {
    const res = await fetch("../data/parsed.jsonl");
    if (!res.ok) throw new Error("no parsed data");
    records = (await res.text()).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch (e) { records = sampleFallback(); }
  render();
}
function sampleFallback() { // embedded demo data so the dashboard works standalone
  const out = []; const paths = ["/", "/api/users", "/api/orders", "/checkout"];
  for (let i = 0; i < 120; i++) { const s = i > 60 && i < 90 ? 500 : 200;
    out.push({ level: s >= 500 ? "ERROR" : "INFO", service: ["web", "api"][i % 2], path: paths[i % 4], status: s, latency_ms: s >= 500 ? 900 : 60 + (i % 40), raw: "" }); }
  return out;
}
$("q").addEventListener("input", render); $("level").addEventListener("change", render);
$("service").addEventListener("change", render); $("load-sample").addEventListener("click", loadSample);
$("file").addEventListener("change", async (e) => { const t = await e.target.files[0].text();
  records = t.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)); render(); });
loadSample();
