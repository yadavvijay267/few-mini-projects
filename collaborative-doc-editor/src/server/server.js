'use strict';
// Real-Time Collaborative Document Editor — zero-dependency Node.js server (built-in http/crypto only).
// Persistence: JSON-file store (data.json, seeded from assets/seed.json).
// Production path: swap the load()/save() pair for PostgreSQL + Prisma;
// the REST shapes below stay the same.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4029;
const SECRET = process.env.SESSION_SECRET || 'collaborative-doc-editor-dev-secret-change-me';
const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data.json');
const SEED = path.join(ROOT, 'assets', 'seed.json');
const SCHEMA = {"documents": {"label": "Documents", "singular": "document", "fields": [{"key": "title", "label": "Title", "type": "text"}, {"key": "content", "label": "Content", "type": "textarea"}, {"key": "owner", "label": "Owner", "type": "text"}, {"key": "shareToken", "label": "Share token", "type": "text"}]}, "versions": {"label": "Version history", "singular": "version", "fields": [{"key": "docId", "label": "Document ID", "type": "text"}, {"key": "content", "label": "Content", "type": "textarea"}, {"key": "author", "label": "Author", "type": "text"}, {"key": "note", "label": "Note", "type": "text"}]}};

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
const presence = new Map(); // docId -> Map(name -> {name, cursor, at})
async function handleCustom(req, res, parts, parsed, user) {

  if (req.method === 'GET' && parts[1] === 'docs' && parts[3] === 'stream' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const doc = db.documents.find(d => d.id === parts[2]);
    if (!doc) return send(res, 404, { error: 'not found' }), true;
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const tick = () => { const cur = db.documents.find(d => d.id === parts[2]); if (cur) res.write('data: ' + JSON.stringify({ id: cur.id, title: cur.title, content: cur.content, updatedAt: cur.updatedAt || cur.createdAt }) + '\n\n'); };
    tick();
    const iv = setInterval(tick, 2000);
    req.on('close', () => clearInterval(iv));
    return true;
  }
  if (req.method === 'POST' && parts[1] === 'docs' && parts[3] === 'edit' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const doc = db.documents.find(d => d.id === parts[2]);
    if (!doc) return send(res, 404, { error: 'not found' }), true;
    const b = await readBody(req);
    const paras = String(doc.content || '').split('\n\n');
    const idx = Number(b.paragraph || 0);
    if (idx < 0 || idx >= paras.length) return send(res, 400, { error: 'paragraph index out of range' }), true;
    paras[idx] = String(b.text == null ? '' : b.text);
    doc.content = paras.join('\n\n');
    doc.updatedAt = new Date().toISOString();
    db.versions.push({ id: uid(), docId: doc.id, content: doc.content, author: b.author || user.name, note: 'Edited paragraph ' + idx, createdAt: new Date().toISOString() });
    if (db.versions.filter(v => v.docId === doc.id).length > 20) { const keep = db.versions.filter(v => v.docId !== doc.id).concat(db.versions.filter(v => v.docId === doc.id).slice(-20)); db.versions = keep; }
    save();
    return send(res, 200, doc), true;
  }
  if (req.method === 'POST' && parts[1] === 'docs' && parts[3] === 'presence' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const b = await readBody(req);
    if (!presence.has(parts[2])) presence.set(parts[2], new Map());
    presence.get(parts[2]).set(b.name || user.name, { name: b.name || user.name, cursor: Number(b.cursor || 0), at: Date.now() });
    return send(res, 200, { ok: true }), true;
  }
  if (req.method === 'GET' && parts[1] === 'docs' && parts[3] === 'presence' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const m = presence.get(parts[2]) || new Map();
    const now = Date.now();
    const list = Array.from(m.values()).filter(p => now - p.at < 30000);
    return send(res, 200, list), true;
  }
  if (req.method === 'POST' && parts[1] === 'docs' && parts[3] === 'share' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const doc = db.documents.find(d => d.id === parts[2]);
    if (!doc) return send(res, 404, { error: 'not found' }), true;
    doc.shareToken = 'share-' + uid().slice(0, 10); save();
    return send(res, 200, { shareToken: doc.shareToken, shareLink: '/api/documents/' + doc.id + '?share=' + doc.shareToken }), true;
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
      if (parts[1] === 'ping') return send(res, 200, { ok: true, app: 'collaborative-doc-editor' });
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
server.listen(PORT, () => console.log('collaborative-doc-editor listening on http://localhost:' + PORT));
module.exports = { server };
