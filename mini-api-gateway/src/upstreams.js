// Demo upstream services (run in-process on their own ports so the gateway
// genuinely proxies HTTP requests to them, like a real gateway).
const http = require('http');
function startUpstream(port, name, routes) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const handler = routes[url.pathname];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (handler) res.end(JSON.stringify(handler(url, req)));
    else res.end(JSON.stringify({ service: name, error: 'not found', path: url.pathname }));
  });
  return new Promise(resolve => server.listen(port, () => { console.log(`Upstream ${name} on :${port}`); resolve(server); }));
}
async function startAll() {
  // Paths are post-strip: the gateway forwards /api/users -> / and /api/users/1 -> /1.
  const users = await startUpstream(3101, 'users-service', {
    '/': () => [{ id: 1, name: 'Clamor', role: 'admin' }, { id: 2, name: 'Guest', role: 'viewer' }],
    '/1': () => ({ id: 1, name: 'Clamor', role: 'admin' }),
  });
  const posts = await startUpstream(3102, 'posts-service', {
    '/': () => [{ id: 1, title: 'Hello from the posts service' }],
    '/1': () => ({ id: 1, title: 'Hello from the posts service', body: 'Served via the gateway.' }),
  });
  return [users, posts];
}
module.exports = { startAll };
