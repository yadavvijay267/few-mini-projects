# Task Manager API — Documentation

Base URL: `http://localhost:3001`

## Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/register` | `{ "name", "email", "password" }` (password ≥ 8 chars) | `201 { user, token }` |
| POST | `/api/auth/login` | `{ "email", "password" }` | `200 { user, token }` |

All `/api/tasks` routes need `Authorization: Bearer <token>`. Tokens are
HMAC-SHA256 JWTs (1 hour). Data is isolated per user — you can only see your
own tasks.

## Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List with filters + pagination |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/:id` | Get one task |
| PUT | `/api/tasks/:id` | Update (partial) |
| DELETE | `/api/tasks/:id` | Delete |
| GET | `/health` | Health check |

### List query parameters

`status=todo|in-progress|done`, `priority=low|medium|high`,
`search=<text>`, `sort=createdAt|title|priority|dueDate`,
`order=asc|desc`, `page=1`, `limit=10` (max 100).

Response: `{ "data": [...], "meta": { "total", "page", "limit", "pages" } }`.

### Create a task

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Design fiber route","priority":"high","tags":["fiber"],"dueDate":"2026-11-20"}'
```

### Errors

- `400` invalid JSON, `401` missing/invalid token, `404` not found,
  `409` email already registered, `422` validation errors (with `details` array),
  `429` rate limit (100 requests/minute per IP).

## OpenAPI / Postman

- `docs/openapi.yaml` — OpenAPI 3 spec generated from these routes.
- `assets/postman_collection.json` — import into Postman to try every endpoint.
