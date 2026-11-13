// Gateway tests — starts gateway + upstreams, proves routing, auth, and rate limiting.
const assert = require('assert');
const { start, server } = require('../src/gateway');
const { TokenBucket } = require('../src/rateLimiter');

function req(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = require('http').request({ hostname: 'localhost', port: 3003, path, headers },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d })); });
    r.on('error', reject); r.end();
  });
}
(async () => {
  // Unit: token bucket refills over time and blocks when empty.
  const b = new TokenBucket(2, 10);
  assert.strictEqual(b.tryConsume().allowed, true);
  assert.strictEqual(b.tryConsume().allowed, true);
  const blocked = b.tryConsume();
  assert.strictEqual(blocked.allowed, false);
  assert.ok(blocked.retryAfter >= 0);

  await start();
  // 1. Health endpoint, no auth needed.
  const h = await req('/health');
  assert.strictEqual(h.status, 200);
  // 2. No credentials -> 401.
  const unauth = await req('/api/users');
  assert.strictEqual(unauth.status, 401);
  // 3. Routing: valid key reaches the users upstream.
  const ok = await req('/api/users', { 'X-Api-Key': 'demo-key-123' });
  assert.strictEqual(ok.status, 200);
  assert.ok(JSON.parse(ok.body)[0].name === 'Clamor');
  assert.strictEqual(ok.headers['x-ratelimit-limit'], '10');
  assert.ok('x-ratelimit-remaining' in ok.headers, 'gateway must expose remaining quota');
  // 4. Unknown route -> 404.
  const nf = await req('/api/nope', { 'X-Api-Key': 'demo-key-123' });
  assert.strictEqual(nf.status, 404);
  // 5. Rate limiter blocks over-limit requests: demo key capacity 10, refill 1/s.
  //    We already spent 2 (users + 404 counts? no — 404 happens before limiting, so 1 spent).
  //    Fire 12 more; at least one must be 429.
  let seen429 = false, seenRetryAfter = false;
  for (let i = 0; i < 12; i++) {
    const r = await req('/api/posts', { 'X-Api-Key': 'demo-key-123' });
    if (r.status === 429) { seen429 = true; if (r.headers['retry-after']) seenRetryAfter = true; }
  }
  assert.ok(seen429, 'rate limiter must return 429 over the limit');
  assert.ok(seenRetryAfter, '429 must include Retry-After');
  // 6. Bearer token auth works (mint one, then use it).
  const tokenRes = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ sub: 'tester' });
    const r = require('http').request({ hostname: 'localhost', port: 3003, path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    r.on('error', reject); r.write(body); r.end();
  });
  assert.ok(tokenRes.token, 'token minted');
  const authed = await req('/api/posts/1', { Authorization: 'Bearer ' + tokenRes.token });
  assert.strictEqual(authed.status, 200);
  // 7. Quota dashboard endpoint reports usage.
  const quota = JSON.parse((await req('/quota')).body);
  assert.ok(quota.some(k => k.usage.blocked > 0), 'quota must show blocked requests');
  console.log('mini-api-gateway tests: all assertions passed');
  server.close(() => process.exit(0));
})().catch(e => { console.error(e); server.close(() => process.exit(1)); });
