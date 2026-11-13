// Local dev server: serves the Cloudflare Worker handler over plain HTTP
// so you can curl it without wrangler. Run: node scripts/dev.js
const http = require("http");
const worker = require("../src/index");
const server = http.createServer(async (req, res) => {
  const body = await new Promise(resolve => {
    let d = ""; req.on("data", c => d += c); req.on("end", () => resolve(d));
  });
  const request = new Request("http://localhost" + req.url, {
    method: req.method, headers: req.headers, body: body || undefined,
  });
  const response = await worker.fetch(request, {}, {});
  res.writeHead(response.status, { "Content-Type": "application/json" });
  res.end(await response.text());
});
server.listen(8787, () => console.log("Worker running locally at http://localhost:8787 (wrangler dev not required)"));
