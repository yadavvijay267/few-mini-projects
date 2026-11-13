# Task Manager API

A complete REST API for tasks: CRUD, filtering, sorting, pagination, JWT
authentication with per-user data isolation, input validation, rate limiting,
and request logging — built with **Node.js built-ins only** (zero dependencies,
no `npm install` needed).

## Features

- Full CRUD for tasks with `status` (`todo` / `in-progress` / `done`) and
  `priority` (`low` / `medium` / `high`), tags, and due dates
- Filtering (`status`, `priority`, free-text `search`), sorting, and pagination
- JWT authentication (real HMAC-SHA256 tokens) and per-user data isolation
- Input validation with clear `422` error responses listing every problem
- Rate limiting (100 requests/minute per IP) and request logging
- OpenAPI spec (`docs/openapi.yaml`) and a Postman collection
  (`assets/postman_collection.json`) committed in the repo

## Tech stack

Node.js (built-in `http` + `crypto` only) · in-memory store (swap `src/store.js`
for SQLite/PostgreSQL) · scrypt password hashing · HMAC-SHA256 JWT

## How to run

```bash
node src/server.js          # listens on http://localhost:3001
PORT=4000 node src/server.js
npm test                    # boots the server and runs the integration tests
```

Set `JWT_SECRET` in production (`.env` — see `.env.example`).

## Quick demo

```bash
# register + save the token
TOKEN=$(curl -s -X POST localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Tester","email":"a@test.dev","password":"secret123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

curl -X POST localhost:3001/api/tasks -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Design fiber route","priority":"high","tags":["fiber"]}'

curl "localhost:3001/api/tasks?status=todo&page=1&limit=10" -H "Authorization: Bearer $TOKEN"
```

Full endpoint docs: [`docs/API.md`](docs/API.md).

## Screenshots

See [`screenshots/`](screenshots/SCREENSHOTS.md) — terminal demo and test run.

## License

MIT — see [LICENSE](LICENSE).
