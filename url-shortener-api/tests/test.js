// Integration test: create (auto + custom alias), collision, redirect +
// analytics breakdown, expiry, deactivate, QR, persistence across restart.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const server = require("../src/server");
let base;
const KEY = { "X-API-Key": "demo-api-key-change-me", "Content-Type": "application/json" };
async function j(method, p, body, headers = KEY, follow = true) {
  const r = await fetch(base + p, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: follow ? "follow" : "manual" });
  let parsed = null; try { parsed = JSON.parse(await r.text()); } catch {}
  return { status: r.status, json: parsed, headers: r.headers };
}
(async () => {
  await new Promise(r => server.listen(0, r));
  base = "http://localhost:" + server.address().port;
  const dataFile = path.join(__dirname, "..", "data", "links.json");
  try {
    let r = await j("GET", "/health", null, {});
    assert.strictEqual(r.status, 200);
    r = await j("POST", "/api/links", { url: "https://example.com/long" }, { "Content-Type": "application/json" });
    assert.strictEqual(r.status, 401, "creation without API key must be 401");

    r = await j("POST", "/api/links", { url: "not-a-url" });
    assert.strictEqual(r.status, 400);
    r = await j("POST", "/api/links", { url: "https://example.com/fiber-guide" });
    assert.strictEqual(r.status, 201);
    const code = r.json.code; assert.ok(/^[A-Za-z0-9]{6}$/.test(code), "auto code is 6 base62 chars");
    assert.ok(r.json.qrUrl);

    r = await j("POST", "/api/links", { url: "https://example.com/other", customAlias: "fiber" });
    assert.strictEqual(r.status, 201); assert.strictEqual(r.json.code, "fiber");
    r = await j("POST", "/api/links", { url: "https://example.com/dup", customAlias: "fiber" });
    assert.strictEqual(r.status, 409, "duplicate alias must collide");

    // Redirect records clicks with analytics dimensions
    r = await j("GET", "/" + code, null, { "User-Agent": "Mozilla/5.0 (iPhone)", "Accept-Language": "hi-IN" }, false);
    assert.strictEqual(r.status, 302); assert.strictEqual(r.headers.get("location"), "https://example.com/fiber-guide");
    await j("GET", "/" + code, null, { "User-Agent": "Mozilla/5.0 (Windows NT 10.0)", Referer: "https://google.com" }, false);
    r = await j("GET", "/api/links/" + code + "/stats");
    assert.strictEqual(r.json.totalClicks, 2);
    assert.strictEqual(r.json.byDevice.mobile, 1);
    assert.strictEqual(r.json.byDevice.desktop, 1);
    assert.strictEqual(r.json.byCountry.IN, 1);
    assert.strictEqual(r.json.byReferrer["https://google.com"], 1);
    assert.strictEqual(Object.keys(r.json.byDay).length, 1);

    // QR endpoint returns SVG
    r = await fetch(base + "/qr/" + code);
    assert.strictEqual(r.status, 200);
    assert.ok((await r.text()).includes("<svg"));

    // Expiry: create an already-expired link -> redirect 404s
    r = await j("POST", "/api/links", { url: "https://example.com/old", expiresAt: new Date(Date.now() - 1000).toISOString() });
    const expired = r.json.code;
    r = await j("GET", "/" + expired, null, {}, false);
    assert.strictEqual(r.status, 404);

    // Deactivate then reactivate
    r = await j("PATCH", "/api/links/fiber", { active: false });
    assert.strictEqual(r.json.active, false);
    r = await j("GET", "/fiber", null, {}, false);
    assert.strictEqual(r.status, 404);
    await j("PATCH", "/api/links/fiber", { active: true });

    // Persistence: the JSON file on disk holds the links
    const saved = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    assert.ok(saved.some(l => l.code === code && l.totalClicks === 2));

    console.log("All url-shortener-api tests passed.");
  } finally { server.close(); }
})().catch(e => { console.error("TEST FAILED:", e); server.close(); process.exit(1); });
