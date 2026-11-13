'use strict';
// Job Board Platform — zero-dependency Node.js server (built-in http/crypto only).
// Persistence: JSON-file store (data.json, seeded from assets/seed.json).
// Production path: swap the load()/save() pair for PostgreSQL + Prisma;
// the REST shapes below stay the same.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4030;
const SECRET = process.env.SESSION_SECRET || 'job-board-platform-dev-secret-change-me';
const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data.json');
const SEED = path.join(ROOT, 'assets', 'seed.json');
const SCHEMA = {"jobs": {"label": "Jobs", "singular": "job", "fields": [{"key": "title", "label": "Title", "type": "text"}, {"key": "company", "label": "Company", "type": "text"}, {"key": "location", "label": "Location", "type": "text"}, {"key": "salaryMin", "label": "Salary min", "type": "number"}, {"key": "salaryMax", "label": "Salary max", "type": "number"}, {"key": "remote", "label": "Remote", "type": "select", "options": ["Yes", "No"]}, {"key": "tags", "label": "Tags (comma-separated)", "type": "text"}, {"key": "description", "label": "Description", "type": "textarea"}]}, "applications": {"label": "Applications", "singular": "application", "fields": [{"key": "jobId", "label": "Job ID", "type": "text"}, {"key": "applicantName", "label": "Applicant", "type": "text"}, {"key": "email", "label": "Email", "type": "text"}, {"key": "skills", "label": "Skills (comma-separated)", "type": "text"}, {"key": "status", "label": "Status", "type": "select", "options": ["Applied", "Shortlisted", "Interview", "Rejected", "Hired"]}]}, "savedSearches": {"label": "Saved searches", "singular": "saved search", "fields": [{"key": "query", "label": "Query", "type": "text"}, {"key": "location", "label": "Location", "type": "text"}, {"key": "remote", "label": "Remote", "type": "select", "options": ["Yes", "No"]}]}};

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

function matchScore(job, skillsText) {
  const need = String(job.tags || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const have = String(skillsText || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!need.length) return 0;
  const hit = need.filter(t => have.indexOf(t) >= 0).length;
  return Math.round((hit / need.length) * 100);
}

async function handleCustom(req, res, parts, parsed, user) {

  if (req.method === 'POST' && parts[1] === 'jobs' && parts[3] === 'apply' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const job = db.jobs.find(j => j.id === parts[2]);
    if (!job) return send(res, 404, { error: 'job not found' }), true;
    const b = await readBody(req);
    if (!b.applicantName || !b.email) return send(res, 400, { error: 'applicantName and email required' }), true;
    const app = { id: uid(), jobId: job.id, applicantName: b.applicantName, email: b.email, skills: b.skills || '', resumeText: b.resumeText || '', status: 'Applied', matchScore: matchScore(job, b.skills || ''), createdAt: new Date().toISOString() };
    db.applications.push(app); save();
    return send(res, 201, app), true;
  }
  if (req.method === 'GET' && parts[1] === 'jobs' && parts[3] === 'applicants' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const job = db.jobs.find(j => j.id === parts[2]);
    if (!job) return send(res, 404, { error: 'job not found' }), true;
    const list = db.applications.filter(a => a.jobId === job.id).map(a => ({ id: a.id, applicantName: a.applicantName, email: a.email, skills: a.skills, status: a.status, matchScore: matchScore(job, a.skills) }));
    list.sort((a, b) => b.matchScore - a.matchScore);
    return send(res, 200, list), true;
  }
  if (req.method === 'GET' && parts[1] === 'jobs' && parts[3] === 'match' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const job = db.jobs.find(j => j.id === parts[2]);
    if (!job) return send(res, 404, { error: 'job not found' }), true;
    return send(res, 200, { jobId: job.id, requiredSkills: job.tags, matchScore: matchScore(job, parsed.query.skills || '') }), true;
  }
  if (req.method === 'GET' && parts[1] === 'employer' && parts[2] === 'dashboard') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const byJob = db.jobs.map(j => {
      const apps = db.applications.filter(a => a.jobId === j.id);
      const byStatus = {};
      apps.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
      return { jobId: j.id, title: j.title, company: j.company, applicants: apps.length, byStatus: byStatus };
    });
    return send(res, 200, { jobs: db.jobs.length, applications: db.applications.length, byJob: byJob }), true;
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
      if (parts[1] === 'ping') return send(res, 200, { ok: true, app: 'job-board-platform' });
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

        save();
        return send(res, 201, rec);
      }
      if (req.method === 'PUT' && parts.length === 3) {
        const b = await readBody(req);
        const r = db[coll].find(x => x.id === parts[2]);
        if (!r) return send(res, 404, { error: 'not found' });
        Object.assign(r, b, { updatedAt: new Date().toISOString() });

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
server.listen(PORT, () => console.log('job-board-platform listening on http://localhost:' + PORT));
module.exports = { server };
