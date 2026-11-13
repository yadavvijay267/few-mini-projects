# Learning Management System (Mini LMS)

Courses, lessons, quizzes, progress tracking, discussions and signed PDF-style certificates with verification.

**Portfolio project 34 of 100** — Phase 4 (Expert / Enterprise), Category 4: Full Stack Development.

Built by Clamor. 100% original code, zero-dependency Node.js backend (built-in `http`/`crypto` only).

## Features

- Course creation with lessons (video/text) and quizzes
- Enrolment, progress tracking, and completion certificates
- Discussion per lesson and instructor dashboard
- Paid courses via Stripe test mode (simulated)

## What makes it stand out

Certificates are generated as signed tokens with a verification URL — anyone can verify a certificate without trusting a screenshot.

## Tech stack

- **Frontend:** plain HTML/CSS/JavaScript single-page app (`src/client/`)
- **Backend:** Node.js built-ins only — no `npm install` needed (`src/server/server.js`)
- **Auth:** email + password, SHA-256 salted hash, random session tokens (Node `crypto`)
- **Persistence:** JSON-file store (`data.json`, seeded from `assets/seed.json`). Production path: PostgreSQL + Prisma — the REST shapes stay the same.

## How to run

```bash
node src/server/server.js        # listens on http://localhost:4034
# or
npm start
```

Open http://localhost:4034 and log in with the demo account **demo@example.com / demo1234** (or register a new account).

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/<collection>`, `GET/PUT/DELETE /api/<collection>/:id` (auth required; `Authorization: Bearer <token>`)
- Project-specific endpoints: see `docs/ARCHITECTURE.md`.

Collections:

- `courses` — Courses
- `lessons` — Lessons
- `enrollments` — Enrolments
- `quizzes` — Quizzes
- `quizAttempts` — Quiz attempts
- `discussions` — Discussions

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
npm test        # starts the server on a test port and exercises the API
```

## License

MIT — see `LICENSE`.
