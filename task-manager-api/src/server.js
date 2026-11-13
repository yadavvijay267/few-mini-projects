// Task Manager REST API — Node.js built-ins only, zero dependencies.
// Features: JWT auth + per-user isolation, CRUD, filtering/sorting/pagination,
// input validation with clear errors, rate limiting, request logging.
const http = require("http");
const { sign, verify } = require("./auth");
const store = require("./store");

const PORT = process.env.PORT || 3001;
const STATUSES = ["todo", "in-progress", "done"];
const PRIORITIES = ["low", "medium", "high"];

// --- tiny rate limiter: 100 requests / minute per IP ---
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 60000);
  list.push(now); hits.set(ip, list);
  return list.length > 100;
}
function log(req, status, ms) {
  console.log(new Date().toISOString(), req.method, req.url, "->", status, ms + "ms");
}
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => { if (!data) return resolve({}); try { resolve(JSON.parse(data)); } catch { reject(new Error("Invalid JSON body")); } });
    req.on("error", reject);
  });
}
function validateTask(data, partial = false) {
  const errors = [];
  if (!partial || data.title !== undefined) {
    if (!data.title || typeof data.title !== "string" || data.title.trim().length < 1 || data.title.length > 200)
      errors.push("title is required (1-200 chars)");
  }
  if (data.status !== undefined && !STATUSES.includes(data.status)) errors.push("status must be one of: " + STATUSES.join(", "));
  if (data.priority !== undefined && !PRIORITIES.includes(data.priority)) errors.push("priority must be one of: " + PRIORITIES.join(", "));
  if (data.dueDate !== undefined && data.dueDate !== null && isNaN(Date.parse(data.dueDate))) errors.push("dueDate must be a valid ISO date");
  if (data.tags !== undefined && !Array.isArray(data.tags)) errors.push("tags must be an array of strings");
  return errors;
}
function authUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return verify(token);
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url, "http://localhost");
  const ip = req.socket.remoteAddress || "unknown";
  try {
    if (rateLimited(ip)) { send(res, 429, { error: "Too many requests — slow down (100/min per IP)" }); return; }
    if (req.method === "GET" && url.pathname === "/health") { send(res, 200, { status: "ok", service: "task-manager-api", uptimeSec: Math.floor(process.uptime()) }); return; }
    if (req.method === "GET" && url.pathname === "/") {
      send(res, 200, { service: "Task Manager API", version: "1.0.0",
        docs: "/docs (see docs/API.md and openapi.yaml in the repo)",
        endpoints: ["POST /api/auth/register", "POST /api/auth/login", "GET/POST /api/tasks", "GET/PUT/DELETE /api/tasks/:id"] });
      return;
    }
    // --- auth ---
    if (url.pathname === "/api/auth/register" && req.method === "POST") {
      const b = await readBody(req);
      if (!b.email || !b.password || !b.name) { send(res, 400, { error: "name, email and password are required" }); return; }
      if (store.findUserByEmail(b.email)) { send(res, 409, { error: "Email already registered" }); return; }
      if (String(b.password).length < 8) { send(res, 400, { error: "Password must be at least 8 characters" }); return; }
      const user = store.createUser(b.email, b.name, b.password);
      send(res, 201, { user: { id: user.id, email: user.email, name: user.name }, token: sign({ sub: user.id, email: user.email }) });
      return;
    }
    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const b = await readBody(req);
      const user = store.findUserByEmail(b.email || "");
      if (!user || !store.checkPassword(user, b.password || "")) { send(res, 401, { error: "Invalid email or password" }); return; }
      send(res, 200, { user: { id: user.id, email: user.email, name: user.name }, token: sign({ sub: user.id, email: user.email }) });
      return;
    }
    // --- tasks (auth required) ---
    const user = authUser(req);
    if (!user) { send(res, 401, { error: "Missing or invalid Bearer token — log in first" }); return; }
    if (url.pathname === "/api/tasks" && req.method === "GET") {
      const q = url.searchParams;
      const result = store.listTasks(user.sub, {
        status: q.get("status") || undefined, priority: q.get("priority") || undefined,
        search: q.get("search") || undefined, sort: q.get("sort") || "createdAt",
        order: q.get("order") || "desc",
        page: Math.max(1, parseInt(q.get("page") || "1", 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(q.get("limit") || "10", 10) || 10)),
      });
      send(res, 200, result); return;
    }
    if (url.pathname === "/api/tasks" && req.method === "POST") {
      const b = await readBody(req);
      const errors = validateTask(b);
      if (errors.length) { send(res, 422, { error: "Validation failed", details: errors }); return; }
      send(res, 201, store.createTask(user.sub, b)); return;
    }
    const m = url.pathname.match(/^\/api\/tasks\/([A-Za-z0-9-]+)$/);
    if (m) {
      const task = store.tasks.get(m[1]);
      if (!task || task.userId !== user.sub) { send(res, 404, { error: "Task not found" }); return; }
      if (req.method === "GET") { send(res, 200, task); return; }
      if (req.method === "PUT") {
        const b = await readBody(req);
        const errors = validateTask(b, true);
        if (errors.length) { send(res, 422, { error: "Validation failed", details: errors }); return; }
        Object.assign(task, { title: b.title ?? task.title, description: b.description ?? task.description,
          status: b.status ?? task.status, priority: b.priority ?? task.priority,
          dueDate: b.dueDate !== undefined ? b.dueDate : task.dueDate, tags: b.tags ?? task.tags,
          updatedAt: new Date().toISOString() });
        send(res, 200, task); return;
      }
      if (req.method === "DELETE") { store.tasks.delete(task.id); send(res, 200, { deleted: true, id: task.id }); return; }
    }
    send(res, 404, { error: "Not found", hint: "See docs/API.md for the endpoint list" });
  } catch (err) {
    send(res, err.message === "Invalid JSON body" ? 400 : 500, { error: err.message });
  } finally { log(req, res.statusCode, Date.now() - started); }
});

if (require.main === module) {
  server.listen(PORT, () => console.log("Task Manager API listening on http://localhost:" + PORT));
}
module.exports = server;
