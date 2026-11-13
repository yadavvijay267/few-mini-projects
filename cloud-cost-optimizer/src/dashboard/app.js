// Renders the analyzer report (data/report.json) with Chart.js if available.
async function load() {
  let report;
  try { report = await (await fetch("../data/report.json")).json(); }
  catch (e) { report = fallback(); }
  document.getElementById("total").textContent = "$" + report.total_usd.toFixed(2);
  document.getElementById("saving").textContent = "$" + report.total_saving_usd.toFixed(2) + "/mo (" + report.saving_pct + "%)";
  document.getElementById("alerts").textContent = report.budget_alerts.length
    ? report.budget_alerts.map((a) => a.threshold_pct + "%").join(", ") : "None";
  document.getElementById("rows").innerHTML = report.recommendations.map((r) =>
    `<tr><td>${r.resource}</td><td>${r.issue}</td><td>${r.action}</td><td>$${r.saving_usd.toFixed(2)}</td></tr>`).join("");
  if (window.Chart) {
    new Chart(document.getElementById("svc"), { type: "doughnut",
      data: { labels: Object.keys(report.by_service), datasets: [{ data: Object.values(report.by_service) }] } });
    new Chart(document.getElementById("trend"), { type: "bar",
      data: { labels: Object.keys(report.by_month), datasets: [{ label: "Spend $", data: Object.values(report.by_month) }] } });
  }
}
function fallback() { return { total_usd: 1047.5, total_saving_usd: 56.95, saving_pct: 5.4, budget_alerts: [],
  by_service: { EC2: 624.6, RDS: 288.6, "NAT Gateway": 64.8, S3: 37.1, CloudFront: 18.2, Lambda: 7.5, CloudWatch: 6.7 },
  by_month: { "2026-10": 658.5, "2026-11": 389.0 },
  recommendations: [{ resource: "i-001", issue: "Idle instance (avg CPU 4%)", action: "Downsize one instance class or stop it", saving_usd: 21 },
    { resource: "i-003", issue: "Stopped instance still billed", action: "Terminate or snapshot + terminate", saving_usd: 18.5 },
    { resource: "vol-001", issue: "Unattached EBS volume", action: "Snapshot then delete", saving_usd: 9.6 },
    { resource: "eip-001", issue: "Unused Elastic IP", action: "Release the Elastic IP", saving_usd: 3.65 },
    { resource: "snap-001", issue: "Old snapshot (no recent restore test)", action: "Delete after confirming no dependency", saving_usd: 4.2 }] }; }
document.getElementById("budget").addEventListener("change", (e) => {
  const b = Number(e.target.value) || 500;
  document.getElementById("alerts").textContent = "Re-run analyzer with --budget " + b + " to refresh alerts.";
});
load();
