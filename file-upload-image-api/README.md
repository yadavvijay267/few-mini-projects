# File Upload & Image Processing API

Accepts image uploads, validates them, extracts real metadata, plans a
thumbnail/multi-size set, and serves files via signed, expiring URLs —
built with **Node.js built-ins only** (zero dependencies).

## Features

- Multipart upload with type validation (PNG/JPEG/GIF/WebP) and a 5 MB limit
- Real metadata extraction — PNG/JPEG dimensions read from file headers
- Automatic thumbnail + multi-size plan (thumb 150 / small 480 / medium 1024,
  aspect-ratio preserved, never upscaled) with a WebP size-savings report
- Signed, expiring download URLs (HMAC, 1-hour default; tampered links 403)
- Virus-scan hook point before files are saved
- List / inspect / delete endpoints

## Tech stack

Node.js (built-in `http` + `crypto` + `fs` only) · files on local disk
(`uploads/`, gitignored) · metadata in memory

> Production note: the image pipeline is pure JS here so the project runs
> with no install. Swap `src/image.js` for Sharp for real resize/WebP
> conversion — the API contract does not change.

## How to run

```bash
node src/server.js          # http://localhost:3003
npm test                    # uploads a real PNG and exercises every endpoint
```

## Quick demo

```bash
curl -X POST localhost:3003/api/upload -F "file=@photo.png"
curl localhost:3003/api/files
```

Full docs: [`docs/API.md`](docs/API.md).

## Screenshots

See [`screenshots/`](screenshots/SCREENSHOTS.md).

## License

MIT — see [LICENSE](LICENSE).
