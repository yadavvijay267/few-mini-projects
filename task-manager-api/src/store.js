// In-memory store with per-user isolation. Swap for SQLite/Postgres later;
// the service layer below only talks to these two maps.
const crypto = require("crypto");
const users = new Map(); // id -> { id, email, name, passwordHash, salt, createdAt }
const tasks = new Map(); // id -> task
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function createUser(email, name, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const id = crypto.randomUUID();
  const user = { id, email, name, passwordHash: hashPassword(password, salt), salt, createdAt: new Date().toISOString() };
  users.set(id, user);
  return user;
}
function findUserByEmail(email) {
  for (const u of users.values()) if (u.email === email) return u;
  return null;
}
function checkPassword(user, password) {
  const h = crypto.scryptSync(password, user.salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(user.passwordHash));
}
function createTask(userId, data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const task = { id, userId, title: data.title, description: data.description || "",
    status: data.status || "todo", priority: data.priority || "medium",
    dueDate: data.dueDate || null, tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: now, updatedAt: now };
  tasks.set(id, task);
  return task;
}
function listTasks(userId, { status, priority, search, sort = "createdAt", order = "desc", page = 1, limit = 10 }) {
  let rows = [...tasks.values()].filter(t => t.userId === userId);
  if (status) rows = rows.filter(t => t.status === status);
  if (priority) rows = rows.filter(t => t.priority === priority);
  if (search) { const q = search.toLowerCase(); rows = rows.filter(t => (t.title + " " + t.description).toLowerCase().includes(q)); }
  rows.sort((a, b) => {
    const av = a[sort] ?? "", bv = b[sort] ?? "";
    return order === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  const total = rows.length;
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
}
module.exports = { users, tasks, createUser, findUserByEmail, checkPassword, createTask, listTasks };
