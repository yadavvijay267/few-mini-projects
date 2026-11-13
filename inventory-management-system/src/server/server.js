'use strict';
// Inventory Management System — zero-dependency Node.js server (built-in http/crypto only).
// Persistence: JSON-file store (data.json, seeded from assets/seed.json).
// Production path: swap the load()/save() pair for PostgreSQL + Prisma;
// the REST shapes below stay the same.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4033;
const SECRET = process.env.SESSION_SECRET || 'inventory-management-system-dev-secret-change-me';
const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data.json');
const SEED = path.join(ROOT, 'assets', 'seed.json');
const SCHEMA = {"warehouses": {"label": "Warehouses", "singular": "warehouse", "fields": [{"key": "name", "label": "Name", "type": "text"}, {"key": "location", "label": "Location", "type": "text"}]}, "items": {"label": "Items", "singular": "item", "fields": [{"key": "name", "label": "Name", "type": "text"}, {"key": "sku", "label": "SKU", "type": "text"}, {"key": "category", "label": "Category", "type": "text"}, {"key": "price", "label": "Price", "type": "number"}, {"key": "reorderPoint", "label": "Reorder point", "type": "number"}]}, "stock": {"label": "Stock levels", "singular": "stock row", "fields": [{"key": "itemId", "label": "Item ID", "type": "text"}, {"key": "warehouseId", "label": "Warehouse ID", "type": "text"}, {"key": "quantity", "label": "Quantity", "type": "number"}]}, "movements": {"label": "Stock movements", "singular": "movement", "fields": [{"key": "itemId", "label": "Item ID", "type": "text"}, {"key": "warehouseId", "label": "Warehouse ID", "type": "text"}, {"key": "change", "label": "Change", "type": "number"}, {"key": "reason", "label": "Reason", "type": "text"}]}, "purchaseOrders": {"label": "Purchase orders", "singular": "purchase order", "fields": [{"key": "itemId", "label": "Item ID", "type": "text"}, {"key": "supplier", "label": "Supplier", "type": "text"}, {"key": "quantity", "label": "Quantity", "type": "number"}, {"key": "status", "label": "Status", "type": "select", "options": ["Draft", "Ordered", "Received", "Cancelled"]}]}};

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

function totalStock(itemId) { return db.stock.filter(s => s.itemId === itemId).reduce((n, s) => n + Number(s.quantity || 0), 0); }

async function handleCustom(req, res, parts, parsed, user) {

  if (req.method === 'GET' && parts[1] === 'alerts') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const low = db.items.filter(it => totalStock(it.id) <= Number(it.reorderPoint)).map(it => ({ id: it.id, name: it.name, sku: it.sku, totalStock: totalStock(it.id), reorderPoint: it.reorderPoint, reorderSuggestion: Math.max(10, Number(it.reorderPoint) * 3 - totalStock(it.id)) }));
    return send(res, 200, { lowStock: low, count: low.length }), true;
  }
  if (req.method === 'GET' && parts[1] === 'forecast') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    // Daily usage = outbound movements over the last 30 days / 30.
    const cutoff = Date.now() - 30 * 864e5;
    const rows = db.items.map(it => {
      const out = db.movements.filter(m => m.itemId === it.id && Number(m.change) < 0 && new Date(m.createdAt).getTime() >= cutoff).reduce((n, m) => n + Math.abs(Number(m.change)), 0);
      const daily = out / 30;
      const stock = totalStock(it.id);
      const daysLeft = daily > 0 ? Math.round((stock / daily) * 10) / 10 : null;
      return { id: it.id, name: it.name, totalStock: stock, dailyUsage: Math.round(daily * 100) / 100, daysLeft: daysLeft, atRisk30d: daysLeft !== null && daysLeft <= 30 };
    });
    return send(res, 200, { forecast: rows, atRisk: rows.filter(r => r.atRisk30d) }), true;
  }
  if (req.method === 'GET' && parts[1] === 'reports' && parts[2] === 'valuation') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const lines = db.items.map(it => ({ id: it.id, name: it.name, totalStock: totalStock(it.id), price: it.price, value: Math.round(totalStock(it.id) * Number(it.price) * 100) / 100 }));
    const total = Math.round(lines.reduce((s, l) => s + l.value, 0) * 100) / 100;
    return send(res, 200, { lines: lines, totalValue: total, currency: 'INR' }), true;
  }
  if (req.method === 'POST' && parts[1] === 'stock' && parts[2] === 'transfer') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const b = await readBody(req);
    const qty = Number(b.quantity || 0);
    if (!b.itemId || !b.fromWarehouseId || !b.toWarehouseId || qty <= 0) return send(res, 400, { error: 'itemId, fromWarehouseId, toWarehouseId and quantity > 0 required' }), true;
    if (b.fromWarehouseId === b.toWarehouseId) return send(res, 400, { error: 'source and destination warehouses must differ' }), true;
    const from = db.stock.find(s => s.itemId === b.itemId && s.warehouseId === b.fromWarehouseId);
    if (!from || Number(from.quantity) < qty) return send(res, 409, { error: 'insufficient stock in source warehouse' }), true;
    from.quantity = Number(from.quantity) - qty;
    let to = db.stock.find(s => s.itemId === b.itemId && s.warehouseId === b.toWarehouseId);
    if (!to) { to = { id: uid(), itemId: b.itemId, warehouseId: b.toWarehouseId, quantity: 0, createdAt: new Date().toISOString() }; db.stock.push(to); }
    to.quantity = Number(to.quantity) + qty;
    db.movements.push({ id: uid(), itemId: b.itemId, warehouseId: b.fromWarehouseId, change: -qty, reason: 'Transfer to ' + b.toWarehouseId, createdAt: new Date().toISOString() });
    db.movements.push({ id: uid(), itemId: b.itemId, warehouseId: b.toWarehouseId, change: qty, reason: 'Transfer from ' + b.fromWarehouseId, createdAt: new Date().toISOString() });
    save();
    return send(res, 200, { from: from, to: to }), true;
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
      if (parts[1] === 'ping') return send(res, 200, { ok: true, app: 'inventory-management-system' });
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
server.listen(PORT, () => console.log('inventory-management-system listening on http://localhost:' + PORT));
module.exports = { server };
