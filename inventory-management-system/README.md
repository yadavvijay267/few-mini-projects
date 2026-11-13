# Inventory Management System

Multi-warehouse stock, transfers, low-stock alerts, purchase orders, movement history and valuation.

**Portfolio project 33 of 100** — Phase 4 (Expert / Enterprise), Category 4: Full Stack Development.

Built by Clamor. 100% original code, zero-dependency Node.js backend (built-in `http`/`crypto` only).

## Features

- Multi-warehouse stock levels with transfer between locations
- Low-stock alerts and reorder-point suggestions
- Purchase orders and goods-received notes
- Stock movement history and valuation report

## What makes it stand out

A stock-out risk forecast that predicts which items will run out in the next 30 days.

## Tech stack

- **Frontend:** plain HTML/CSS/JavaScript single-page app (`src/client/`)
- **Backend:** Node.js built-ins only — no `npm install` needed (`src/server/server.js`)
- **Auth:** email + password, SHA-256 salted hash, random session tokens (Node `crypto`)
- **Persistence:** JSON-file store (`data.json`, seeded from `assets/seed.json`). Production path: PostgreSQL + Prisma — the REST shapes stay the same.

## How to run

```bash
node src/server/server.js        # listens on http://localhost:4033
# or
npm start
```

Open http://localhost:4033 and log in with the demo account **demo@example.com / demo1234** (or register a new account).

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/<collection>`, `GET/PUT/DELETE /api/<collection>/:id` (auth required; `Authorization: Bearer <token>`)
- Project-specific endpoints: see `docs/ARCHITECTURE.md`.

Collections:

- `warehouses` — Warehouses
- `items` — Items
- `stock` — Stock levels
- `movements` — Stock movements
- `purchaseOrders` — Purchase orders

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
npm test        # starts the server on a test port and exercises the API
```

## License

MIT — see `LICENSE`.
