# Real-Time Collaborative Document Editor

Google-Docs-lite: live editing, presence avatars, version history, sharing links and offline-first sync.

**Portfolio project 29 of 100** — Phase 4 (Expert / Enterprise), Category 4: Full Stack Development.

Built by Clamor. 100% original code, zero-dependency Node.js backend (built-in `http`/`crypto` only).

## Features

- Real-time collaborative editing with live sync (SSE)
- Live cursors and presence avatars showing who is where
- Document list, sharing links, and version history
- Offline editing that syncs on reconnect

## What makes it stand out

Offline-first editing — edits made offline merge cleanly when you reconnect (last-writer-wins per paragraph; see docs for the honest CRDT simplification).

## Tech stack

- **Frontend:** plain HTML/CSS/JavaScript single-page app (`src/client/`)
- **Backend:** Node.js built-ins only — no `npm install` needed (`src/server/server.js`)
- **Auth:** email + password, SHA-256 salted hash, random session tokens (Node `crypto`)
- **Persistence:** JSON-file store (`data.json`, seeded from `assets/seed.json`). Production path: PostgreSQL + Prisma — the REST shapes stay the same.

## How to run

```bash
node src/server/server.js        # listens on http://localhost:4029
# or
npm start
```

Open http://localhost:4029 and log in with the demo account **demo@example.com / demo1234** (or register a new account).

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/<collection>`, `GET/PUT/DELETE /api/<collection>/:id` (auth required; `Authorization: Bearer <token>`)
- Project-specific endpoints: see `docs/ARCHITECTURE.md`.

Collections:

- `documents` — Documents
- `versions` — Version history

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
npm test        # starts the server on a test port and exercises the API
```

## License

MIT — see `LICENSE`.
