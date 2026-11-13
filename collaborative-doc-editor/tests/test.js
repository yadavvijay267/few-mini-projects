'use strict';
// API test: starts the real server on a test port and exercises endpoints.
const { spawn } = require('child_process');
const path = require('path');
const PORT = 5029;
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
    const anon = await req('/api/documents');
    ok(anon.status === 401, 'unauthenticated API access rejected (401)');

    const doc = await req('/api/documents', { method: 'POST', headers: H, body: JSON.stringify({ title: 'Sync Test', content: 'Para one\n\nPara two', owner: 'Demo User' }) });
    ok(doc.status === 201 && doc.body.id, 'create document');
    const edit = await req('/api/docs/' + doc.body.id + '/edit', { method: 'POST', headers: H, body: JSON.stringify({ paragraph: 1, text: 'Para two (edited)' }) });
    ok(edit.status === 200 && (edit.body.content || '').indexOf('Para two (edited)') >= 0 && (edit.body.content || '').indexOf('Para one') >= 0, 'paragraph edit is last-writer-wins per paragraph (other paragraph untouched)');
    const vers = await req('/api/versions?docId=' + doc.body.id, { headers: H });
    ok(vers.status === 200 && vers.body.length >= 1, 'edit creates a version-history entry');
    const pres = await req('/api/docs/' + doc.body.id + '/presence', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Demo User', cursor: 2 }) });
    ok(pres.status === 200, 'presence heartbeat accepted');
    const who = await req('/api/docs/' + doc.body.id + '/presence', { headers: H });
    ok(who.status === 200 && who.body.some(p => p.name === 'Demo User'), 'presence list shows active editor');
    const share = await req('/api/docs/' + doc.body.id + '/share', { method: 'POST', headers: H, body: '{}' });
    ok(share.status === 200 && share.body.shareToken && share.body.shareLink, 'share link generated');

  } finally { srv.kill(); }
  console.log('ALL ' + passed + ' TESTS PASSED');
})().catch(e => { console.error(e.message); process.exit(1); });
