// Real integration test: boots the server on a random port and exercises
// register -> login -> create -> list/filter/paginate -> update -> delete,
// plus validation, auth and per-user isolation checks.
const assert = require("assert");
const server = require("../src/server");

let base;
async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

(async () => {
  await new Promise(r => server.listen(0, r));
  base = "http://localhost:" + server.address().port;
  try {
    let r = await req("GET", "/health");
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.status, "ok");

    r = await req("GET", "/api/tasks");
    assert.strictEqual(r.status, 401, "tasks without token must be 401");

    r = await req("POST", "/api/auth/register", { name: "Tester", email: "a@test.dev", password: "secret123" });
    assert.strictEqual(r.status, 201); const tokenA = r.json.token; assert.ok(tokenA);

    r = await req("POST", "/api/auth/register", { name: "Two", email: "b@test.dev", password: "secret123" });
    const tokenB = r.json.token;

    r = await req("POST", "/api/auth/login", { email: "a@test.dev", password: "wrongpass" });
    assert.strictEqual(r.status, 401);
    r = await req("POST", "/api/auth/login", { email: "a@test.dev", password: "secret123" });
    assert.strictEqual(r.status, 200);

    r = await req("POST", "/api/tasks", { title: "" }, tokenA);
    assert.strictEqual(r.status, 422, "empty title must fail validation");
    r = await req("POST", "/api/tasks", { title: "Bad status", status: "nope" }, tokenA);
    assert.strictEqual(r.status, 422);

    const ids = [];
    for (const t of [
      { title: "Design fiber route", status: "todo", priority: "high", tags: ["fiber"] },
      { title: "QC checklist", status: "in-progress", priority: "medium" },
      { title: "Done thing", status: "done", priority: "low" },
    ]) { r = await req("POST", "/api/tasks", t, tokenA); assert.strictEqual(r.status, 201); ids.push(r.json.id); }

    r = await req("GET", "/api/tasks?status=done", null, tokenA);
    assert.strictEqual(r.json.data.length, 1); assert.strictEqual(r.json.meta.total, 1);
    r = await req("GET", "/api/tasks?search=fiber", null, tokenA);
    assert.strictEqual(r.json.meta.total, 1);
    r = await req("GET", "/api/tasks?page=1&limit=2", null, tokenA);
    assert.strictEqual(r.json.data.length, 2); assert.strictEqual(r.json.meta.pages, 2);

    // per-user isolation: user B must not see user A's task
    r = await req("GET", "/api/tasks/" + ids[0], null, tokenB);
    assert.strictEqual(r.status, 404);

    r = await req("PUT", "/api/tasks/" + ids[0], { status: "done" }, tokenA);
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.status, "done");
    r = await req("DELETE", "/api/tasks/" + ids[2], null, tokenA);
    assert.strictEqual(r.status, 200);
    r = await req("GET", "/api/tasks/" + ids[2], null, tokenA);
    assert.strictEqual(r.status, 404);

    console.log("All task-manager-api tests passed.");
  } finally { server.close(); }
})().catch(e => { console.error("TEST FAILED:", e); server.close(); process.exit(1); });
