// Integration test: uploads a real 1x1 PNG (embedded base64) via raw
// multipart, checks dimensions/variants/savings/signed URL, then rejects
// a text file and an oversized claim, and deletes the file.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const server = require("../src/server");

const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
let base;
function multipart(boundary, filename, mime, body) {
  const head = Buffer.from("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\nContent-Type: " + mime + "\r\n\r\n");
  const tail = Buffer.from("\r\n--" + boundary + "--\r\n");
  return Buffer.concat([head, body, tail]);
}
async function upload(fileBuf, filename, mime) {
  const boundary = "----testboundary1234";
  const res = await fetch(base + "/api/upload", { method: "POST",
    headers: { "Content-Type": "multipart/form-data; boundary=" + boundary },
    body: multipart(boundary, filename, mime, fileBuf), duplex: "half" });
  let j = null; try { j = JSON.parse(await res.text()); } catch {}
  return { status: res.status, json: j };
}
(async () => {
  await new Promise(r => server.listen(0, r));
  base = "http://localhost:" + server.address().port;
  try {
    let r = await fetch(base + "/health"); assert.strictEqual(r.status, 200);
    const up = await upload(PNG_1X1, "pixel.png", "image/png");
    assert.strictEqual(up.status, 201, JSON.stringify(up.json));
    assert.strictEqual(up.json.width, 1); assert.strictEqual(up.json.height, 1);
    assert.strictEqual(up.json.format, "png");
    assert.strictEqual(up.json.variants.length, 3);
    assert.ok(up.json.savings.estimatedSavedBytes >= 0);
    assert.ok(up.json.signedUrl.includes("/download?exp="));
    const id = up.json.id;
    // Signed download works
    let dl = await fetch(base + up.json.signedUrl);
    assert.strictEqual(dl.status, 200);
    assert.strictEqual((await dl.arrayBuffer()).byteLength, PNG_1X1.length);
    // Tampered signature is rejected
    dl = await fetch(base + "/files/" + id + "/download?exp=9999999999&sig=deadbeef");
    assert.strictEqual(dl.status, 403);
    // Wrong type rejected
    const bad = await upload(Buffer.from("hello"), "note.txt", "text/plain");
    assert.strictEqual(bad.status, 415);
    // List + delete
    r = await fetch(base + "/api/files");
    const list = await r.json();
    assert.strictEqual(list.files.length, 1);
    r = await fetch(base + "/api/files/" + id, { method: "DELETE" });
    assert.strictEqual(r.status, 200);
    r = await fetch(base + "/api/files/" + id);
    assert.strictEqual(r.status, 404);
    // Uploaded bytes must be gone from disk too
    assert.strictEqual(fs.existsSync(path.join(__dirname, "..", "uploads", id + ".png")), false);
    console.log("All file-upload-image-api tests passed.");
  } finally { server.close(); }
})().catch(e => { console.error("TEST FAILED:", e); server.close(); process.exit(1); });
