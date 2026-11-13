'use strict';
// Social Media App (Mini) — zero-dependency Node.js server (built-in http/crypto only).
// Persistence: JSON-file store (data.json, seeded from assets/seed.json).
// Production path: swap the load()/save() pair for PostgreSQL + Prisma;
// the REST shapes below stay the same.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4031;
const SECRET = process.env.SESSION_SECRET || 'mini-social-app-dev-secret-change-me';
const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data.json');
const SEED = path.join(ROOT, 'assets', 'seed.json');
const SCHEMA = {"posts": {"label": "Posts", "singular": "post", "fields": [{"key": "author", "label": "Author", "type": "text"}, {"key": "content", "label": "Content", "type": "textarea"}, {"key": "likes", "label": "Likes", "type": "number"}, {"key": "reposts", "label": "Reposts", "type": "number"}]}, "comments": {"label": "Comments", "singular": "comment", "fields": [{"key": "postId", "label": "Post ID", "type": "text"}, {"key": "author", "label": "Author", "type": "text"}, {"key": "text", "label": "Comment", "type": "textarea"}]}, "follows": {"label": "Follows", "singular": "follow", "fields": [{"key": "follower", "label": "Follower", "type": "text"}, {"key": "following", "label": "Following", "type": "text"}]}, "notifications": {"label": "Notifications", "singular": "notification", "fields": [{"key": "user", "label": "For user", "type": "text"}, {"key": "text", "label": "Text", "type": "text"}, {"key": "type", "label": "Type", "type": "text"}]}};

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

function notify(targetUser, text, type) {
  if (!targetUser) return;
  db.notifications.unshift({ id: uid(), user: targetUser, text: text, type: type, createdAt: new Date().toISOString() });
}
function feedScore(p) {
  const comments = db.comments.filter(c => c.postId === p.id).length;
  const ageHours = Math.max(0, (Date.now() - new Date(p.createdAt).getTime()) / 36e5);
  const recency = Math.max(0, 48 - ageHours); // up to 48 points, decays to 0
  return Math.round(((Number(p.likes || 0) * 2) + (Number(p.reposts || 0) * 3) + (comments * 3) + recency) * 10) / 10;
}

async function handleCustom(req, res, parts, parsed, user) {

  if (req.method === 'GET' && parts[1] === 'feed') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const following = db.follows.filter(f => f.follower === (parsed.query.user || user.name)).map(f => f.following);
    let list = db.posts.slice();
    if (parsed.query.following === 'only') list = list.filter(p => following.indexOf(p.author) >= 0 || p.author === user.name);
    const ranked = list.map(p => ({ id: p.id, author: p.author, content: p.content, likes: p.likes, reposts: p.reposts, comments: db.comments.filter(c => c.postId === p.id).length, createdAt: p.createdAt, score: feedScore(p) }));
    ranked.sort((a, b) => b.score - a.score);
    return send(res, 200, ranked), true;
  }
  if (req.method === 'POST' && parts[1] === 'posts' && parts[3] === 'like' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const p = db.posts.find(x => x.id === parts[2]);
    if (!p) return send(res, 404, { error: 'not found' }), true;
    p.likes = Number(p.likes || 0) + 1; save();
    notify(p.author, user.name + ' liked your post.', 'like');
    return send(res, 200, p), true;
  }
  if (req.method === 'POST' && parts[1] === 'posts' && parts[3] === 'repost' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const p = db.posts.find(x => x.id === parts[2]);
    if (!p) return send(res, 404, { error: 'not found' }), true;
    p.reposts = Number(p.reposts || 0) + 1;
    db.posts.unshift({ id: uid(), author: user.name, content: 'Reposted: ' + p.content, likes: 0, reposts: 0, createdAt: new Date().toISOString() });
    save();
    notify(p.author, user.name + ' reposted your post.', 'repost');
    return send(res, 200, p), true;
  }
  if (req.method === 'POST' && parts[1] === 'follow') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const b = await readBody(req);
    const follower = b.follower || user.name, following = b.following;
    if (!following) return send(res, 400, { error: 'following required' }), true;
    if (db.follows.some(f => f.follower === follower && f.following === following)) return send(res, 409, { error: 'already following' }), true;
    const rec = { id: uid(), follower: follower, following: following, createdAt: new Date().toISOString() };
    db.follows.push(rec);
    notify(following, follower + ' started following you.', 'follow');
    save();
    return send(res, 201, rec), true;
  }
  if (req.method === 'GET' && parts[1] === 'profiles' && parts.length === 3) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const name = decodeURIComponent(parts[2]);
    const posts = db.posts.filter(p => p.author === name);
    return send(res, 200, { name: name, posts: posts.length, followers: db.follows.filter(f => f.following === name).length, following: db.follows.filter(f => f.follower === name).length, postHistory: posts }), true;
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
      if (parts[1] === 'ping') return send(res, 200, { ok: true, app: 'mini-social-app' });
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
server.listen(PORT, () => console.log('mini-social-app listening on http://localhost:' + PORT));
module.exports = { server };
