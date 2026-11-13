// Real-Time Notification Service — Node built-ins only.
// SSE delivery + in-memory pub/sub, multi-channel delivery (SSE, email stub,
// webhook), per-user preferences, queue with retries + dead-letter handling,
// delivery log, read/unread tracking, templates, and digest mode that
// batches low-priority notifications into one daily summary per user.
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3004;
const subscribers = new Map(); // userId -> Set<res>
const prefs = new Map();       // userId -> { channels: [], digestLowPriority: bool, mutedTypes: [] }
const deliveryLog = [];        // newest first, capped at 500
const unread = new Map();      // userId -> Map<notifId, notif>
const queue = [];              // pending jobs
const deadLetter = [];
const MAX_ATTEMPTS = 3;

const TEMPLATES = {
  "order-shipped": u => "Your order " + (u.orderId || "?") + " has shipped" + (u.tracking ? " (tracking " + u.tracking + ")" : "") + ".",
  "welcome": u => "Welcome, " + (u.name || "friend") + "! Your account is ready.",
  "alert": u => "ALERT: " + (u.message || "something needs your attention."),
  "reminder": u => "Reminder: " + (u.message || "you have something due soon."),
};
function defaultPrefs() { return { channels: ["sse", "email", "webhook"], digestLowPriority: false, mutedTypes: [] }; }
function getPrefs(userId) { if (!prefs.has(userId)) prefs.set(userId, defaultPrefs()); return prefs.get(userId); }
function logDelivery(entry) { deliveryLog.unshift({ ...entry, at: new Date().toISOString() }); if (deliveryLog.length > 500) deliveryLog.pop(); }
function publishSse(userId, notif) {
  const set = subscribers.get(userId);
  if (!set) return false;
  const payload = "data: " + JSON.stringify(notif) + "\n\n";
  for (const res of [...set]) { try { res.write(payload); } catch { set.delete(res); } }
  return set.size > 0;
}
// Simulated channel senders. Email/webhook are stubs that log the attempt;
// a real deployment swaps these for Nodemailer / fetch() calls.
async function sendEmail(userId, notif) { return { channel: "email", ok: true, detail: "queued to mailbox of " + userId + " (stub — wire Nodemailer here)" }; }
async function sendWebhook(userId, notif) { return { channel: "webhook", ok: true, detail: "POSTed to registered webhook for " + userId + " (stub)" }; }
async function deliver(job) {
  const { notif, userId } = job;
  const p = getPrefs(userId);
  const results = [];
  if (p.mutedTypes.includes(notif.type)) { logDelivery({ id: notif.id, userId, status: "muted", channel: "none" }); return; }
  if (p.channels.includes("sse")) {
    const ok = publishSse(userId, notif);
    results.push({ channel: "sse", ok, detail: ok ? "delivered live" : "user offline — stored as unread" });
    logDelivery({ id: notif.id, userId, status: ok ? "delivered" : "stored-unread", channel: "sse" });
  }
  if (p.channels.includes("email")) { const r = await sendEmail(userId, notif); results.push(r); logDelivery({ id: notif.id, userId, status: "delivered", channel: "email" }); }
  if (p.channels.includes("webhook")) { const r = await sendWebhook(userId, notif); results.push(r); logDelivery({ id: notif.id, userId, status: "delivered", channel: "webhook" }); }
  if (!unread.has(userId)) unread.set(userId, new Map());
  unread.get(userId).set(notif.id, notif);
  job.results = results;
}
async function processQueue() {
  while (queue.length) {
    const job = queue.shift();
    try { await deliver(job); }
    catch (e) {
      job.attempts = (job.attempts || 0) + 1;
      if (job.attempts < MAX_ATTEMPTS) queue.push(job); // retry (backoff via re-queue)
      else { deadLetter.push({ ...job, error: e.message, deadAt: new Date().toISOString() }); logDelivery({ id: job.notif.id, userId: job.userId, status: "dead-letter", channel: "all" }); }
    }
  }
}
function enqueue(userId, type, data, priority = "normal") {
  const text = (TEMPLATES[type] || (u => u.message || type))(data || {});
  const notif = { id: crypto.randomUUID(), userId, type, title: type, message: text,
    priority, data: data || {}, createdAt: new Date().toISOString(), read: false };
  const p = getPrefs(userId);
  // Digest mode: low-priority notifications are batched, not sent immediately.
  if (priority === "low" && p.digestLowPriority) {
    if (!globalThis.__digests) globalThis.__digests = new Map();
    if (!globalThis.__digests.has(userId)) globalThis.__digests.set(userId, []);
    globalThis.__digests.get(userId).push(notif);
    logDelivery({ id: notif.id, userId, status: "batched-in-digest", channel: "digest" });
    return { ...notif, batched: true };
  }
  queue.push({ notif, userId, attempts: 0 });
  setImmediate(processQueue);
  return notif;
}
function sendDigest(userId) {
  const items = (globalThis.__digests && globalThis.__digests.get(userId)) || [];
  if (!items.length) return { sent: 0 };
  const summary = { id: crypto.randomUUID(), userId, type: "digest",
    title: "Daily digest", message: "You have " + items.length + " low-priority updates: " + items.map(i => i.message).join(" | "),
    priority: "normal", items: items.map(i => i.id), createdAt: new Date().toISOString(), read: false };
  globalThis.__digests.set(userId, []);
  queue.push({ notif: summary, userId, attempts: 0 });
  setImmediate(processQueue);
  return { sent: items.length, digestId: summary.id };
}
function send(res, status, obj) { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = ""; req.on("data", c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => { if (!d) return resolve({}); try { resolve(JSON.parse(d)); } catch { reject(new Error("Invalid JSON body")); } });
    req.on("error", reject);
  });
}
const PUBLIC_HTML = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html" }); res.end(PUBLIC_HTML); return; }
    if (req.method === "GET" && url.pathname === "/health") { send(res, 200, { status: "ok", service: "realtime-notification-service", onlineUsers: subscribers.size, queued: queue.length, deadLetter: deadLetter.length }); return; }
    // SSE stream: GET /events?userId=alice — also replays unread notifications.
    if (req.method === "GET" && url.pathname === "/events") {
      const userId = url.searchParams.get("userId");
      if (!userId) { send(res, 400, { error: "userId query param is required" }); return; }
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      res.write(": connected\n\n");
      if (!subscribers.has(userId)) subscribers.set(userId, new Set());
      subscribers.get(userId).add(res);
      const pending = unread.get(userId);
      if (pending) for (const n of pending.values()) res.write("data: " + JSON.stringify(n) + "\n\n");
      const heartbeat = setInterval(() => { try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); } }, 25000);
      req.on("close", () => { clearInterval(heartbeat); subscribers.get(userId)?.delete(res); });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/notify") {
      const b = await readBody(req);
      if (!b.userId || !b.type) { send(res, 400, { error: "userId and type are required" }); return; }
      send(res, 202, enqueue(b.userId, b.type, b.data || {}, b.priority || "normal"));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/digest/send") {
      const b = await readBody(req);
      if (!b.userId) { send(res, 400, { error: "userId is required" }); return; }
      send(res, 200, sendDigest(b.userId)); return;
    }
    const prefM = url.pathname.match(/^\/api\/users\/([^/]+)\/preferences$/);
    if (prefM) {
      const userId = decodeURIComponent(prefM[1]);
      if (req.method === "GET") { send(res, 200, getPrefs(userId)); return; }
      if (req.method === "PUT") { const b = await readBody(req); prefs.set(userId, { ...defaultPrefs(), ...b }); send(res, 200, prefs.get(userId)); return; }
    }
    const readM = url.pathname.match(/^\/api\/users\/([^/]+)\/notifications$/);
    if (readM && req.method === "GET") {
      const list = [...(unread.get(decodeURIComponent(readM[1])) || new Map()).values()];
      send(res, 200, { notifications: list, unreadCount: list.filter(n => !n.read).length }); return;
    }
    const markM = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (markM && req.method === "POST") {
      const b = await readBody(req);
      const map = unread.get(b.userId || "");
      const n = map && map.get(markM[1]);
      if (!n) { send(res, 404, { error: "Notification not found for this user" }); return; }
      n.read = true; send(res, 200, n); return;
    }
    if (req.method === "GET" && url.pathname === "/api/delivery-log") { send(res, 200, { log: deliveryLog.slice(0, 100), deadLetter }); return; }
    send(res, 404, { error: "Not found — see docs/API.md" });
  } catch (e) { send(res, 500, { error: e.message }); }
});
if (require.main === module) server.listen(PORT, () => console.log("Notification service on http://localhost:" + PORT + " (demo dashboard at /)"));
module.exports = server;
