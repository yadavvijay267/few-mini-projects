// Mini API Gateway — routing, per-key token-bucket rate limiting,
// simple auth check, structured access logs, health endpoint, quota dashboard.
// Node built-ins only. Production path: Redis-backed buckets + JWT (see docs).
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { RateLimiter } = require('./rateLimiter');

const PORT = process.env.PORT || 3003;
// Route table: prefix -> upstream base URL.
const ROUTES = [
  { prefix: '/api/users', upstream: 'http://localhost:3101', stripPrefix: '/api/users' },
  { prefix: '/api/posts', upstream: 'http://localhost:3102', stripPrefix: '/api/posts' },
];
// API keys: key -> { name, capacity, refillPerSecond, requiresAuth }
const API_KEYS = {
  'demo-key-123': { name: 'demo-app', capacity: 10, refillPerSecond: 1 },
  'pro-key-456': { name: 'pro-app', capacity: 100, refillPerSecond: 10 },
};
// Simple auth: a request is authenticated if it carries a known API key OR a
// signed gateway token: base64(payload).base64(hmac-sha256(payload, GATEWAY_SECRET))
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'dev-secret-change-me';
function verifyToken(token) {
  try {
    const [payloadB64, sigB64] = token.split('.');
    const expected = crypto.createHmac('sha256', GATEWAY_SECRET).update(payloadB64).digest('base64');
    if (sigB64 !== expected) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}
function signToken(payload) {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return b64 + '.' + crypto.createHmac('sha256', GATEWAY_SECRET).update(b64).digest('base64');
}
const limiter = new RateLimiter();
const accessLog = []; // structured logs, capped at 500 entries
function log(entry) {
  accessLog.push({ ts: new Date().toISOString(), ...entry });
  if (accessLog.length > 500) accessLog.shift();
  console.log(JSON.stringify({ ts: entry.ts || new Date().toISOString(), ...entry }));
}
function proxy(req, res, route, upstreamPath) {
  const target = new URL(route.upstream + upstreamPath);
  const upstreamReq = http.request({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, method: req.method,
    headers: { ...req.headers, host: target.host, 'x-gateway': 'mini-api-gateway' } },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode, { ...upstreamRes.headers, 'x-gateway': 'mini-api-gateway' });
      upstreamRes.pipe(res);
    });
  upstreamReq.on('error', () => { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Bad gateway: upstream unavailable' })); });
  req.pipe(upstreamReq);
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const started = Date.now();
  const done = (status, extra = {}) => log({ method: req.method, path: url.pathname, status, ms: Date.now() - started, key: req.apiKeyName || '-', ...extra });
  if (req.method === 'GET' && url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, uptimeSec: Math.floor(process.uptime()) })); return done(200); }
  if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8')); return done(200); }
  if (req.method === 'GET' && url.pathname === '/quota') {
    const data = Object.entries(API_KEYS).map(([key, cfg]) => ({ key: key.slice(0, 8) + '…', name: cfg.name, limit: cfg.capacity, refillPerSecond: cfg.refillPerSecond, usage: limiter.usageFor(key) }));
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); return done(200);
  }
  if (req.method === 'GET' && url.pathname === '/logs') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(accessLog.slice(-100))); return done(200); }
  if (req.method === 'POST' && url.pathname === '/token') {
    // Demo token issuer: POST /token { "sub": "alice" } -> signed token (valid 1h).
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      let sub = 'demo-user'; try { sub = JSON.parse(body || '{}').sub || sub; } catch {}
      const token = signToken({ sub, exp: Math.floor(Date.now() / 1000) + 3600 });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ token })); done(200);
    }); return;
  }
  // --- Auth check: API key header OR Bearer token ---
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization || '';
  let keyCfg = null, keyName = null;
  if (apiKey && API_KEYS[apiKey]) { keyCfg = API_KEYS[apiKey]; keyName = keyCfg.name; req.apiKeyName = keyName; }
  else if (authHeader.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload) { keyCfg = API_KEYS['demo-key-123']; keyName = 'token:' + payload.sub; req.apiKeyName = keyName; }
  }
  if (!keyCfg) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: provide X-Api-Key or a Bearer token (POST /token to mint one)' }));
    return done(401);
  }
  // --- Route matching ---
  const route = ROUTES.find(r => url.pathname === r.prefix || url.pathname.startsWith(r.prefix + '/'));
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No route for ' + url.pathname }));
    return done(404);
  }
  // --- Rate limiting (per key, token bucket) ---
  const limitKey = apiKey || keyName;
  const result = limiter.check(limitKey, keyCfg);
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter);
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rate limit exceeded', retryAfterSec: result.retryAfter }));
    return done(429, { rateLimited: true });
  }
  const upstreamPath = url.pathname.slice(route.stripPrefix.length) || '/';
  proxy(req, res, route, upstreamPath + url.search);
  res.on('finish', () => done(res.statusCode));
});
async function start() {
  const { startAll } = require('./upstreams');
  await startAll();
  return new Promise(resolve => server.listen(PORT, () => { console.log(`Gateway on http://localhost:${PORT}`); resolve(server); }));
}
if (require.main === module) start();
module.exports = { server, start, limiter, API_KEYS, verifyToken, signToken, ROUTES };
