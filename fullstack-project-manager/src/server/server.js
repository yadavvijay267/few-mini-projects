'use strict';
// Project Management App (Full Stack) — zero-dependency Node.js server (built-in http/crypto only).
// Persistence: JSON-file store (data.json, seeded from assets/seed.json).
// Production path: swap the load()/save() pair for PostgreSQL + Prisma;
// the REST shapes below stay the same.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4027;
const SECRET = process.env.SESSION_SECRET || 'fullstack-project-manager-dev-secret-change-me';
const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data.json');
const SEED = path.join(ROOT, 'assets', 'seed.json');
const SCHEMA = {"projects": {"label": "Projects", "singular": "project", "fields": [{"key": "name", "label": "Name", "type": "text"}, {"key": "description", "label": "Description", "type": "textarea"}, {"key": "status", "label": "Status", "type": "select", "options": ["Active", "On hold", "Completed"]}, {"key": "owner", "label": "Owner", "type": "text"}]}, "tasks": {"label": "Tasks", "singular": "task", "fields": [{"key": "title", "label": "Title", "type": "text"}, {"key": "projectId", "label": "Project ID", "type": "text"}, {"key": "assignee", "label": "Assignee", "type": "text"}, {"key": "status", "label": "Status", "type": "select", "options": ["Todo", "In Progress", "Review", "Done"]}, {"key": "priority", "label": "Priority", "type": "select", "options": ["Low", "Medium", "High", "Critical"]}, {"key": "dueDate", "label": "Due date", "type": "date"}]}, "members": {"label": "Team members", "singular": "member", "fields": [{"key": "name", "label": "Name", "type": "text"}, {"key": "role", "label": "Role", "type": "text"}, {"key": "email", "label": "Email", "type": "text"}]}, "comments": {"label": "Comments", "singular": "comment", "fields": [{"key": "taskId", "label": "Task ID", "type": "text"}, {"key": "author", "label": "Author", "type": "text"}, {"key": "text", "label": "Comment", "type": "textarea"}]}, "activities": {"label": "Activity feed", "singular": "activity", "fields": [{"key": "action", "label": "Action", "type": "text"}, {"key": "projectId", "label": "Project ID", "type": "text"}]}};

let db = null;
function load() {
  if (fs.existsSync(DATA)) { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  else {
    db = JSON.parse(fs.readFileSync(SEED, 'utf8'));
    (db.users || []).forEach(u => {
      if (u.password && u.password.indexOf('plain:') === 0) {
        const s = crypto.randomBytes(8).toString('hex');
        u.salt = s;
        u.password = crypto.createHash('sha256').update(s + u.password.slice(6)).digest('hex');
      }
    });
    save();
  }
  Object.keys(SCHEMA).forEach(c => { if (!Array.isArray(db[c])) db[c] = []; });
  if (!Array.isArray(db.users)) db.users = [];
  return db;
}
function save() { fs.writeFileSync(DATA, JSON.stringify(db, null, 2)); }
load();
const sessions = new Map();
const uid = () => crypto.randomBytes(8).toString('hex');
const hash = (pw, salt) => crypto.createHash('sha256').update(salt + pw).digest('hex');
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => { d += c; });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
  });
}
function authUser(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  return (t && sessions.has(t)) ? sessions.get(t) : null;
}
function serveStatic(res, file, ct) {
  const p = path.join(ROOT, 'src', 'client', file);
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': ct });
  fs.createReadStream(p).pipe(res);
}

async function handleCustom(req, res, parts, parsed, user) {

  if (req.method === 'GET' && parts[1] === 'dashboard') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const today = new Date().toISOString().slice(0, 10);
    const overdue = db.tasks.filter(t => t.status !== 'Done' && t.dueDate && t.dueDate < today);
    return send(res, 200, { projects: db.projects.length, tasks: db.tasks.length, done: db.tasks.filter(t => t.status === 'Done').length, overdue: overdue.length, overdueTasks: overdue, recentActivity: db.activities.slice(0, 10) }), true;
  }
  if (req.method === 'GET' && parts[1] === 'projects' && parts[3] === 'health' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const proj = db.projects.find(p => p.id === parts[2]);
    if (!proj) return send(res, 404, { error: 'project not found' }), true;
    const today = new Date().toISOString().slice(0, 10);
    const tasks = db.tasks.filter(t => t.projectId === proj.id);
    const overdue = tasks.filter(t => t.status !== 'Done' && t.dueDate && t.dueDate < today).length;
    const stalled = tasks.filter(t => t.status === 'Todo' && t.createdAt && t.createdAt.slice(0, 10) < new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).length;
    const score = Math.max(0, 100 - overdue * 15 - stalled * 5);
    const label = score >= 80 ? 'on-track' : score >= 50 ? 'at-risk' : 'overdue';
    return send(res, 200, { projectId: proj.id, project: proj.name, score: score, label: label, totalTasks: tasks.length, overdue: overdue, stalled: stalled }), true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const parts = u.pathname.split('/').filter(Boolean);
    if (req.method === 'GET' && u.pathname === '/') return serveStatic(res, 'index.html', 'text/html');
    if (req.method === 'GET' && u.pathname === '/app.js') return serveStatic(res, 'app.js', 'text/javascript');
    if (req.method === 'GET' && u.pathname === '/styles.css') return serveStatic(res, 'styles.css', 'text/css');
    if (parts[0] === 'api') {
      if (parts[1] === 'ping') return send(res, 200, { ok: true, app: 'fullstack-project-manager' });
      if (parts[1] === 'auth') {
        if (req.method === 'POST' && parts[2] === 'register') {
          const b = await readBody(req);
          if (!b.email || !b.password) return send(res, 400, { error: 'email and password required' });
          if (db.users.find(x => x.email === b.email)) return send(res, 409, { error: 'email already registered' });
          const salt = crypto.randomBytes(8).toString('hex');
          const user = { id: uid(), name: b.name || b.email.split('@')[0], email: b.email, salt: salt, password: hash(b.password, salt), role: b.role || 'user', createdAt: new Date().toISOString() };
          db.users.push(user); save();
          const t = crypto.randomBytes(16).toString('hex'); sessions.set(t, user);
          return send(res, 201, { token: t, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        }
        if (req.method === 'POST' && parts[2] === 'login') {
          const b = await readBody(req);
          const user = db.users.find(x => x.email === b.email);
          if (!user || hash(b.password, user.salt) !== user.password) return send(res, 401, { error: 'invalid credentials' });
          const t = crypto.randomBytes(16).toString('hex'); sessions.set(t, user);
          return send(res, 200, { token: t, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        }
        if (req.method === 'GET' && parts[2] === 'me') {
          const user = authUser(req);
          if (!user) return send(res, 401, { error: 'unauthorized' });
          return send(res, 200, { user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        }
      }
      const user = authUser(req);
      const parsed = { query: Object.fromEntries(u.searchParams) };
      if (await handleCustom(req, res, parts, parsed, user)) return;
      if (!user) return send(res, 401, { error: 'unauthorized - please log in' });
      const coll = parts[1];
      if (!SCHEMA[coll]) return send(res, 404, { error: 'unknown collection' });
      if (req.method === 'GET' && parts.length === 2) {
        let rows = db[coll].slice();
        u.searchParams.forEach((v, k) => { rows = rows.filter(r => String(r[k] == null ? '' : r[k]) === v); });
        return send(res, 200, rows);
      }
      if (req.method === 'GET' && parts.length === 3) {
        const r = db[coll].find(x => x.id === parts[2]);
        return r ? send(res, 200, r) : send(res, 404, { error: 'not found' });
      }
      if (req.method === 'POST' && parts.length === 2) {
        const b = await readBody(req);
        const rec = Object.assign({ id: uid(), createdAt: new Date().toISOString() }, b);
        db[coll].push(rec);
if (coll === 'tasks' && Array.isArray(db.activities)) { db.activities.unshift({ id: uid(), action: 'Task created: ' + (rec.title || ''), projectId: rec.projectId || '', createdAt: new Date().toISOString() }); }
        save();
        return send(res, 201, rec);
      }
      if (req.method === 'PUT' && parts.length === 3) {
        const b = await readBody(req);
        const r = db[coll].find(x => x.id === parts[2]);
        if (!r) return send(res, 404, { error: 'not found' });
        Object.assign(r, b, { updatedAt: new Date().toISOString() });
if (coll === 'tasks' && Array.isArray(db.activities)) { db.activities.unshift({ id: uid(), action: 'Task updated: ' + (r.title || '') + ' -> ' + (r.status || ''), projectId: r.projectId || '', createdAt: new Date().toISOString() }); }
        save();
        return send(res, 200, r);
      }
      if (req.method === 'DELETE' && parts.length === 3) {
        const i = db[coll].findIndex(x => x.id === parts[2]);
        if (i < 0) return send(res, 404, { error: 'not found' });
        db[coll].splice(i, 1); save();
        return send(res, 200, { deleted: true });
      }
      return send(res, 404, { error: 'route not found' });
    }
    res.writeHead(404); res.end('not found');
  } catch (e) { console.error(e); send(res, 500, { error: String((e && e.message) || e) }); }
});
server.listen(PORT, () => console.log('fullstack-project-manager listening on http://localhost:' + PORT));
module.exports = { server };
