# File Upload & Image Processing API — Documentation

Base URL: `http://localhost:3003`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Multipart upload, field name `file`. Returns metadata, variants, savings, signed URL. |
| GET | `/api/files` | List uploaded files (fresh signed URLs). |
| GET | `/api/files/:id` | Metadata for one file. |
| GET | `/files/:id/download?exp=...&sig=...` | Download via a signed, expiring URL (default 1 hour). |
| DELETE | `/api/files/:id` | Delete file + metadata. |
| GET | `/health` | Health check. |

## Validation

- **Allowed types:** PNG, JPEG, GIF, WebP only (other types -> `415`).
- **Size limit:** 5 MB (`413` above it).
- **Virus-scan hook point:** `src/server.js` marks where a scanner plugs in
  before the file is saved (stubbed as clean in this demo).

## What the response contains

```json
{
  "id": "...", "originalName": "photo.png", "mime": "image/png",
  "sizeBytes": 182044, "format": "png", "width": 1200, "height": 800,
  "variants": [
    { "name": "thumb", "maxDimension": 150, "width": 150, "height": 100, "format": "webp" },
    { "name": "small", "maxDimension": 480, "width": 480, "height": 320, "format": "webp" },
    { "name": "medium", "maxDimension": 1024, "width": 1024, "height": 683, "format": "webp" }
  ],
  "savings": { "originalBytes": 182044, "estimatedWebpBytes": 136533,
    "estimatedSavedBytes": 45511, "estimatedSavedPercent": 25 },
  "signedUrl": "/files/<id>/download?exp=...&sig=...",
  "signedUrlExpiresInSec": 3600
}
```

Dimensions are read from the real PNG/JPEG file headers (`src/image.js`).
The optimisation pipeline is pure-JS in this repo so it runs with zero
install; **in production, swap `src/image.js` for Sharp** — it performs the
actual resize + WebP conversion and reports exact byte savings, and the API
response shape stays identical.

## Example

```bash
curl -X POST localhost:3003/api/upload -F "file=@photo.png"
curl "localhost:3003/files/<id>/download?exp=<exp>&sig=<sig>" -o photo.png
```
