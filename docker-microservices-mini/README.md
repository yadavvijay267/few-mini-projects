# Dockerized Microservices (Mini)

Three small services (API, worker, frontend) in Docker, orchestrated
with Compose, with service discovery.

## Features

- Three services with their own Dockerfiles and a Compose file.
- Nginx as a reverse proxy in front of the API.
- Health checks and restart policies.
- One-command setup (`docker compose up`) with seeded data.
- `Makefile` with `make up`, `make test`, and `make logs` — the whole
  system is operable from three commands.

## Tech stack

- Docker, Docker Compose, Python (API + worker, stdlib only),
  static frontend, Nginx, PostgreSQL + Redis in Compose
  (services use in-memory stand-ins when those are absent).

## How to run

```bash
docker compose up --build     # full system
make up / make test / make logs
python3 -m pytest tests/ -q   # offline: API logic + compose validation
```

## Services

| Service | Port | Role |
|---|---|---|
| api | 8000 | Task API (create/list tasks) |
| worker | — | Consumes the task queue, marks tasks done |
| frontend | 8080 | Static UI calling the API via Nginx |
| nginx | 80 | Reverse proxy |

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## License

MIT — see `LICENSE`.
