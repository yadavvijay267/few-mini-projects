'use strict';
// Booking System (Appointments) — zero-dependency Node.js server (built-in http/crypto only).
// Persistence: JSON-file store (data.json, seeded from assets/seed.json).
// Production path: swap the load()/save() pair for PostgreSQL + Prisma;
// the REST shapes below stay the same.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4032;
const SECRET = process.env.SESSION_SECRET || 'appointment-booking-system-dev-secret-change-me';
const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data.json');
const SEED = path.join(ROOT, 'assets', 'seed.json');
const SCHEMA = {"services": {"label": "Services", "singular": "service", "fields": [{"key": "name", "label": "Name", "type": "text"}, {"key": "duration", "label": "Duration (min)", "type": "number"}, {"key": "price", "label": "Price", "type": "number"}, {"key": "description", "label": "Description", "type": "textarea"}]}, "providers": {"label": "Providers", "singular": "provider", "fields": [{"key": "name", "label": "Name", "type": "text"}, {"key": "service", "label": "Service", "type": "text"}, {"key": "email", "label": "Email", "type": "text"}]}, "bookings": {"label": "Bookings", "singular": "booking", "fields": [{"key": "serviceId", "label": "Service ID", "type": "text"}, {"key": "provider", "label": "Provider", "type": "text"}, {"key": "customerName", "label": "Customer", "type": "text"}, {"key": "date", "label": "Date", "type": "date"}, {"key": "time", "label": "Time (HH:MM)", "type": "text"}, {"key": "status", "label": "Status", "type": "select", "options": ["Confirmed", "Cancelled", "Completed"]}]}};

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
const slotLocks = new Set(); // in-memory lock keys serviceId|date|time held during booking creation
async function handleCustom(req, res, parts, parsed, user) {

  if (req.method === 'GET' && parts[1] === 'services' && parts[3] === 'slots' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const svc = db.services.find(s => s.id === parts[2]);
    if (!svc) return send(res, 404, { error: 'service not found' }), true;
    const date = parsed.query.date || new Date().toISOString().slice(0, 10);
    const taken = new Set(db.bookings.filter(b => b.serviceId === svc.id && b.date === date && b.status === 'Confirmed').map(b => b.time));
    const slots = [];
    for (let h = 9; h < 17; h++) { const t = String(h).padStart(2, '0') + ':00'; slots.push({ time: t, available: !taken.has(t) && !slotLocks.has(svc.id + '|' + date + '|' + t) }); }
    return send(res, 200, { serviceId: svc.id, date: date, slots: slots }), true;
  }
  if (req.method === 'POST' && parts[1] === 'bookings' && parts.length === 2) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const b = await readBody(req);
    if (!b.serviceId || !b.date || !b.time) return send(res, 400, { error: 'serviceId, date and time required' }), true;
    const key = b.serviceId + '|' + b.date + '|' + b.time;
    // Slot lock: Node runs this handler synchronously between awaits, so the
    // check-and-reserve below is atomic within one event-loop turn.
    if (slotLocks.has(key)) return send(res, 409, { error: 'slot is being booked right now — try again' }), true;
    const clash = db.bookings.find(x => x.serviceId === b.serviceId && x.date === b.date && x.time === b.time && x.status === 'Confirmed');
    if (clash) return send(res, 409, { error: 'slot already booked' }), true;
    slotLocks.add(key);
    try {
      const rec = { id: uid(), serviceId: b.serviceId, provider: b.provider || '', customerName: b.customerName || user.name, date: b.date, time: b.time, status: 'Confirmed', createdAt: new Date().toISOString() };
      db.bookings.push(rec); save();
      return send(res, 201, { booking: rec, confirmation: 'Booking confirmed (simulated confirmation email queued).' }), true;
    } finally { slotLocks.delete(key); }
  }
  if (req.method === 'POST' && parts[1] === 'bookings' && parts[3] === 'cancel' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const bk = db.bookings.find(x => x.id === parts[2]);
    if (!bk) return send(res, 404, { error: 'not found' }), true;
    const when = new Date(bk.date + 'T' + bk.time + ':00').getTime();
    if (when - Date.now() < 24 * 36e5) return send(res, 400, { error: 'cancellation requires 24h notice' }), true;
    bk.status = 'Cancelled'; save();
    return send(res, 200, bk), true;
  }
  if (req.method === 'POST' && parts[1] === 'bookings' && parts[3] === 'reschedule' && parts.length === 4) {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const bk = db.bookings.find(x => x.id === parts[2]);
    if (!bk) return send(res, 404, { error: 'not found' }), true;
    const b = await readBody(req);
    const clash = db.bookings.find(x => x.id !== bk.id && x.serviceId === bk.serviceId && x.date === (b.date || bk.date) && x.time === (b.time || bk.time) && x.status === 'Confirmed');
    if (clash) return send(res, 409, { error: 'new slot already booked' }), true;
    bk.date = b.date || bk.date; bk.time = b.time || bk.time; save();
    return send(res, 200, bk), true;
  }
  if (req.method === 'GET' && parts[1] === 'reminders') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const soon = db.bookings.filter(b => b.status === 'Confirmed' && (new Date(b.date + 'T' + b.time + ':00').getTime() - Date.now()) > 0 && (new Date(b.date + 'T' + b.time + ':00').getTime() - Date.now()) < 48 * 36e5);
    return send(res, 200, soon.map(b => ({ booking: b, reminder: 'Reminder email queued for ' + b.customerName + ' — ' + b.date + ' ' + b.time + ' (simulated).' }))), true;
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
      if (parts[1] === 'ping') return send(res, 200, { ok: true, app: 'appointment-booking-system' });
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
server.listen(PORT, () => console.log('appointment-booking-system listening on http://localhost:' + PORT));
module.exports = { server };
