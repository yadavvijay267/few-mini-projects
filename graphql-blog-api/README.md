# GraphQL API for a Blog

A GraphQL API for posts, comments, and authors — queries, mutations, and subscriptions — with a hand-written GraphQL parser and executor (Node built-ins only, no dependencies).

## Features
- Queries with filtering/pagination (`posts(first, tag, published)`), single-post lookup, author lookup, and full-text `search`
- Mutations for posts and comments (auth-protected) and author creation
- Subscriptions for new comments via Server-Sent Events (`GET /subscriptions/new-comments`)
- **Standout:** a documented N+1 fix — a batching author loader (DataLoader pattern) cuts author lookups for 3 posts from 3 to 1; the count is in `extensions.authorLoaderBatchCalls` and asserted in tests
- Aliases, variables, nested selection sets, and a small in-browser playground at `/`

## Tech Stack
Node.js built-ins only. Production path is Apollo Server + Prisma + PostgreSQL + JWT (see `docs/SCHEMA.md`).

## How to Run
```bash
node src/server.js
# open http://localhost:3002
```
```bash
curl -X POST localhost:3002/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first: 2) { id title author { name } } }"}'
curl -X POST localhost:3002/graphql -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer demo-token' \
  -d '{"query":"mutation { addComment(postId: \"1\", authorName: \"Ada\", body: \"Great!\") { id } }"}'
```

## Tests
```bash
node tests/test.js
```

## Screenshots
See `screenshots/` — add `playground.png`.

## License
MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
