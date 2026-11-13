// Shared logic used by BOTH the Cloudflare Worker (src/index.js) and the
// AWS Lambda handler (src/lambda.js). Keeps the two runtimes in sync.
// Store is in-memory per isolate/invocation environment; production binds
// Cloudflare KV (or DynamoDB for Lambda) through the `env` object.
const crypto = require("crypto");

const SECRET = "dev-only-serverless-secret-change-me"; // set via env/secret in production
function b64url(s) { return Buffer.from(s).toString("base64url"); }
function signJwt(payload, ttlSec = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSec };
  const data = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + b64url(JSON.stringify(body));
  return data + "." + crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}
function verifyJwt(token) {
  if (!token) return null;
  const p = token.split(".");
  if (p.length !== 3) return null;
  const exp = crypto.createHmac("sha256", SECRET).update(p[0] + "." + p[1]).digest("base64url");
  const a = Buffer.from(p[2]), b = Buffer.from(exp);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const pl = JSON.parse(Buffer.from(p[1], "base64url").toString("utf8")); return pl.exp < Date.now() / 1000 ? null : pl; }
  catch { return null; }
}
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString("hex"); }

// Factory: each runtime creates its own store instance.
function createStore() {
  const users = new Map(); // email -> user
  const tasks = new Map(); // id -> task
  const logs = [];         // request log (capped)
  return {
    users, tasks, logs,
    log(entry) { logs.unshift({ ...entry, at: new Date().toISOString() }); if (logs.length > 200) logs.pop(); },
    register(name, email, password) {
      if (users.has(email)) return { error: "Email already registered", status: 409 };
      const salt = crypto.randomBytes(16).toString("hex");
      const user = { id: crypto.randomUUID(), name, email, salt, passwordHash: hashPassword(password, salt), createdAt: new Date().toISOString() };
      users.set(email, user);
      return { user: { id: user.id, name, email } };
    },
    login(email, password) {
      const u = users.get(email);
      if (!u) return { error: "Invalid credentials", status: 401 };
      const ok = crypto.timingSafeEqual(Buffer.from(hashPassword(password, u.salt)), Buffer.from(u.passwordHash));
      if (!ok) return { error: "Invalid credentials", status: 401 };
      return { token: signJwt({ sub: u.id, email: u.email }), user: { id: u.id, name: u.name, email: u.email } };
    },
    createTask(userId, data) {
      const id = crypto.randomUUID();
      const t = { id, userId, title: data.title, done: false, createdAt: new Date().toISOString() };
      tasks.set(id, t); return t;
    },
    listTasks(userId) { return [...tasks.values()].filter(t => t.userId === userId); },
    // Scheduled job: daily summary (called by Worker's scheduled() / Lambda cron).
    dailySummary() {
      const byUser = {};
      for (const t of tasks.values()) { byUser[t.userId] = byUser[t.userId] || { total: 0, done: 0 }; byUser[t.userId].total++; if (t.done) byUser[t.userId].done++; }
      return { date: new Date().toISOString().slice(0, 10), users: Object.keys(byUser).length,
        totalTasks: tasks.size, perUser: byUser, note: "In production this summary is emailed/posted to a webhook." };
    },
  };
}

// The router: pure function of (method, path, headers, body, store).
// Returns { status, body } — each runtime adapts it to its Response shape.
async function handle(store, method, path, headers, body) {
  const started = Date.now();
  const json = (status, obj) => ({ status, body: obj });
  try {
    if (method === "GET" && path === "/health") return json(200, { status: "ok", runtime: "serverless", tasks: store.tasks.size });
    if (method === "POST" && path === "/api/auth/register") {
      if (!body?.email || !body?.password || !body?.name) return json(400, { error: "name, email and password are required" });
      const r = store.register(body.name, body.email, body.password);
      return r.error ? json(r.status, { error: r.error }) : json(201, r.user);
    }
    if (method === "POST" && path === "/api/auth/login") {
      const r = store.login(body?.email || "", body?.password || "");
      return r.error ? json(r.status, { error: r.error }) : json(200, r);
    }
    const auth = headers.authorization || headers.Authorization || "";
    const claims = verifyJwt(auth.startsWith("Bearer ") ? auth.slice(7) : "");
    if (!claims) return json(401, { error: "Missing or invalid Bearer token" });
    if (method === "GET" && path === "/api/tasks") return json(200, { tasks: store.listTasks(claims.sub) });
    if (method === "POST" && path === "/api/tasks") {
      if (!body?.title) return json(400, { error: "title is required" });
      return json(201, store.createTask(claims.sub, body));
    }
    const m = path.match(/^\/api\/tasks\/([A-Za-z0-9-]+)$/);
    if (m) {
      const t = store.tasks.get(m[1]);
      if (!t || t.userId !== claims.sub) return json(404, { error: "Task not found" });
      if (method === "DELETE") { store.tasks.delete(t.id); return json(200, { deleted: true, id: t.id }); }
      if (method === "PATCH") { t.done = body?.done !== undefined ? !!body.done : t.done; if (body?.title) t.title = body.title; return json(200, t); }
    }
    if (method === "GET" && path === "/api/logs") return json(200, { logs: store.logs.slice(0, 50) });
    return json(404, { error: "Not found" });
  } finally {
    store.log({ method, path, ms: Date.now() - started });
  }
}
module.exports = { createStore, handle, signJwt, verifyJwt };
