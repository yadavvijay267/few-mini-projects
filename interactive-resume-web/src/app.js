// Interactive resume: timeline, animated skill bars, project filter, print-to-PDF.
const SKILLS = [
  { name: "Fiber Planning & Design", level: 90 },
  { name: "Quality Control / OTDR Review", level: 88 },
  { name: "GIS & CAD (route design)", level: 82 },
  { name: "JavaScript / HTML / CSS", level: 85 },
  { name: "Python Automation", level: 75 },
  { name: "Three.js / GSAP", level: 65 },
];
const PROJECTS = [
  { title: "Kanban Task Board", tags: ["fiber", "web"], desc: "Drag-and-drop board with WIP limits for field work tracking." },
  { title: "Fiber QC Checklist App", tags: ["qc", "fiber"], desc: "Digital QC checklist with OTDR thresholds and sign-offs." },
  { title: "Sales Analytics Dashboard", tags: ["data", "web"], desc: "Interactive KPI dashboard with filters and CSV export." },
  { title: "3D Solar System", tags: ["web"], desc: "Three.js orbit visualiser with a size-comparison mode." },
  { title: "Excel Report Generator", tags: ["data"], desc: "Python tool turning CSVs into styled workbooks with QC checks." },
  { title: "Admin Dashboard UI Kit", tags: ["web"], desc: "Reusable dashboard shell with theme tokens and role menus." },
];
const skillsEl = document.getElementById("skills");
SKILLS.forEach(s => {
  const d = document.createElement("div"); d.className = "skill";
  d.innerHTML = `<div class="row"><span>${s.name}</span><span>${s.level}%</span></div><div class="bar"><i style="--w:${s.level}%"></i></div>`;
  skillsEl.appendChild(d);
});
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.querySelector(".bar i").style.width = e.target.querySelector(".bar i").style.getPropertyValue("--w"); io.unobserve(e.target); }
}), { threshold: 0.4 });
document.querySelectorAll(".skill").forEach(el => io.observe(el));
function renderProjects(filter) {
  const box = document.getElementById("projects"); box.innerHTML = "";
  PROJECTS.filter(p => filter === "all" || p.tags.includes(filter)).forEach(p => {
    const el = document.createElement("article"); el.className = "proj";
    el.innerHTML = `<h3>${p.title}</h3><p>${p.desc}</p><span class="tags">${p.tags.join(" · ")}</span>`;
    box.appendChild(el);
  });
  if (!box.children.length) box.innerHTML = "<p>No projects in this category yet.</p>";
}
document.querySelectorAll(".filters button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".filters button").forEach(x => x.classList.remove("active"));
  b.classList.add("active"); renderProjects(b.dataset.f);
});
document.querySelectorAll(".role").forEach(r => {
  const toggle = () => r.querySelector(".role-body").classList.toggle("hidden");
  r.querySelector(".role-head").onclick = toggle;
  r.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
});
document.getElementById("printBtn").onclick = () => window.print();
document.getElementById("themeBtn").onclick = e => { document.body.classList.toggle("dark"); e.currentTarget.textContent = document.body.classList.contains("dark") ? "☀️ Light" : "🌙 Dark"; };
renderProjects("all");
