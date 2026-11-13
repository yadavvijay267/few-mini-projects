// Kanban board: HTML5 drag & drop, WIP limits, labels, due dates, checklists, persistence.
const COLUMNS = [
  { id: "backlog", title: "Backlog", wip: 0 },
  { id: "progress", title: "In Progress", wip: 3 },
  { id: "review", title: "Review", wip: 2 },
  { id: "done", title: "Done", wip: 0 },
];
const LABELS = ["Design", "QC", "Dev", "Docs", "Ops"];
const KEY = "kanban-board-v1";
const seed = () => [
  { id: "c1", col: "backlog", title: "Draft fiber route map for Sector 62", desc: "Update the GIS route with the new duct path.", label: "Design", assignee: "Clamor", due: "2026-11-20", checks: [{ t: "Collect site survey", done: true }, { t: "Redraw duct path", done: false }] },
  { id: "c2", col: "progress", title: "QC check: splice loss report", desc: "Verify OTDR traces against the 0.05 dB budget.", label: "QC", assignee: "Clamor", due: "2026-11-13", checks: [{ t: "Pull OTDR traces", done: true }, { t: "Flag out-of-spec splices", done: false }] },
  { id: "c3", col: "progress", title: "Update as-built drawings", desc: "Mark completed closures on the as-built set.", label: "Docs", assignee: "Clamor", due: "2026-11-18", checks: [] },
  { id: "c4", col: "review", title: "Cable tray layout sign-off", desc: "Send layout to the site lead for approval.", label: "Design", assignee: "Clamor", due: "2026-11-12", checks: [{ t: "Peer review", done: true }] },
  { id: "c5", col: "done", title: "Label patch panel ports", desc: "All 48 ports labelled and photographed.", label: "Ops", assignee: "Clamor", due: "2026-11-05", checks: [{ t: "Label ports", done: true }] },
];
let cards = load();
let dragId = null;
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s) && s.length) return s; } catch (e) {} return seed(); }
function save() { localStorage.setItem(KEY, JSON.stringify(cards)); }
const board = document.getElementById("board");
const searchEl = document.getElementById("search");
const labelFilter = document.getElementById("labelFilter");
LABELS.forEach(l => { const o = document.createElement("option"); o.textContent = l; labelFilter.appendChild(o); });
function isOverdue(c) { return c.due && c.col !== "done" && new Date(c.due) < new Date(new Date().toDateString()); }
function render() {
  board.innerHTML = "";
  const q = searchEl.value.trim().toLowerCase(), lf = labelFilter.value;
  COLUMNS.forEach(col => {
    const list = cards.filter(c => c.col === col.id && (!q || (c.title + " " + c.desc + " " + c.assignee + " " + c.label).toLowerCase().includes(q)) && (!lf || c.label === lf));
    const total = cards.filter(c => c.col === col.id).length;
    const over = col.wip > 0 && total > col.wip;
    const sec = document.createElement("section");
    sec.className = "column"; sec.dataset.col = col.id;
    sec.innerHTML = `<div class="col-head"><h2>${col.title}</h2><span class="wip${over ? " over" : ""}">${total}${col.wip ? " / " + col.wip + " WIP" : ""}${over ? " — WIP limit exceeded!" : ""}</span></div>`;
    list.forEach(c => sec.appendChild(cardEl(c)));
    sec.addEventListener("dragover", e => { e.preventDefault(); sec.classList.add("over"); });
    sec.addEventListener("dragleave", () => sec.classList.remove("over"));
    sec.addEventListener("drop", e => {
      e.preventDefault(); sec.classList.remove("over");
      const card = cards.find(x => x.id === dragId); if (!card) return;
      const target = col.id;
      const count = cards.filter(x => x.col === target && x.id !== dragId).length;
      const lim = COLUMNS.find(x => x.id === target).wip;
      if (lim && count >= lim && card.col !== target) alert(`WIP limit: "${col.title}" allows max ${lim} cards. Move anyway? — limit is a warning, card moved.`);
      card.col = target; save(); render();
    });
    board.appendChild(sec);
  });
}
function cardEl(c) {
  const el = document.createElement("article");
  el.className = "card"; el.draggable = true; el.dataset.id = c.id;
  const done = c.checks.filter(x => x.done).length;
  el.innerHTML = `<button class="del" title="Delete card" aria-label="Delete ${c.title}">&times;</button>
    <h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.desc)}</p>
    <div class="meta"><span class="tag">${c.label}</span><span>${escapeHtml(c.assignee || "")}</span>
    ${c.due ? `<span class="due${isOverdue(c) ? " overdue" : ""}">Due ${c.due}${isOverdue(c) ? " — overdue" : ""}</span>` : ""}</div>
    ${c.checks.length ? `<div class="checks">${done}/${c.checks.length} checklist done</div>` : ""}`;
  el.querySelector(".del").onclick = () => { if (confirm("Delete this card?")) { cards = cards.filter(x => x.id !== c.id); save(); render(); } };
  el.addEventListener("click", e => { if (e.target.classList.contains("del")) return; toggleCheck(c); });
  el.addEventListener("dragstart", () => { dragId = c.id; el.classList.add("dragging"); });
  el.addEventListener("dragend", () => { el.classList.remove("dragging"); dragId = null; });
  return el;
}
function toggleCheck(c) {
  const next = c.checks.find(x => !x.done);
  if (!next) { alert("Checklist: " + (c.checks.length ? c.checks.map(x => (x.done ? "✓ " : "☐ ") + x.t).join("\n") : "No checklist items on this card.")); return; }
  next.done = true; save(); render();
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
const modal = document.getElementById("modal");
document.getElementById("addBtn").onclick = () => { modal.classList.remove("hidden"); };
document.getElementById("cancelBtn").onclick = () => modal.classList.add("hidden");
document.getElementById("cardForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  cards.push({ id: "c" + Date.now(), col: "backlog", title: f.get("title"), desc: f.get("desc") || "", label: f.get("label"), assignee: f.get("assignee") || "", due: f.get("due") || "", checks: (f.get("checklist") || "").split("\n").map(s => s.trim()).filter(Boolean).map(t => ({ t, done: false })) });
  save(); render(); modal.classList.add("hidden"); e.target.reset();
});
document.getElementById("resetBtn").onclick = () => { if (confirm("Reset to demo data?")) { cards = seed(); save(); render(); } };
searchEl.addEventListener("input", render);
labelFilter.addEventListener("change", render);
render();
