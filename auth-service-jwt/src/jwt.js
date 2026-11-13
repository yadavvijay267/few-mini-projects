// Real JWT (HMAC-SHA256) + refresh-token rotation. Original implementation,
// Node built-in crypto only.
const crypto = require("crypto");
const SECRET = process.env.JWT_SECRET || "dev-only-auth-secret-change-me";

function b64url(input) { return Buffer.from(input).toString("base64url"); }
function sign(payload, expiresInSec) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const data = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + b64url(JSON.stringify(body));
  return data + "." + crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}
function verify(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(parts[0] + "." + parts[1]).digest("base64url");
  const a = Buffer.from(parts[2]), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")); } catch { return null; }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
// Access tokens live 15 minutes; refresh tokens 7 days and rotate on every use.
const ACCESS_TTL = 15 * 60;
const REFRESH_TTL = 7 * 24 * 60 * 60;
function accessToken(user) { return sign({ sub: user.id, email: user.email, role: user.role }, ACCESS_TTL); }
function newRefreshToken() { return crypto.randomBytes(48).toString("hex"); }
module.exports = { sign, verify, accessToken, newRefreshToken, ACCESS_TTL, REFRESH_TTL };
