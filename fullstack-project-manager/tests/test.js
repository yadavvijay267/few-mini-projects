'use strict';
// API test: starts the real server on a test port and exercises endpoints.
const { spawn } = require('child_process');
const path = require('path');
const PORT = 5027;
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
    const anon = await req('/api/projects');
    ok(anon.status === 401, 'unauthenticated API access rejected (401)');

    const proj = await req('/api/projects', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Test Project', description: 't', status: 'Active', owner: 'Demo User' }) });
    ok(proj.status === 201 && proj.body.id, 'create project');
    const task = await req('/api/tasks', { method: 'POST', headers: H, body: JSON.stringify({ title: 'Overdue test task', projectId: proj.body.id, assignee: 'Ana Sharma', status: 'Todo', priority: 'High', dueDate: '2020-01-01' }) });
    ok(task.status === 201, 'create overdue task');
    const health = await req('/api/projects/' + proj.body.id + '/health', { headers: H });
    ok(health.status === 200 && health.body.score < 100 && health.body.overdue === 1, 'health score penalises overdue task (score=' + health.body.score + ')');
    const dash = await req('/api/dashboard', { headers: H });
    ok(dash.status === 200 && dash.body.overdue >= 1 && Array.isArray(dash.body.recentActivity), 'dashboard digest lists overdue tasks + activity');
    const act = await req('/api/activities', { headers: H });
    ok(act.body.some(a => (a.action || '').indexOf('Overdue test task') >= 0), 'task creation logged to activity feed');

  } finally { srv.kill(); }
  console.log('ALL ' + passed + ' TESTS PASSED');
})().catch(e => { console.error(e.message); process.exit(1); });
