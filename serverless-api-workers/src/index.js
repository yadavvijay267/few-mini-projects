// Cloudflare Worker entrypoint — src/index.js
// Deploy: `npx wrangler deploy` (see wrangler.toml). Local test: `npm test`
// invokes this handler directly; `scripts/dev.js` serves it over HTTP.
const { createStore, handle } = require("./shared");

const store = createStore();

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

module.exports = {
  // Standard Workers fetch handler.
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let body = null;
    if (request.method === "POST" || request.method === "PATCH") {
      try { body = await request.json(); } catch { return jsonResponse(400, { error: "Invalid JSON body" }); }
    }
    const headers = {};
    request.headers.forEach((v, k) => { headers[k] = v; });
    const result = await handle(store, request.method, url.pathname, headers, body);
    return jsonResponse(result.status, result.body);
  },
  // Scheduled handler: runs the daily summary (wrangler.toml [triggers] cron).
  async scheduled(event, env, ctx) {
    const summary = store.dailySummary();
    console.log("Daily summary:", JSON.stringify(summary));
    return summary;
  },
  // Exposed for the local test harness.
  _store: store,
};
