// Unit + smoke tests for the demo app (no external test framework).
const assert = require("assert");
const { add, average, formatUptime } = require("../src/math");
const server = require("../src/app");
assert.strictEqual(add(2, 3), 5);
assert.strictEqual(add(-1, 1), 0);
assert.strictEqual(average([2, 4, 6]), 4);
assert.throws(() => average([]), /non-empty/);
assert.strictEqual(formatUptime(3661), "1h 1m 1s");
assert.strictEqual(formatUptime(45), "0h 0m 45s");
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = "http://localhost:" + server.address().port;
  try {
    let r = await fetch(base + "/health");
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await r.json()).status, "ok");
    r = await fetch(base + "/api/add?a=4&b=6");
    assert.strictEqual(r.status, 200);
    const j = await r.json();
    assert.strictEqual(j.sum, 10); assert.strictEqual(j.average, 5);
    r = await fetch(base + "/api/add?a=x&b=1");
    assert.strictEqual(r.status, 400);
    r = await fetch(base + "/nope");
    assert.strictEqual(r.status, 404);
    console.log("All cicd demo-app tests passed.");
  } finally { server.close(); }
})().catch(e => { console.error("TEST FAILED:", e); server.close(); process.exit(1); });
