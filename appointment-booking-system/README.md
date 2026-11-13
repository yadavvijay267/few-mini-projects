# Booking System (Appointments)

Services, availability slots with real-time locking, bookings, reminders, cancellation and rescheduling.

**Portfolio project 32 of 100** — Phase 4 (Expert / Enterprise), Category 4: Full Stack Development.

Built by Clamor. 100% original code, zero-dependency Node.js backend (built-in `http`/`crypto` only).

## Features

- Service catalogue with duration and price
- Availability calendar with real-time slot locking
- Booking confirmation and reminder emails (simulated)
- Cancellation and rescheduling with a 24h-notice policy

## What makes it stand out

Slot locking that prevents double-booking under concurrent requests, with a documented race-condition test.

## Tech stack

- **Frontend:** plain HTML/CSS/JavaScript single-page app (`src/client/`)
- **Backend:** Node.js built-ins only — no `npm install` needed (`src/server/server.js`)
- **Auth:** email + password, SHA-256 salted hash, random session tokens (Node `crypto`)
- **Persistence:** JSON-file store (`data.json`, seeded from `assets/seed.json`). Production path: PostgreSQL + Prisma — the REST shapes stay the same.

## How to run

```bash
node src/server/server.js        # listens on http://localhost:4032
# or
npm start
```

Open http://localhost:4032 and log in with the demo account **demo@example.com / demo1234** (or register a new account).

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/<collection>`, `GET/PUT/DELETE /api/<collection>/:id` (auth required; `Authorization: Bearer <token>`)
- Project-specific endpoints: see `docs/ARCHITECTURE.md`.

Collections:

- `services` — Services
- `providers` — Providers
- `bookings` — Bookings

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
npm test        # starts the server on a test port and exercises the API
```

## License

MIT — see `LICENSE`.
