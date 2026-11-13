// GraphQL Blog API — single POST /graphql endpoint + SSE subscriptions for new comments.
// Node built-ins only. Auth: mutations require `Authorization: Bearer demo-token`
// (demo token; production path is JWT — see docs/SCHEMA.md).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execute, commentEvents } = require('./graphql');
const PORT = process.env.PORT || 3002;
const DEMO_TOKEN = process.env.API_TOKEN || 'demo-token';

function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj, null, 2)); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = ''; req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(fs.readFileSync(path.join(__dirname, 'playground.html'), 'utf8'));
  }
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });
  // Subscription: server-sent events stream of new comments.
  if (req.method === 'GET' && url.pathname === '/subscriptions/new-comments') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const onComment = (c) => res.write(`data: ${JSON.stringify(c)}\n\n`);
    commentEvents.on('comment', onComment);
    req.on('close', () => commentEvents.off('comment', onComment));
    return res.write(': connected — new comments will stream here\n\n');
  }
  if (req.method === 'POST' && url.pathname === '/graphql') {
    try {
      const body = await readBody(req);
      if (!body.query) return send(res, 400, { errors: [{ message: 'Missing query' }] });
      const auth = req.headers.authorization || '';
      const user = auth === 'Bearer ' + DEMO_TOKEN ? { id: 'demo-user' } : null;
      const result = await execute({ query: body.query, variables: body.variables || {}, user });
      return send(res, 200, result);
    } catch (e) { return send(res, 400, { errors: [{ message: e.message }] }); }
  }
  send(res, 404, { errors: [{ message: 'Not found. Use POST /graphql.' }] });
});
server.listen(PORT, () => console.log(`GraphQL blog API on http://localhost:${PORT}/graphql`));
module.exports = { server };
