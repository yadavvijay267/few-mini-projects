// Authentication microservice: register, login, refresh-token rotation with a
// revocation list, logout, email verification, password reset, role-based
// access (admin/user), and brute-force login throttling. Node built-ins only.
const http = require("http");
const crypto = require("crypto");
const jwt = require("./jwt");

const PORT = process.env.PORT || 3002;
const users = new Map();          // id -> user
const byEmail = new Map();        // email -> id
const refreshTokens = new Map();  // tokenHash -> { userId, expiresAt, revoked }
const revokedAccess = new Set();  // revoked access-token jtis (logout)
const resetTokens = new Map();    // tokenHash -> { userId, expiresAt }
const verifyTokens = new Map();   // tokenHash -> { userId, expiresAt }
const loginAttempts = new Map();  // email -> { count, lockedUntil }

function hash(str) { return crypto.createHash("sha256").update(str).digest("hex"); }
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString("hex"); }
function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => { if (!d) return resolve({}); try { resolve(JSON.parse(d)); } catch { reject(new Error("Invalid JSON body")); } });
    req.on("error", reject);
  });
}
function publicUser(u) { return { id: u.id, email: u.email, name: u.name, role: u.role, emailVerified: u.emailVerified, createdAt: u.createdAt }; }
function issueTokens(user) {
  const access = jwt.accessToken(user);
  const refresh = jwt.newRefreshToken();
  refreshTokens.set(hash(refresh), { userId: user.id, expiresAt: Date.now() + jwt.REFRESH_TTL * 1000, revoked: false });
  return { accessToken: access, refreshToken: refresh, expiresIn: jwt.ACCESS_TTL, tokenType: "Bearer" };
}
// Brute-force protection: 5 failed logins -> lock the account for 15 minutes.
function loginLocked(email) {
  const a = loginAttempts.get(email);
  return a && a.lockedUntil && Date.now() < a.lockedUntil;
}
function recordFailedLogin(email) {
  const a = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  a.count += 1;
  if (a.count >= 5) { a.lockedUntil = Date.now() + 15 * 60 * 1000; a.count = 0; }
  loginAttempts.set(email, a);
}
function authUser(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  const payload = jwt.verify(h.slice(7));
  if (!payload) return null;
  const user = users.get(payload.sub);
  return user || null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/health") { send(res, 200, { status: "ok", service: "auth-service-jwt" }); return; }
    if (req.method === "POST" && url.pathname === "/api/auth/register") {
      const b = await readBody(req);
      if (!b.email || !b.password || !b.name) { send(res, 400, { error: "name, email and password are required" }); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) { send(res, 400, { error: "Invalid email format" }); return; }
      if (String(b.password).length < 8) { send(res, 400, { error: "Password must be at least 8 characters" }); return; }
      if (byEmail.has(b.email)) { send(res, 409, { error: "Email already registered" }); return; }
      const salt = crypto.randomBytes(16).toString("hex");
      const user = { id: crypto.randomUUID(), email: b.email, name: b.name, role: b.role === "admin" ? "admin" : "user",
        salt, passwordHash: hashPassword(b.password, salt), emailVerified: false, createdAt: new Date().toISOString() };
      users.set(user.id, user); byEmail.set(user.email, user.id);
      // Email verification: in production this token is emailed (Nodemailer/Ethereal).
      // Here it is returned once so the flow is testable without an SMTP server.
      const vToken = crypto.randomBytes(32).toString("hex");
      verifyTokens.set(hash(vToken), { userId: user.id, expiresAt: Date.now() + 24 * 3600 * 1000 });
      send(res, 201, { user: publicUser(user), ...issueTokens(user), verificationToken: vToken, note: "In production the verification token is sent by email, not returned." });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      const b = await readBody(req);
      if (loginLocked(b.email || "")) { send(res, 429, { error: "Too many failed logins — account locked for 15 minutes" }); return; }
      const user = users.get(byEmail.get(b.email || "") || "");
      const ok = user && crypto.timingSafeEqual(Buffer.from(hashPassword(b.password || "", user.salt)), Buffer.from(user.passwordHash));
      if (!ok) { recordFailedLogin(b.email || ""); send(res, 401, { error: "Invalid email or password" }); return; }
      loginAttempts.delete(b.email);
      send(res, 200, { user: publicUser(user), ...issueTokens(user) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/refresh") {
      const b = await readBody(req);
      const rec = refreshTokens.get(hash(b.refreshToken || ""));
      if (!rec || rec.revoked || rec.expiresAt < Date.now()) { send(res, 401, { error: "Invalid or expired refresh token" }); return; }
      // ROTATION: the old refresh token is revoked the moment a new pair is issued.
      rec.revoked = true;
      const user = users.get(rec.userId);
      if (!user) { send(res, 401, { error: "User no longer exists" }); return; }
      send(res, 200, { user: publicUser(user), ...issueTokens(user) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      const b = await readBody(req);
      const rec = refreshTokens.get(hash(b.refreshToken || ""));
      if (rec) rec.revoked = true; // revocation list entry
      send(res, 200, { loggedOut: true });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/verify-email") {
      const b = await readBody(req);
      const rec = verifyTokens.get(hash(b.token || ""));
      if (!rec || rec.expiresAt < Date.now()) { send(res, 400, { error: "Invalid or expired verification token" }); return; }
      verifyTokens.delete(hash(b.token));
      users.get(rec.userId).emailVerified = true;
      send(res, 200, { verified: true });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/forgot-password") {
      const b = await readBody(req);
      const user = users.get(byEmail.get(b.email || "") || "");
      // Always answer 200 so attackers cannot probe which emails exist.
      if (user) {
        const t = crypto.randomBytes(32).toString("hex");
        resetTokens.set(hash(t), { userId: user.id, expiresAt: Date.now() + 60 * 60 * 1000 });
        send(res, 200, { message: "If the email exists, a reset link was sent.", resetToken: t, note: "Demo only: token returned here; in production it is emailed." });
        return;
      }
      send(res, 200, { message: "If the email exists, a reset link was sent." });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
      const b = await readBody(req);
      const rec = resetTokens.get(hash(b.token || ""));
      if (!rec || rec.expiresAt < Date.now()) { send(res, 400, { error: "Invalid or expired reset token" }); return; }
      if (!b.newPassword || String(b.newPassword).length < 8) { send(res, 400, { error: "New password must be at least 8 characters" }); return; }
      const user = users.get(rec.userId);
      user.salt = crypto.randomBytes(16).toString("hex");
      user.passwordHash = hashPassword(b.newPassword, user.salt);
      resetTokens.delete(hash(b.token));
      // Invalidate every refresh token the user holds after a password reset.
      for (const r of refreshTokens.values()) if (r.userId === user.id) r.revoked = true;
      send(res, 200, { reset: true });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      const user = authUser(req);
      if (!user) { send(res, 401, { error: "Missing or invalid Bearer token" }); return; }
      send(res, 200, publicUser(user)); return;
    }
    if (req.method === "GET" && url.pathname === "/api/admin/users") {
      const user = authUser(req);
      if (!user) { send(res, 401, { error: "Missing or invalid Bearer token" }); return; }
      if (user.role !== "admin") { send(res, 403, { error: "Admin role required" }); return; }
      send(res, 200, { users: [...users.values()].map(publicUser) }); return;
    }
    send(res, 404, { error: "Not found — see docs/API.md" });
  } catch (err) {
    send(res, err.message === "Invalid JSON body" ? 400 : 500, { error: err.message });
  }
});
if (require.main === module) server.listen(PORT, () => console.log("Auth service listening on http://localhost:" + PORT));
module.exports = server;
