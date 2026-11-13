# Architecture — Real-Time Collaborative Document Editor

## Overview

Single-process Node.js app. The server (`src/server/server.js`) serves the static SPA from `src/client/` and a JSON REST API under `/api/`. No external dependencies.

## Data model

Collections (each a JSON array in `data.json`, seeded from `assets/seed.json`):

- `documents` — Documents
- `versions` — Version history

## API endpoints

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Generic CRUD per collection: `GET/POST /api/<collection>`, `GET/PUT/DELETE /api/<collection>/:id` (Bearer token required)
- `GET /api/ping` — server health check
- Project-specific endpoints are implemented in `handleCustom()` in `src/server/server.js` (search for the route names in the README's standout panel).

## Auth

Passwords are salted SHA-256 hashes (Node `crypto`). Login returns a random 128-bit session token sent as `Authorization: Bearer <token>`. Sessions live in memory; restart the server to invalidate them.

## How to run

```bash
node src/server/server.js   # port 4029 (override with PORT env var)
```

## Production notes

Replace the JSON-file store with PostgreSQL + Prisma, move sessions to signed JWTs with refresh tokens, and put the app behind HTTPS. The REST shapes are designed to survive that swap unchanged.

## Honest note on real-time sync

This editor does **not** implement a full CRDT (Yjs). Sync is: SSE push of the whole document every 2 seconds + **last-writer-wins per paragraph** on edit (paragraphs are split on blank lines; an edit to paragraph N never touches other paragraphs). Presence is an in-memory heartbeat map (30s expiry). Offline edits are queued in `localStorage` and replayed on the `online` event. That merges cleanly for the common case (two people editing different paragraphs) but can lose a conflicting edit to the *same* paragraph — a real CRDT would preserve both. The production path is Yjs + a WebSocket server.
