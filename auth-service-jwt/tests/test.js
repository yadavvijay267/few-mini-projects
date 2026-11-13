// Integration test: full auth lifecycle — register, verify, login, /me,
// role gate, refresh rotation (old token dies), logout, forgot/reset,
// brute-force lockout.
const assert = require("assert");
const server = require("../src/server");
let base;
async function req(method, path, body, token) {
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  const r = await fetch(base + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = JSON.parse(await r.text()); } catch {}
  return { status: r.status, json: j };
}
(async () => {
  await new Promise(r => server.listen(0, r));
  base = "http://localhost:" + server.address().port;
  try {
    let r = await req("GET", "/health");
    assert.strictEqual(r.status, 200);

    r = await req("POST", "/api/auth/register", { name: "Admin", email: "admin@test.dev", password: "secret123", role: "admin" });
    assert.strictEqual(r.status, 201);
    const adminAccess = r.json.accessToken, adminRefresh = r.json.refreshToken;
    assert.ok(r.json.verificationToken, "verification token issued");

    r = await req("POST", "/api/auth/verify-email", { token: r.json.verificationToken });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.verified, true);

    r = await req("GET", "/api/auth/me", null, adminAccess);
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.emailVerified, true);

    r = await req("GET", "/api/admin/users", null, adminAccess);
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.users.length, 1);

    r = await req("POST", "/api/auth/register", { name: "User", email: "u@test.dev", password: "secret123" });
    const userAccess = r.json.accessToken;
    r = await req("GET", "/api/admin/users", null, userAccess);
    assert.strictEqual(r.status, 403, "non-admin must be blocked from /admin");

    // Refresh rotation: first refresh works, the SAME old token must then fail.
    r = await req("POST", "/api/auth/refresh", { refreshToken: adminRefresh });
    assert.strictEqual(r.status, 200); assert.ok(r.json.accessToken);
    const rotatedRefresh = r.json.refreshToken;
    r = await req("POST", "/api/auth/refresh", { refreshToken: adminRefresh });
    assert.strictEqual(r.status, 401, "rotated-out refresh token must be revoked");
    r = await req("POST", "/api/auth/refresh", { refreshToken: rotatedRefresh });
    assert.strictEqual(r.status, 200);

    // Logout revokes the refresh token.
    r = await req("POST", "/api/auth/logout", { refreshToken: rotatedRefresh });
    assert.strictEqual(r.status, 200);
    r = await req("POST", "/api/auth/refresh", { refreshToken: rotatedRefresh });
    assert.strictEqual(r.status, 401, "logged-out refresh token must be revoked");

    // Forgot + reset password, then login with the new password only.
    r = await req("POST", "/api/auth/forgot-password", { email: "u@test.dev" });
    assert.strictEqual(r.status, 200); const resetToken = r.json.resetToken;
    r = await req("POST", "/api/auth/reset-password", { token: resetToken, newPassword: "newsecret123" });
    assert.strictEqual(r.status, 200);
    r = await req("POST", "/api/auth/login", { email: "u@test.dev", password: "secret123" });
    assert.strictEqual(r.status, 401);
    r = await req("POST", "/api/auth/login", { email: "u@test.dev", password: "newsecret123" });
    assert.strictEqual(r.status, 200);

    // Brute-force lockout: 5 bad logins, then even a good one is 429.
    for (let i = 0; i < 5; i++) await req("POST", "/api/auth/login", { email: "u@test.dev", password: "wrong" });
    r = await req("POST", "/api/auth/login", { email: "u@test.dev", password: "newsecret123" });
    assert.strictEqual(r.status, 429, "account must lock after 5 failed logins");

    console.log("All auth-service-jwt tests passed.");
  } finally { server.close(); }
})().catch(e => { console.error("TEST FAILED:", e); server.close(); process.exit(1); });
