# Social Media App (Mini)

Posts, likes, comments, reposts, follows, notifications and a ranked feed.

**Portfolio project 31 of 100** — Phase 4 (Expert / Enterprise), Category 4: Full Stack Development.

Built by Clamor. 100% original code, zero-dependency Node.js backend (built-in `http`/`crypto` only).

## Features

- Posts with likes, comments, and reposts
- Follow/unfollow with a personalised feed
- Notifications for likes, comments, and follows
- Profile pages with follower counts and post history

## What makes it stand out

Feed-quality ranking that mixes recency with engagement instead of pure chronological order.

## Tech stack

- **Frontend:** plain HTML/CSS/JavaScript single-page app (`src/client/`)
- **Backend:** Node.js built-ins only — no `npm install` needed (`src/server/server.js`)
- **Auth:** email + password, SHA-256 salted hash, random session tokens (Node `crypto`)
- **Persistence:** JSON-file store (`data.json`, seeded from `assets/seed.json`). Production path: PostgreSQL + Prisma — the REST shapes stay the same.

## How to run

```bash
node src/server/server.js        # listens on http://localhost:4031
# or
npm start
```

Open http://localhost:4031 and log in with the demo account **demo@example.com / demo1234** (or register a new account).

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/<collection>`, `GET/PUT/DELETE /api/<collection>/:id` (auth required; `Authorization: Bearer <token>`)
- Project-specific endpoints: see `docs/ARCHITECTURE.md`.

Collections:

- `posts` — Posts
- `comments` — Comments
- `follows` — Follows
- `notifications` — Notifications

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
npm test        # starts the server on a test port and exercises the API
```

## License

MIT — see `LICENSE`.
