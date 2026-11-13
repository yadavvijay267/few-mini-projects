'use strict';
// API test: starts the real server on a test port and exercises endpoints.
const { spawn } = require('child_process');
const path = require('path');
const PORT = 5033;
const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(cond, name) { if (!cond) throw new Error('FAIL: ' + name); passed++; console.log('ok - ' + name); }
async function req(p, opts) {
  opts = opts || {};
  opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const r = await fetch('http://localhost:' + PORT + p, opts);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch (e) { j = null; }
  return { status: r.status, body: j, text: t };
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
(async () => {
  // Fresh seed on every run so tests are repeatable.
  try { require('fs').unlinkSync(path.join(ROOT, 'data.json')); } catch (e) {}
  const srv = spawn(process.execPath, [path.join(ROOT, 'src', 'server', 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }), cwd: ROOT, stdio: 'ignore'
  });
  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { await wait(250); try { const r = await req('/api/ping'); up = r.status === 200 && r.body && r.body.ok; } catch (e) {} }
    ok(up, 'server starts and /api/ping responds');
    const login = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@example.com', password: 'demo1234' }) });
    ok(login.status === 200 && login.body.token, 'demo login works');
    const H = { Authorization: 'Bearer ' + login.body.token };
    const bad = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@example.com', password: 'wrong' }) });
    ok(bad.status === 401, 'wrong password rejected (401)');
    const anon = await req('/api/warehouses');
    ok(anon.status === 401, 'unauthenticated API access rejected (401)');

    const alerts = await req('/api/alerts', { headers: H });
    ok(alerts.status === 200 && alerts.body.lowStock.some(i => i.id === 'i2'), 'low-stock alert flags RJ45 connectors (stock 3 <= reorder 10)');
    const fc = await req('/api/forecast', { headers: H });
    ok(fc.status === 200 && fc.body.forecast.some(f => f.id === 'i2' && f.daysLeft !== null), 'forecast computes days-left from movement history');
    const val = await req('/api/reports/valuation', { headers: H });
    ok(val.status === 200 && val.body.totalValue > 0 && val.body.lines.length === 5, 'valuation report totals all stock');
    const tr = await req('/api/stock/transfer', { method: 'POST', headers: H, body: JSON.stringify({ itemId: 'i1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 2 }) });
    ok(tr.status === 200 && Number(tr.body.from.quantity) === 10 && Number(tr.body.to.quantity) === 6, 'transfer moves 2 units w1 -> w2');
    const over = await req('/api/stock/transfer', { method: 'POST', headers: H, body: JSON.stringify({ itemId: 'i1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 999 }) });
    ok(over.status === 409, 'transfer beyond available stock rejected (409)');
    const mv = await req('/api/movements?itemId=i1', { headers: H });
    ok(mv.body.length >= 3, 'transfer logged in movement history');

  } finally { srv.kill(); }
  console.log('ALL ' + passed + ' TESTS PASSED');
})().catch(e => { console.error(e.message); process.exit(1); });
