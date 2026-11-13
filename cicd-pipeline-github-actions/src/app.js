// Demo app the pipeline tests, lints, builds and deploys.
// A tiny greeting + health API (Node built-ins only) plus a pure module
// (src/math.js) that the unit tests exercise.
const http = require("http");
const { add, average, formatUptime } = require("./math");
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const json = (status, obj) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  if (req.method === "GET" && url.pathname === "/health") return json(200, { status: "ok", uptime: formatUptime(process.uptime()) });
  if (req.method === "GET" && url.pathname === "/") {
    const version = process.env.APP_VERSION || "1.0.0";
    return json(200, { service: "cicd-demo-app", version, message: "Hello from the CI/CD demo app" });
  }
  if (req.method === "GET" && url.pathname === "/api/add") {
    const a = Number(url.searchParams.get("a")), b = Number(url.searchParams.get("b"));
    if (Number.isNaN(a) || Number.isNaN(b)) return json(400, { error: "a and b must be numbers" });
    return json(200, { a, b, sum: add(a, b), average: average([a, b]) });
  }
  return json(404, { error: "Not found" });
});
if (require.main === module) server.listen(PORT, () => console.log("Demo app on http://localhost:" + PORT));
module.exports = server;
