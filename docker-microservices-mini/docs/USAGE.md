# Usage — Dockerized Microservices

```bash
docker compose up --build
make up        # same, detached
make test      # offline pytest (API logic + compose validation)
make logs      # follow all services
curl localhost/tasks            # via Nginx on :80 -> /api/tasks
curl localhost:8000/health      # API directly
```

Seeded data: `make seed` creates one task; the worker marks queued
tasks `done` within ~5 seconds. PostgreSQL and Redis run in Compose;
the API/worker fall back to the in-memory store if they are unreachable,
so `python3 src/api/app.py` also works standalone for development.
