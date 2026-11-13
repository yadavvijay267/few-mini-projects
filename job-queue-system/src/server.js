// Job Queue System — HTTP API + live dashboard. Node built-ins only.
//   POST /jobs            { type, payload, priority?, delayMs?, maxAttempts?, repeatMs? }
//   GET  /jobs            list (optional ?status=)
//   GET  /jobs/:id        one job
//   POST /jobs/:id/replay  re-queue a dead-letter job (the "replay dead-letter" button)
//   GET  /stats           counts
//   GET  /                dashboard UI
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Queue } = require('./queue');
const handlers = require('./handlers');

const PORT = process.env.PORT || 3001;
const queue = new Queue();
for (const [type, fn] of Object.entries(handlers)) queue.register(type, fn);
queue.start();

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8'));
    }
    if (req.method === 'GET' && url.pathname === '/stats') return send(res, 200, { counts: queue.counts(), types: Object.keys(handlers) });
    if (req.method === 'GET' && url.pathname === '/jobs') return send(res, 200, queue.list(url.searchParams.get('status') || undefined));
    if (req.method === 'POST' && url.pathname === '/jobs') {
      const body = await readBody(req);
      if (!body.type) return send(res, 400, { error: 'type is required' });
      const job = queue.enqueue(body.type, body.payload, { priority: body.priority, delayMs: body.delayMs, maxAttempts: body.maxAttempts, repeatMs: body.repeatMs });
      return send(res, 201, job);
    }
    const replay = url.pathname.match(/^\/jobs\/([^/]+)\/replay$/);
    if (req.method === 'POST' && replay) {
      const job = queue.replayDead(replay[1]);
      if (!job) return send(res, 404, { error: 'Job not found or not dead' });
      return send(res, 200, job);
    }
    const one = url.pathname.match(/^\/jobs\/([^/]+)$/);
    if (req.method === 'GET' && one) {
      const job = queue.get(one[1]);
      if (!job) return send(res, 404, { error: 'Job not found' });
      return send(res, 200, job);
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) { send(res, 400, { error: e.message }); }
});

server.listen(PORT, () => console.log(`Job queue listening on http://localhost:${PORT}`));
// Graceful shutdown: finish in-flight jobs before exiting.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return; shuttingDown = true;
  console.log(`\n${signal}: graceful shutdown — finishing in-flight jobs…`);
  await queue.shutdown();
  server.close(() => { console.log('Shutdown complete.'); process.exit(0); });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
module.exports = { server, queue };
