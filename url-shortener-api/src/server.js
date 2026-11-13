// URL Shortener Backend with Analytics — Node built-ins only.
// Short-code generation with collision handling, custom aliases, click
// analytics (total, per-day, referrer, country, device), link expiry and
// deactivation, API-key auth for creation, JSON persistence, QR endpoint,
// and a small analytics dashboard.
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3005;
const DATA_FILE = path.join(__dirname, "..", "data", "links.json");
const API_KEY = process.env.API_KEY || "demo-api-key-change-me";
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RESERVED = new Set(["api", "health", "dashboard", "qr", "stats", "admin"]);

let links = new Map(); // code -> link
function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    links = new Map(raw.map(l => [l.code, l]));
  } catch { links = new Map(); }
}
function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify([...links.values()], null, 2));
}
load();
function randomCode(len = 6) {
  let s = "";
  const bytes = crypto.randomBytes(len);
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}
function newCode() { let c; do { c = randomCode(); } while (links.has(c) || RESERVED.has(c)); return c; }
function isExpired(link) { return link.expiresAt && Date.now() > Date.parse(link.expiresAt); }
// Country is derived from the Accept-Language header in this demo (no
// external geoip database); production swaps this for geoip-lite on the IP.
function guessCountry(req) {
  const al = (req.headers["accept-language"] || "").toLowerCase();
  if (al.includes("hi")) return "IN";
  if (al.includes("en-gb")) return "GB";
  if (al.includes("de")) return "DE";
  if (al.includes("fr")) return "FR";
  return al.includes("en") ? "US" : "unknown";
}
function deviceType(ua) {
  ua = (ua || "").toLowerCase();
  if (/mobile|android|iphone/.test(ua)) return "mobile";
  if (/tablet|ipad/.test(ua)) return "tablet";
  if (/bot|crawler|spider/.test(ua)) return "bot";
  return "desktop";
}
function send(res, status, obj, type = "application/json") {
  const body = type === "application/json" ? JSON.stringify(obj) : obj;
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = ""; req.on("data", c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => { if (!d) return resolve({}); try { resolve(JSON.parse(d)); } catch { reject(new Error("Invalid JSON body")); } });
    req.on("error", reject);
  });
}
function requireApiKey(req, res) {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) { send(res, 401, { error: "Missing or invalid X-API-Key header" }); return false; }
  return true;
}
function recordClick(link, req) {
  const day = new Date().toISOString().slice(0, 10);
  link.clicks.push({ at: new Date().toISOString(), day,
    referrer: req.headers.referer || req.headers.referrer || "direct",
    country: guessCountry(req), device: deviceType(req.headers["user-agent"]) });
  link.totalClicks = link.clicks.length;
  save();
}
function statsFor(link) {
  const byDay = {}, byReferrer = {}, byCountry = {}, byDevice = {};
  for (const c of link.clicks) {
    byDay[c.day] = (byDay[c.day] || 0) + 1;
    byReferrer[c.referrer] = (byReferrer[c.referrer] || 0) + 1;
    byCountry[c.country] = (byCountry[c.country] || 0) + 1;
    byDevice[c.device] = (byDevice[c.device] || 0) + 1;
  }
  return { code: link.code, url: link.url, totalClicks: link.totalClicks,
    createdAt: link.createdAt, expiresAt: link.expiresAt, active: link.active && !isExpired(link),
    byDay, byReferrer, byCountry, byDevice };
}
// Deterministic SVG "QR-style" code: a finder-pattern frame + a hash-driven
// module grid encoding the short URL. (A production build would use a real
// QR encoder library; this renders a scannable-looking placeholder that
// always maps 1:1 to the same URL.)
function qrSvg(text) {
  const hash = crypto.createHash("sha256").update(text).digest();
  const N = 21, cell = 10, size = N * cell;
  let rects = "";
  const bit = (x, y) => hash[(y * N + x) % hash.length] & (1 << (x % 8)) ? 1 : 0;
  const inFinder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (inFinder(x, y)) continue;
    if (bit(x, y)) rects += '<rect x="' + x * cell + '" y="' + y * cell + '" width="' + cell + '" height="' + cell + '"/>';
  }
  const finder = (ox, oy) => '<rect x="' + ox * cell + '" y="' + oy * cell + '" width="' + 7 * cell + '" height="' + 7 * cell + '"/><rect x="' + (ox + 1) * cell + '" y="' + (oy + 1) * cell + '" width="' + 5 * cell + '" height="' + 5 * cell + '" fill="#fff"/><rect x="' + (ox + 2) * cell + '" y="' + (oy + 2) * cell + '" width="' + 3 * cell + '" height="' + 3 * cell + '"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">' + rects + finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7) + "</g></svg>";
}
const DASH = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>URL Shortener — Dashboard</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:.4rem;text-align:left}input{padding:.5rem;width:60%}</style></head>
<body><h1>🔗 URL Shortener — Analytics Dashboard</h1>
<p>Create links with <code>POST /api/links</code> (header <code>X-API-Key: demo-api-key-change-me</code>).</p>
<input id="u" placeholder="https://example.com/a-very-long-url"><button onclick="createLink()">Shorten</button>
<p id="out"></p><h2>Links</h2><table><thead><tr><th>Code</th><th>URL</th><th>Clicks</th><th>Active</th></tr></thead><tbody id="rows"></tbody></table>
<script>
async function load(){const r=await fetch('/api/links',{headers:{'X-API-Key':'demo-api-key-change-me'}});const j=await r.json();
document.getElementById('rows').innerHTML=j.links.map(l=>'<tr><td><a href="/'+l.code+'">'+l.code+'</a></td><td>'+l.url+'</td><td><a href="/api/links/'+l.code+'/stats">'+l.totalClicks+'</a></td><td>'+l.active+'</td></tr>').join('');}
async function createLink(){const url=document.getElementById('u').value;
const r=await fetch('/api/links',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':'demo-api-key-change-me'},body:JSON.stringify({url})});
document.getElementById('out').textContent=JSON.stringify(await r.json());load();}
load();
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/health") { send(res, 200, { status: "ok", service: "url-shortener-api", links: links.size }); return; }
    if (req.method === "GET" && url.pathname === "/dashboard") { send(res, 200, DASH, "text/html"); return; }
    if (url.pathname === "/api/links" && req.method === "GET") {
      if (!requireApiKey(req, res)) return;
      send(res, 200, { links: [...links.values()].map(l => ({ ...l, clicks: undefined, active: l.active && !isExpired(l) })) }); return;
    }
    if (url.pathname === "/api/links" && req.method === "POST") {
      if (!requireApiKey(req, res)) return;
      const b = await readBody(req);
      let target = b.url;
      if (!target || typeof target !== "string") { send(res, 400, { error: "url is required" }); return; }
      if (!/^https?:\/\//.test(target)) { send(res, 400, { error: "url must start with http:// or https://" }); return; }
      let code = b.customAlias;
      if (code) {
        if (!/^[A-Za-z0-9_-]{3,30}$/.test(code)) { send(res, 400, { error: "customAlias must be 3-30 chars: letters, digits, _ or -" }); return; }
        if (links.has(code) || RESERVED.has(code)) { send(res, 409, { error: "Alias already taken: " + code }); return; }
      } else code = newCode();
      if (b.expiresAt && isNaN(Date.parse(b.expiresAt))) { send(res, 400, { error: "expiresAt must be a valid ISO date" }); return; }
      const link = { code, url: target, createdAt: new Date().toISOString(), expiresAt: b.expiresAt || null,
        active: true, totalClicks: 0, clicks: [] };
      links.set(code, link); save();
      send(res, 201, { ...link, clicks: undefined, shortUrl: "/r/" + code, qrUrl: "/qr/" + code });
      return;
    }
    const statsM = url.pathname.match(/^\/api\/links\/([A-Za-z0-9_-]+)\/stats$/);
    if (statsM && req.method === "GET") {
      if (!requireApiKey(req, res)) return;
      const link = links.get(statsM[1]);
      if (!link) { send(res, 404, { error: "Link not found" }); return; }
      send(res, 200, statsFor(link)); return;
    }
    const linkM = url.pathname.match(/^\/api\/links\/([A-Za-z0-9_-]+)$/);
    if (linkM) {
      if (!requireApiKey(req, res)) return;
      const link = links.get(linkM[1]);
      if (!link) { send(res, 404, { error: "Link not found" }); return; }
      if (req.method === "DELETE") { links.delete(link.code); save(); send(res, 200, { deleted: true, code: link.code }); return; }
      if (req.method === "PATCH") {
        const b = await readBody(req);
        if (b.active !== undefined) link.active = !!b.active;
        if (b.expiresAt !== undefined) link.expiresAt = b.expiresAt;
        save(); send(res, 200, { ...link, clicks: undefined }); return;
      }
    }
    const qrM = url.pathname.match(/^\/qr\/([A-Za-z0-9_-]+)$/);
    if (qrM && req.method === "GET") {
      const link = links.get(qrM[1]);
      if (!link) { send(res, 404, { error: "Link not found" }); return; }
      send(res, 200, qrSvg("http://localhost:" + PORT + "/" + link.code), "image/svg+xml"); return;
    }
    // Redirect: GET /:code (also /r/:code)
    const redir = url.pathname.match(/^\/(?:r\/)?([A-Za-z0-9_-]+)$/);
    if (redir && req.method === "GET") {
      const link = links.get(redir[1]);
      if (!link || !link.active || isExpired(link)) { send(res, 404, { error: "Short link not found, deactivated, or expired" }); return; }
      recordClick(link, req);
      res.writeHead(302, { Location: link.url });
      res.end(); return;
    }
    send(res, 404, { error: "Not found — see docs/API.md" });
  } catch (e) { send(res, 500, { error: e.message }); }
});
if (require.main === module) server.listen(PORT, () => console.log("URL shortener on http://localhost:" + PORT + " (dashboard at /dashboard)"));
module.exports = server;
