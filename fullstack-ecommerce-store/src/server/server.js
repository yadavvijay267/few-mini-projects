'use strict';
// E-Commerce Store (Full Stack) — zero-dependency Node.js server (built-in http/crypto only).
// Persistence: JSON-file store (data.json, seeded from assets/seed.json).
// Production path: swap the load()/save() pair for PostgreSQL + Prisma;
// the REST shapes below stay the same.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4028;
const SECRET = process.env.SESSION_SECRET || 'fullstack-ecommerce-store-dev-secret-change-me';
const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data.json');
const SEED = path.join(ROOT, 'assets', 'seed.json');
const SCHEMA = {"products": {"label": "Products", "singular": "product", "fields": [{"key": "name", "label": "Name", "type": "text"}, {"key": "price", "label": "Price", "type": "number"}, {"key": "stock", "label": "Stock", "type": "number"}, {"key": "category", "label": "Category", "type": "select", "options": ["Electronics", "Clothing", "Home", "Books", "Sports"]}, {"key": "description", "label": "Description", "type": "textarea"}]}, "orders": {"label": "Orders", "singular": "order", "fields": [{"key": "customer", "label": "Customer", "type": "text"}, {"key": "items", "label": "Items", "type": "text"}, {"key": "total", "label": "Total", "type": "number"}, {"key": "status", "label": "Status", "type": "select", "options": ["Pending", "Paid", "Shipped", "Delivered", "Cancelled"]}, {"key": "paymentRef", "label": "Payment ref", "type": "text"}]}, "abandonedCarts": {"label": "Abandoned carts", "singular": "abandoned cart", "fields": [{"key": "customer", "label": "Customer", "type": "text"}, {"key": "items", "label": "Items", "type": "text"}, {"key": "total", "label": "Total", "type": "number"}]}};

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

  if (req.method === 'GET' && parts[1] === 'alerts') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const low = db.products.filter(p => Number(p.stock) <= 5).map(p => ({ id: p.id, name: p.name, stock: p.stock, reorderSuggestion: Math.max(10, 20 - Number(p.stock)) }));
    return send(res, 200, { lowStock: low, count: low.length }), true;
  }
  if (req.method === 'GET' && parts[1] === 'admin' && parts[2] === 'stats') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const revenue = db.orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + Number(o.total || 0), 0);
    return send(res, 200, { revenue: Math.round(revenue * 100) / 100, orders: db.orders.length, products: db.products.length, lowStock: db.products.filter(p => Number(p.stock) <= 5).length, abandonedCarts: db.abandonedCarts.length }), true;
  }
  if (req.method === 'POST' && parts[1] === 'cart' && parts[2] === 'abandon') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const b = await readBody(req);
    const rec = { id: uid(), customer: b.customer || user.email, items: b.items || '', total: Number(b.total || 0), createdAt: new Date().toISOString() };
    db.abandonedCarts.push(rec); save();
    return send(res, 201, { cart: rec, reminder: 'Reminder email queued: "You left items in your cart — complete your order within 24h for 10% off." (simulated, no real email sent.)' }), true;
  }
  if (req.method === 'POST' && parts[1] === 'checkout') {
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const b = await readBody(req);
    const items = Array.isArray(b.items) ? b.items : [];
    if (!items.length) return send(res, 400, { error: 'cart is empty' }), true;
    // Simulated Stripe test-mode payment: only the test card 4242... succeeds.
    if (String(b.card || '') !== '4242424242424242') return send(res, 402, { error: 'card declined (test mode: use 4242424242424242)' }), true;
    let total = 0; const desc = [];
    for (const it of items) {
      const p = db.products.find(x => x.id === it.productId);
      if (!p) return send(res, 404, { error: 'product not found: ' + it.productId }), true;
      if (Number(p.stock) < Number(it.qty || 1)) return send(res, 409, { error: 'insufficient stock for ' + p.name }), true;
    }
    for (const it of items) {
      const p = db.products.find(x => x.id === it.productId);
      p.stock = Number(p.stock) - Number(it.qty || 1);
      total += Number(p.price) * Number(it.qty || 1);
      desc.push(p.name + ' x' + (it.qty || 1));
    }
    total = Math.round(total * 100) / 100;
    const order = { id: uid(), customer: b.customer || user.email, items: desc.join(', '), total: total, status: 'Paid', paymentRef: 'pi_test_' + uid().slice(0, 8), createdAt: new Date().toISOString() };
    db.orders.push(order); save();
    return send(res, 201, { order: order, confirmation: 'Order confirmation email queued (simulated test SMTP). Thank you for your order!' }), true;
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
      if (parts[1] === 'ping') return send(res, 200, { ok: true, app: 'fullstack-ecommerce-store' });
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
server.listen(PORT, () => console.log('fullstack-ecommerce-store listening on http://localhost:' + PORT));
module.exports = { server };
