/* Scrollytelling: IntersectionObserver switches the chart per step. */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const chartEl = document.getElementById("chart");
const captionEl = document.getElementById("chart-caption");
const steps = Array.from(document.querySelectorAll(".step"));
const CAPTIONS = {
  bar: "Share of global electricity by source, 2000.",
  line: "Renewable share over time — wind and solar climb while hydro stays flat.",
  area: "Stacked mix of renewables, 2000–2024.",
  trend: "Total renewable share with a dashed projection if the pace holds.",
};
function showStep(step) {
  steps.forEach(s => s.classList.remove("active"));
  step.classList.add("active");
  const view = step.dataset.view, year = parseInt(step.dataset.year, 10);
  chartEl.innerHTML = window.drawChart(view, year);
  captionEl.textContent = CAPTIONS[view] || "";
  if (reduceMotion) chartEl.style.transition = "none";
}
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) showStep(e.target); });
}, { threshold: 0.6 });
steps.forEach(s => observer.observe(s));
document.getElementById("replay").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  showStep(steps[0]);
});
showStep(steps[0]);
