// Pure-JS image inspection: reads real dimensions from PNG/JPEG headers
// (no dependency). In production, Sharp would do the actual resize/WebP
// conversion; this module plans the same variant set and reports the same
// savings so the API contract is identical.
function inspectPng(buf) {
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20),
    bitDepth: buf[24], colorType: buf[25] };
}
function inspectJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) break;
    const marker = buf[off + 1];
    const len = buf.readUInt16BE(off + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { format: "jpeg", width: buf.readUInt16BE(off + 7), height: buf.readUInt16BE(off + 5),
        bitDepth: buf[off + 4], colorType: "YCbCr" };
    }
    off += 2 + len;
  }
  return { format: "jpeg", width: null, height: null, note: "dimensions not found in SOF segment" };
}
function inspectImage(buf, mime) {
  if (mime === "image/png") { const r = inspectPng(buf); if (r) return r; }
  if (mime === "image/jpeg") { const r = inspectJpeg(buf); if (r) return r; }
  // GIF: width/height at bytes 6-9 (little-endian). WebP: VP8 header parsing
  // is format-specific; dimensions are reported as unknown here.
  if (mime === "image/gif" && buf.length >= 10)
    return { format: "gif", width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  return { format: mime.split("/")[1], width: null, height: null, note: "dimensions not parsed for this format" };
}
// Thumbnail + multi-size plan, preserving aspect ratio, never upscaling.
function planVariants(width, height) {
  const sizes = [{ name: "thumb", max: 150 }, { name: "small", max: 480 }, { name: "medium", max: 1024 }];
  return sizes.map(s => {
    if (!width || !height) return { name: s.name, maxDimension: s.max, width: null, height: null, format: "webp", note: "source dimensions unknown" };
    const scale = Math.min(1, s.max / Math.max(width, height));
    return { name: s.name, maxDimension: s.max, width: Math.round(width * scale), height: Math.round(height * scale), format: "webp" };
  });
}
// WebP typically saves ~25-35% over JPEG and ~25% over PNG at similar quality.
// These are conservative planning estimates; Sharp would measure the real bytes.
function estimateWebpSavings(bytes, mime) {
  const ratio = mime === "image/png" ? 0.25 : mime === "image/jpeg" ? 0.30 : 0.10;
  const saved = Math.round(bytes * ratio);
  return { originalBytes: bytes, estimatedWebpBytes: bytes - saved, estimatedSavedBytes: saved,
    estimatedSavedPercent: Math.round(ratio * 100),
    note: "Estimate only — production Sharp conversion reports exact bytes." };
}
module.exports = { inspectImage, planVariants, estimateWebpSavings };
