// Test harness: invokes BOTH runtimes directly — the Cloudflare Worker
// fetch handler (with real Request/Response) and the AWS Lambda handler
// (with API Gateway-style events) — plus the scheduled daily summary.
const assert = require("assert");
const worker = require("../src/index");
const lambda = require("../src/lambda");

async function workerReq(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await worker.fetch(new Request("https://worker.test" + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  }), {}, {});
  return { status: res.status, json: await res.json() };
}
async function lambdaReq(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const event = { httpMethod: method, path, headers, body: body ? JSON.stringify(body) : null };
  const res = await lambda.handler(event, {});
  return { status: res.statusCode, json: JSON.parse(res.body) };
}
async function flow(req, label) {
  let r = await req("GET", "/health");
  assert.strictEqual(r.status, 200, label + " health");
  r = await req("GET", "/api/tasks");
  assert.strictEqual(r.status, 401, label + " tasks need auth");
  r = await req("POST", "/api/auth/register", { name: "T", email: "t@test.dev", password: "secret123" });
  assert.strictEqual(r.status, 201, label + " register: " + JSON.stringify(r.json));
  r = await req("POST", "/api/auth/login", { email: "t@test.dev", password: "secret123" });
  assert.strictEqual(r.status, 200);
  const token = r.json.token; assert.ok(token);
  r = await req("POST", "/api/tasks", { title: "Serverless task" }, token);
  assert.strictEqual(r.status, 201);
  const id = r.json.id;
  r = await req("GET", "/api/tasks", null, token);
  assert.strictEqual(r.json.tasks.length, 1);
  r = await req("PATCH", "/api/tasks/" + id, { done: true }, token);
  assert.strictEqual(r.json.done, true);
  r = await req("DELETE", "/api/tasks/" + id, null, token);
  assert.strictEqual(r.status, 200);
  r = await req("GET", "/api/logs", null, token);
  assert.ok(Array.isArray(r.json.logs) && r.json.logs.length > 0, label + " request log");
  console.log(label + " flow passed.");
}
(async () => {
  await flow(workerReq, "Cloudflare Worker");
  await flow(lambdaReq, "AWS Lambda");
  // Scheduled daily summary on both runtimes
  const wSummary = await worker.scheduled({}, {}, {});
  assert.ok(wSummary.date && typeof wSummary.totalTasks === "number", "worker scheduled summary");
  const lSummary = await lambda.scheduledHandler({ source: "aws.events" }, {});
  assert.strictEqual(lSummary.statusCode, 200);
  assert.ok(JSON.parse(lSummary.body).date, "lambda scheduled summary");
  console.log("All serverless-api-workers tests passed.");
})().catch(e => { console.error("TEST FAILED:", e); process.exit(1); });
