// AWS Lambda handler variant — src/lambda.js
// Same shared router as the Worker. Deploy with SAM (`template.yaml`) or
// `aws lambda create-function --zip-file ...`. Local test: `npm test` invokes
// this handler with API Gateway-style events.
const { createStore, handle } = require("./shared");

const store = createStore();

async function handler(event, context) {
  const method = event.httpMethod || event.requestContext?.http?.method || "GET";
  const path = event.path || event.requestContext?.http?.path || "/";
  let body = null;
  if (event.body) { try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; } }
  const result = await handle(store, method, path, event.headers || {}, body);
  return { statusCode: result.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.body) };
}

// Scheduled invocation (EventBridge cron -> Lambda): event.source === "aws.events".
async function scheduledHandler(event, context) {
  const summary = store.dailySummary();
  console.log("Daily summary:", JSON.stringify(summary));
  return { statusCode: 200, body: JSON.stringify(summary) };
}

module.exports = { handler, scheduledHandler, _store: store };
