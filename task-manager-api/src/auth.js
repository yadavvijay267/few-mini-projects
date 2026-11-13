// Minimal JWT helpers (HMAC-SHA256) — original implementation, no dependencies.
const crypto = require("crypto");
const SECRET = process.env.JWT_SECRET || "dev-only-task-manager-secret-change-me";

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}
function sign(payload, expiresInSec = 3600) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const data = b64url(JSON.stringify(header)) + "." + b64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return data + "." + sig;
}
function verify(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(h + "." + p).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8")); }
  catch { return null; }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
module.exports = { sign, verify };
