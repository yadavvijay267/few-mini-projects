// File Upload & Image Processing API — Node built-ins only.
// Multipart parsing, type/size validation, real image metadata extraction
// (PNG/JPEG dimensions read from file headers), thumbnail-size planning,
// signed expiring download URLs, and a size-savings report per upload.
// Production note: swap the pure-JS pipeline in src/image.js for Sharp;
// the API shape (and the savings report) stays the same.
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { inspectImage, planVariants, estimateWebpSavings } = require("./image");

const PORT = process.env.PORT || 3003;
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const SIGN_SECRET = process.env.SIGN_SECRET || "dev-only-sign-secret-change-me";
const files = new Map(); // id -> record

function send(res, status, obj, type = "application/json") {
  const body = type === "application/json" ? JSON.stringify(obj) : obj;
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}
// Minimal multipart parser (single file field "file" + optional text fields).
function parseMultipart(req, boundary) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => { chunks.push(c); if (Buffer.concat(chunks).length > MAX_BYTES + 65536) req.destroy(new Error("File too large")); });
    req.on("end", () => {
      try {
        const buf = Buffer.concat(chunks);
        const sep = Buffer.from("--" + boundary);
        const parts = [];
        let start = buf.indexOf(sep);
        while (start !== -1) {
          const next = buf.indexOf(sep, start + sep.length);
          if (next === -1) break;
          const chunk = buf.slice(start + sep.length, next);
          const headerEnd = chunk.indexOf("\r\n\r\n");
          if (headerEnd !== -1) {
            const headers = chunk.slice(0, headerEnd).toString("utf8");
            let body = chunk.slice(headerEnd + 4);
            if (body.slice(-2).toString() === "\r\n") body = body.slice(0, -2);
            parts.push({ headers, body });
          }
          start = next;
        }
        resolve(parts);
      } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}
function signedUrl(id, ttlSec = 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = crypto.createHmac("sha256", SIGN_SECRET).update(id + ":" + exp).digest("hex");
  return "/files/" + id + "/download?exp=" + exp + "&sig=" + sig;
}
function verifySigned(id, exp, sig) {
  if (!exp || !sig || Date.now() / 1000 > Number(exp)) return false;
  const expected = crypto.createHmac("sha256", SIGN_SECRET).update(id + ":" + exp).digest("hex");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/health") { send(res, 200, { status: "ok", service: "file-upload-image-api" }); return; }
    if (req.method === "POST" && url.pathname === "/api/upload") {
      const ct = req.headers["content-type"] || "";
      const m = ct.match(/multipart\/form-data;\s*boundary=(.+)/);
      if (!m) { send(res, 400, { error: "Content-Type must be multipart/form-data" }); return; }
      const parts = await parseMultipart(req, m[1].trim());
      const filePart = parts.find(p => /name="file"/.test(p.headers));
      if (!filePart) { send(res, 400, { error: 'No file field named "file" in the upload' }); return; }
      const nameMatch = filePart.headers.match(/filename="([^"]*)"/);
      const originalName = nameMatch ? nameMatch[1] : "upload.bin";
      const typeMatch = filePart.headers.match(/Content-Type:\s*([^\r\n]+)/i);
      const mime = (typeMatch ? typeMatch[1].trim() : "").toLowerCase();
      if (!ALLOWED[mime]) { send(res, 415, { error: "Unsupported file type: " + (mime || "unknown") + ". Allowed: " + Object.keys(ALLOWED).join(", ") }); return; }
      if (filePart.body.length > MAX_BYTES) { send(res, 413, { error: "File exceeds the 5 MB limit" }); return; }
      if (filePart.body.length === 0) { send(res, 400, { error: "Empty file" }); return; }
      // Virus-scan hook point: plug a scanner here before saving.
      // scanBuffer(filePart.body) -> { clean: true } (stubbed: always clean in demo)
      const meta = inspectImage(filePart.body, mime); // real header parsing
      const id = crypto.randomUUID();
      const storedName = id + "." + ALLOWED[mime];
      fs.writeFileSync(path.join(UPLOAD_DIR, storedName), filePart.body);
      const variants = planVariants(meta.width, meta.height);
      const savings = estimateWebpSavings(filePart.body.length, mime);
      const record = { id, originalName, mime, sizeBytes: filePart.body.length,
        ...meta, variants, savings, uploadedAt: new Date().toISOString(),
        signedUrl: signedUrl(id), signedUrlExpiresInSec: 3600 };
      files.set(id, record);
      send(res, 201, record);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/files") {
      send(res, 200, { files: [...files.values()].map(f => ({ ...f, signedUrl: signedUrl(f.id) })) });
      return;
    }
    const dl = url.pathname.match(/^\/files\/([A-Za-z0-9-]+)\/download$/);
    if (req.method === "GET" && dl) {
      const rec = files.get(dl[1]);
      if (!rec) { send(res, 404, { error: "File not found" }); return; }
      if (!verifySigned(dl[1], url.searchParams.get("exp"), url.searchParams.get("sig"))) {
        send(res, 403, { error: "Invalid or expired signed URL — request a fresh one from GET /api/files" }); return;
      }
      const data = fs.readFileSync(path.join(UPLOAD_DIR, rec.id + "." + ALLOWED[rec.mime]));
      res.writeHead(200, { "Content-Type": rec.mime, "Content-Disposition": 'attachment; filename="' + rec.originalName + '"' });
      res.end(data); return;
    }
    const one = url.pathname.match(/^\/api\/files\/([A-Za-z0-9-]+)$/);
    if (one) {
      const rec = files.get(one[1]);
      if (!rec) { send(res, 404, { error: "File not found" }); return; }
      if (req.method === "GET") { send(res, 200, { ...rec, signedUrl: signedUrl(rec.id) }); return; }
      if (req.method === "DELETE") {
        fs.rmSync(path.join(UPLOAD_DIR, rec.id + "." + ALLOWED[rec.mime]), { force: true });
        files.delete(rec.id); send(res, 200, { deleted: true, id: rec.id }); return;
      }
    }
    send(res, 404, { error: "Not found — see docs/API.md" });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});
if (require.main === module) server.listen(PORT, () => console.log("File upload API listening on http://localhost:" + PORT));
module.exports = server;
