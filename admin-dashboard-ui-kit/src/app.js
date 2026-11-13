// Admin dashboard kit: theme tokens, collapsible sidebar, charts on canvas, sortable table, persisted settings, roles.
const PREFS_KEY = "admin-kit-prefs";
const prefs = Object.assign({ theme: "light", accent: "blue", collapsed: false, density: "comfortable", role: "admin" }, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"));
function savePrefs() { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
const NAV = [
  { id: "overview", label: "📊 Overview", roles: ["admin", "viewer"] },
  { id: "orders", label: "🛒 Orders", roles: ["admin", "viewer"] },
  { id: "users", label: "👥 Users", roles: ["admin"] },
  { id: "settings", label: "⚙️ Settings", roles: ["admin", "viewer"] },
];
let page = "overview", sortKey = "date", sortDir = -1;
const ORDERS = [
  { id: "ORD-1042", customer: "Asha Verma", product: "Fiber splice kit", amount: 189.00, status: "Shipped", date: "2026-11-11" },
  { id: "ORD-1041", customer: "Rohan Mehta", product: "OTDR tester", amount: 1299.00, status: "Processing", date: "2026-11-11" },
  { id: "ORD-1040", customer: "Meera Iyer", product: "Patch panel 48p", amount: 249.50, status: "Delivered", date: "2026-11-10" },
  { id: "ORD-1039", customer: "Dev Patel", product: "Cable tray 3m", amount: 89.99, status: "Delivered", date: "2026-11-09" },
  { id: "ORD-1038", customer: "Asha Verma", product: "Duct rod set", amount: 59.00, status: "Cancelled", date: "2026-11-08" },
  { id: "ORD-1037", customer: "Kabir Singh", product: "Fusion splicer", amount: 2499.00, status: "Shipped", date: "2026-11-07" },
];
const USERS = [
  { name: "Clamor", email: "admin (local account)", role: "Admin", status: "Active", joined: "2026-01-15" },
  { name: "Asha Verma", email: "asha (local account)", role: "Editor", status: "Active", joined: "2026-03-02" },
  { name: "Rohan Mehta", email: "rohan (local account)", role: "Viewer", status: "Invited", joined: "2026-10-20" },
];
function applyPrefs() {
  document.documentElement.dataset.theme = prefs.theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = prefs.theme === "dark" ? "dark" : prefs.accent === "blue" ? "light" : prefs.accent;
  if (prefs.theme === "dark") document.documentElement.dataset.theme = "dark";
  document.getElementById("sidebar").classList.toggle("collapsed", prefs.collapsed);
  document.getElementById("themeBtn").textContent = prefs.theme === "dark" ? "☀️ Light" : "🌙 Dark";
  document.getElementById("role").value = prefs.role;
  document.getElementById("roleLabel").textContent = prefs.role === "admin" ? "Admin" : "Viewer";
  savePrefs();
}
function renderNav() {
  const nav = document.getElementById("nav"); nav.innerHTML = "";
  NAV.filter(n => n.roles.includes(prefs.role)).forEach(n => {
    const b = document.createElement("button");
    b.innerHTML = `<span>${n.label}</span>`; b.classList.toggle("active", n.id === page);
    b.onclick = () => { page = n.id; renderNav(); renderPage(); };
    nav.appendChild(b);
  });
}
function crumbs() { document.getElementById("crumbs").textContent = "Home / " + NAV.find(n => n.id === page).label.replace(/^[^\s]+\s/, ""); }
function lineChart(canvas, data, color) {
  const ctx = canvas.getContext("2d"), W = canvas.width = canvas.offsetWidth * 2, H = canvas.height = 360;
  ctx.clearRect(0, 0, W, H); const max = Math.max(...data) * 1.1;
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath();
  data.forEach((v, i) => { const x = 20 + i * (W - 40) / (data.length - 1), y = H - 30 - (v / max) * (H - 60); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
  ctx.fillStyle = color; data.forEach((v, i) => { const x = 20 + i * (W - 40) / (data.length - 1), y = H - 30 - (v / max) * (H - 60); ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); });
}
function barChart(canvas, data, color) {
  const ctx = canvas.getContext("2d"), W = canvas.width = canvas.offsetWidth * 2, H = canvas.height = 360;
  const max = Math.max(...data) * 1.1, bw = (W - 40) / data.length * 0.6;
  ctx.fillStyle = color;
  data.forEach((v, i) => { const x = 20 + i * (W - 40) / data.length + ((W - 40) / data.length - bw) / 2, h = (v / max) * (H - 60); ctx.fillRect(x, H - 30 - h, bw, h); });
}
function donutChart(canvas, parts) {
  const ctx = canvas.getContext("2d"), W = canvas.width = canvas.offsetWidth * 2, H = canvas.height = 360;
  const total = parts.reduce((a, p) => a + p.v, 0); let a0 = -Math.PI / 2;
  parts.forEach(p => { const a1 = a0 + (p.v / total) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.arc(W / 2, H / 2, 140, a0, a1); ctx.closePath(); ctx.fillStyle = p.c; ctx.fill(); a0 = a1; });
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 70, 0, 7); ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--panel") || "#fff"; ctx.fill();
}
function orderRows(list) {
  return list.map(o => `<tr><td>${o.id}</td><td>${o.customer}</td><td>${o.product}</td><td>$${o.amount.toFixed(2)}</td><td>${o.status}</td><td>${o.date}</td></tr>`).join("");
}
function renderPage() {
  crumbs();
  const el = document.getElementById("page");
  if (page === "overview") {
    el.innerHTML = `<div class="cards">
      <div class="stat"><div>Revenue (Nov)</div><div class="num">$48,290</div><span class="delta">▲ 12.4% vs Oct</span></div>
      <div class="stat"><div>Orders</div><div class="num">1,284</div><span class="delta">▲ 8.1%</span></div>
      <div class="stat"><div>Active users</div><div class="num">3,412</div><span class="delta down">▼ 2.0%</span></div>
      <div class="stat"><div>Open tickets</div><div class="num">27</div><span class="delta">▲ 3 new</span></div></div>
    <div class="panels">
      <div class="panel"><h3>Revenue — last 7 days</h3><canvas id="cLine"></canvas></div>
      <div class="panel"><h3>Orders per day</h3><canvas id="cBar"></canvas></div>
      <div class="panel"><h3>Traffic sources</h3><canvas id="cDonut"></canvas><p>Organic 45% · Direct 30% · Referral 25%</p></div>
      <div class="panel"><h3>Recent orders</h3><table><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>${ORDERS.slice(0, 4).map(o => `<tr><td>${o.id}</td><td>${o.customer}</td><td>$${o.amount.toFixed(2)}</td><td>${o.status}</td></tr>`).join("")}</tbody></table></div>
    </div>`;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2563eb";
    lineChart(document.getElementById("cLine"), [1200, 1900, 1500, 2400, 2100, 2900, 3400], accent);
    barChart(document.getElementById("cBar"), [42, 58, 47, 71, 63, 84, 92], accent);
    donutChart(document.getElementById("cDonut"), [{ v: 45, c: "#2563eb" }, { v: 30, c: "#38bdf8" }, { v: 25, c: "#94a3b8" }]);
  } else if (page === "orders") {
    el.innerHTML = `<div class="panel"><h3>Orders</h3><input id="orderSearch" placeholder="Filter orders..." aria-label="Filter orders">
      <table><thead><tr><th data-k="id">Order ↕</th><th data-k="customer">Customer ↕</th><th data-k="product">Product ↕</th><th data-k="amount">Amount ↕</th><th data-k="status">Status ↕</th><th data-k="date">Date ↕</th></tr></thead><tbody id="orderBody"></tbody></table></div>`;
    const draw = q => {
      const list = [...ORDERS].filter(o => !q || JSON.stringify(o).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1) * sortDir);
      document.getElementById("orderBody").innerHTML = orderRows(list);
    };
    draw("");
    document.getElementById("orderSearch").addEventListener("input", e => draw(e.target.value));
    el.querySelectorAll("th").forEach(th => th.onclick = () => { const k = th.dataset.k; if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; } draw(document.getElementById("orderSearch").value); });
  } else if (page === "users") {
    el.innerHTML = `<div class="panel"><h3>Users (admin only)</h3><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody>${USERS.map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>${u.status}</td><td>${u.joined}</td></tr>`).join("")}</tbody></table></div>`;
  } else {
    el.innerHTML = `<div class="panel settings"><h3>Settings</h3>
      <label>Accent theme <span class="swatches">
        <button class="swatch" style="background:#2563eb" data-a="blue" aria-label="Blue theme"></button>
        <button class="swatch" style="background:#0d9488" data-a="teal" aria-label="Teal theme"></button>
        <button class="swatch" style="background:#7c3aed" data-a="violet" aria-label="Violet theme"></button></span></label>
      <label>Table density <select id="density"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
      <p>Preferences are saved to localStorage and survive reloads. The theme-token system lives in <code>styles.css</code> — change the <code>--accent</code> variable and the whole kit re-skins.</p></div>`;
    el.querySelectorAll(".swatch").forEach(b => b.onclick = () => { prefs.accent = b.dataset.a; applyPrefs(); renderPage(); });
    const d = document.getElementById("density"); d.value = prefs.density;
    d.onchange = () => { prefs.density = d.value; document.body.style.fontSize = d.value === "compact" ? "14px" : ""; savePrefs(); };
  }
}
document.getElementById("themeBtn").onclick = () => { prefs.theme = prefs.theme === "dark" ? "light" : "dark"; applyPrefs(); renderPage(); };
document.getElementById("collapseBtn").onclick = () => { prefs.collapsed = !prefs.collapsed; applyPrefs(); };
document.getElementById("menuBtn").onclick = () => document.getElementById("sidebar").classList.toggle("open");
document.getElementById("role").onchange = e => { prefs.role = e.target.value; if (page === "users" && prefs.role !== "admin") page = "overview"; applyPrefs(); renderNav(); renderPage(); };
applyPrefs(); renderNav(); renderPage();
