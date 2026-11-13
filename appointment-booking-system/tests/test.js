'use strict';
// API test: starts the real server on a test port and exercises endpoints.
const { spawn } = require('child_process');
const path = require('path');
const PORT = 5032;
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
    const anon = await req('/api/services');
    ok(anon.status === 401, 'unauthenticated API access rejected (401)');

    const slots0 = await req('/api/services/sv1/slots?date=2026-12-01', { headers: H });
    ok(slots0.status === 200 && slots0.body.slots.length === 8 && slots0.body.slots.every(s => s.available), 'all 8 slots free on an empty day');
    const b1 = await req('/api/bookings', { method: 'POST', headers: H, body: JSON.stringify({ serviceId: 'sv1', provider: 'Ana Sharma', customerName: 'Test User', date: '2026-12-01', time: '10:00' }) });
    ok(b1.status === 201 && b1.body.booking.status === 'Confirmed', 'booking created and confirmed');
    const slots1 = await req('/api/services/sv1/slots?date=2026-12-01', { headers: H });
    ok(slots1.body.slots.find(s => s.time === '10:00').available === false, 'booked slot shows unavailable');
    // Race-condition test: 10 concurrent requests for the SAME slot — exactly one must win.
    const race = await Promise.all(Array.from({ length: 10 }, () => req('/api/bookings', { method: 'POST', headers: H, body: JSON.stringify({ serviceId: 'sv1', provider: 'Ana Sharma', customerName: 'Racer', date: '2026-12-02', time: '11:00' }) })));
    const wins = race.filter(r => r.status === 201).length;
    const conflicts = race.filter(r => r.status === 409).length;
    ok(wins === 1 && conflicts === 9, 'race test: exactly 1 of 10 concurrent bookings wins, 9 get 409 (wins=' + wins + ')');
    // 24h policy: a booking ~2h from now cannot be cancelled.
    const now = new Date(Date.now() + 2 * 36e5);
    const hh = String(now.getHours()).padStart(2, '0') + ':00';
    const dd = now.toISOString().slice(0, 10);
    const soon = await req('/api/bookings', { method: 'POST', headers: H, body: JSON.stringify({ serviceId: 'sv3', provider: '', customerName: 'Soon User', date: dd, time: hh }) });
    ok(soon.status === 201, 'near-term booking created');
    const cancelSoon = await req('/api/bookings/' + soon.body.booking.id + '/cancel', { method: 'POST', headers: H, body: '{}' });
    ok(cancelSoon.status === 400, 'cancellation inside 24h rejected (400)');
    const cancelFar = await req('/api/bookings/' + b1.body.booking.id + '/cancel', { method: 'POST', headers: H, body: '{}' });
    ok(cancelFar.status === 200 && cancelFar.body.status === 'Cancelled', 'cancellation with 24h+ notice succeeds');
    const resched = await req('/api/bookings/b2/reschedule', { method: 'POST', headers: H, body: JSON.stringify({ date: '2026-11-22', time: '12:00' }) });
    ok(resched.status === 200 && resched.body.date === '2026-11-22', 'reschedule moves booking');

  } finally { srv.kill(); }
  console.log('ALL ' + passed + ' TESTS PASSED');
})().catch(e => { console.error(e.message); process.exit(1); });
