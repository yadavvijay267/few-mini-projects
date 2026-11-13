# Project Management App (Full Stack)

Projects, task boards, team members, deadlines and a live activity feed — with a computed project-health score.

**Portfolio project 27 of 100** — Phase 4 (Expert / Enterprise), Category 4: Full Stack Development.

Built by Clamor. 100% original code, zero-dependency Node.js backend (built-in `http`/`crypto` only).

## Features

- Projects with members, roles and task boards
- Task assignment, due dates, priorities and comments
- Activity feed and overdue-task digest
- Dashboard with project health (on-track / at-risk / overdue)

## What makes it stand out

Project health score computed from overdue tasks and stalled work — a metric managers actually use.

## Tech stack

- **Frontend:** plain HTML/CSS/JavaScript single-page app (`src/client/`)
- **Backend:** Node.js built-ins only — no `npm install` needed (`src/server/server.js`)
- **Auth:** email + password, SHA-256 salted hash, random session tokens (Node `crypto`)
- **Persistence:** JSON-file store (`data.json`, seeded from `assets/seed.json`). Production path: PostgreSQL + Prisma — the REST shapes stay the same.

## How to run

```bash
node src/server/server.js        # listens on http://localhost:4027
# or
npm start
```

Open http://localhost:4027 and log in with the demo account **demo@example.com / demo1234** (or register a new account).

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/<collection>`, `GET/PUT/DELETE /api/<collection>/:id` (auth required; `Authorization: Bearer <token>`)
- Project-specific endpoints: see `docs/ARCHITECTURE.md`.

Collections:

- `projects` — Projects
- `tasks` — Tasks
- `members` — Team members
- `comments` — Comments
- `activities` — Activity feed

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
npm test        # starts the server on a test port and exercises the API
```

## License

MIT — see `LICENSE`.
