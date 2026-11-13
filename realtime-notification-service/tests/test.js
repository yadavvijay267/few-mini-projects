// Integration test: SSE delivery, offline storage + replay, preferences,
// digest batching, read/unread, delivery log.
const assert = require("assert");
const server = require("../src/server");
let base;
function req(method, path, body) {
  return fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}
async function json(method, path, body) { const r = await req(method, path, body); return { status: r.status, json: await r.json() }; }
function connectSse(userId) {
  return new Promise((resolve, reject) => {
    const received = [];
    const ctrl = new AbortController();
    fetch(base + "/events?userId=" + userId, { signal: ctrl.signal }).then(async res => {
      const reader = res.body.getReader();
      const dec = new TextDecoder(); let buf = "";
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf("\n\n")) !== -1) {
              const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
              for (const line of chunk.split("\n")) if (line.startsWith("data: ")) received.push(JSON.parse(line.slice(6)));
            }
          }
        } catch {}
      };
      pump();
      resolve({ received, close: () => ctrl.abort() });
    }).catch(reject);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, r));
  base = "http://localhost:" + server.address().port;
  try {
    let r = await json("GET", "/health");
    assert.strictEqual(r.status, 200);

    const sse = await connectSse("alice");
    await sleep(150);
    r = await json("POST", "/api/notify", { userId: "alice", type: "welcome", data: { name: "Alice" } });
    assert.strictEqual(r.status, 202);
    await sleep(300);
    assert.strictEqual(sse.received.length, 1, "SSE must deliver live: " + JSON.stringify(sse.received));
    assert.ok(sse.received[0].message.includes("Alice"));
    const notifId = sse.received[0].id;
    sse.close();

    // Offline: notify bob (never connected) -> stored as unread, replayed on connect.
    await json("POST", "/api/notify", { userId: "bob", type: "alert", data: { message: "disk 90% full" } });
    await sleep(200);
    r = await json("GET", "/api/users/bob/notifications");
    assert.strictEqual(r.json.unreadCount, 1);
    const sseBob = await connectSse("bob");
    await sleep(300);
    assert.ok(sseBob.received.some(n => n.message.includes("disk 90%")), "unread replay on SSE connect");
    sseBob.close();

    // Mark read
    r = await json("POST", "/api/notifications/" + notifId + "/read", { userId: "alice" });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.read, true);

    // Digest mode: low-priority batched, not delivered live.
    await json("PUT", "/api/users/carol/preferences", { digestLowPriority: true });
    const sseCarol = await connectSse("carol");
    await sleep(150);
    await json("POST", "/api/notify", { userId: "carol", type: "reminder", priority: "low", data: { message: "weekly report" } });
    await sleep(250);
    assert.strictEqual(sseCarol.received.length, 0, "low-priority must be batched in digest mode");
    r = await json("POST", "/api/digest/send", { userId: "carol" });
    assert.strictEqual(r.json.sent, 1);
    await sleep(300);
    assert.ok(sseCarol.received.some(n => n.type === "digest" && n.message.includes("weekly report")));
    sseCarol.close();

    // Delivery log records deliveries
    r = await json("GET", "/api/delivery-log");
    assert.ok(r.json.log.length >= 3);
    assert.ok(r.json.log.some(e => e.status === "delivered" && e.channel === "sse"));

    console.log("All realtime-notification-service tests passed.");
  } finally { server.close(); }
})().catch(e => { console.error("TEST FAILED:", e); server.close(); process.exit(1); });
