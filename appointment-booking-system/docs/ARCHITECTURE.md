# Architecture — Booking System (Appointments)

## Overview

Single-process Node.js app. The server (`src/server/server.js`) serves the static SPA from `src/client/` and a JSON REST API under `/api/`. No external dependencies.

## Data model

Collections (each a JSON array in `data.json`, seeded from `assets/seed.json`):

- `services` — Services
- `providers` — Providers
- `bookings` — Bookings

## API endpoints

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Generic CRUD per collection: `GET/POST /api/<collection>`, `GET/PUT/DELETE /api/<collection>/:id` (Bearer token required)
- `GET /api/ping` — server health check
- Project-specific endpoints are implemented in `handleCustom()` in `src/server/server.js` (search for the route names in the README's standout panel).

## Auth

Passwords are salted SHA-256 hashes (Node `crypto`). Login returns a random 128-bit session token sent as `Authorization: Bearer <token>`. Sessions live in memory; restart the server to invalidate them.

## How to run

```bash
node src/server/server.js   # port 4032 (override with PORT env var)
```

## Production notes

Replace the JSON-file store with PostgreSQL + Prisma, move sessions to signed JWTs with refresh tokens, and put the app behind HTTPS. The REST shapes are designed to survive that swap unchanged.

## Slot-locking / race-condition note

Booking creation checks the slot and reserves it in the same synchronous stretch of code (no `await` between the check and the insert), and an in-memory `slotLocks` set guards the window. Because Node.js runs one event loop, no two requests can interleave inside that stretch — so exactly one of N concurrent requests for the same slot wins. `tests/test.js` proves this with 10 concurrent requests for one slot. In production this lock must live in the database (unique constraint on service+date+time, or `SELECT ... FOR UPDATE`).
