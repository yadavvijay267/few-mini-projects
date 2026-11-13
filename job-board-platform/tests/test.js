'use strict';
// API test: starts the real server on a test port and exercises endpoints.
const { spawn } = require('child_process');
const path = require('path');
const PORT = 5030;
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
    const anon = await req('/api/jobs');
    ok(anon.status === 401, 'unauthenticated API access rejected (401)');

    const apply = await req('/api/jobs/j1/apply', { method: 'POST', headers: H, body: JSON.stringify({ applicantName: 'Test Candidate', email: 'test@example.com', skills: 'React, JavaScript, CSS' }) });
    ok(apply.status === 201 && apply.body.matchScore === 100, 'apply computes match score 100 for full skill overlap');
    const ranked = await req('/api/jobs/j1/applicants', { headers: H });
    ok(ranked.status === 200 && ranked.body.length >= 2 && ranked.body[0].matchScore >= ranked.body[ranked.body.length - 1].matchScore, 'applicants ranked by match score desc');
    const weak = await req('/api/jobs/j1/match?skills=Python', { headers: H });
    ok(weak.status === 200 && weak.body.matchScore === 0, 'unrelated skills score 0');
    const dash = await req('/api/employer/dashboard', { headers: H });
    ok(dash.status === 200 && dash.body.byJob.some(j => j.jobId === 'j1' && j.applicants >= 3), 'employer dashboard pipeline counts applicants per job');
    const remote = await req('/api/jobs?remote=Yes', { headers: H });
    ok(remote.status === 200 && remote.body.length >= 2 && remote.body.every(j => j.remote === 'Yes'), 'filter jobs by remote');

  } finally { srv.kill(); }
  console.log('ALL ' + passed + ' TESTS PASSED');
})().catch(e => { console.error(e.message); process.exit(1); });
