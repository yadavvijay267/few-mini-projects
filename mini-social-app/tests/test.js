'use strict';
// API test: starts the real server on a test port and exercises endpoints.
const { spawn } = require('child_process');
const path = require('path');
const PORT = 5031;
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
    const anon = await req('/api/posts');
    ok(anon.status === 401, 'unauthenticated API access rejected (401)');

    const feed = await req('/api/feed', { headers: H });
    ok(feed.status === 200 && feed.body.length >= 4, 'feed returns ranked posts');
    ok(feed.body[0].score >= feed.body[feed.body.length - 1].score, 'feed sorted by quality score desc');
    const oldViral = feed.body.find(p => p.id === 'po4');
    const fresh = feed.body.find(p => p.id === 'po2');
    ok(oldViral && fresh && fresh.score > oldViral.score, 'recency beats stale virality: fresh post outranks old viral post');
    const like = await req('/api/posts/po1/like', { method: 'POST', headers: H, body: '{}' });
    ok(like.status === 200 && Number(like.body.likes) === 13, 'like increments count');
    const notifs = await req('/api/notifications?user=Ana%20Sharma', { headers: H });
    ok(notifs.body.some(n => (n.text || '').indexOf('liked your post') >= 0), 'like creates a notification for the author');
    const fol = await req('/api/follow', { method: 'POST', headers: H, body: JSON.stringify({ following: 'Ravi Patel' }) });
    ok(fol.status === 201, 'follow creates a follow record');
    const dup = await req('/api/follow', { method: 'POST', headers: H, body: JSON.stringify({ following: 'Ravi Patel' }) });
    ok(dup.status === 409, 'duplicate follow rejected (409)');
    const prof = await req('/api/profiles/Ana%20Sharma', { headers: H });
    ok(prof.status === 200 && prof.body.followers >= 1 && prof.body.posts >= 2, 'profile page: follower count + post history');

  } finally { srv.kill(); }
  console.log('ALL ' + passed + ' TESTS PASSED');
})().catch(e => { console.error(e.message); process.exit(1); });
