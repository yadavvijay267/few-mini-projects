# Real-Time Notification Service — Documentation

Base URL: `http://localhost:3004` · Demo dashboard: `http://localhost:3004/`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/events?userId=<id>` | SSE stream for a user. Replays unread notifications on connect; heartbeat every 25s. |
| POST | `/api/notify` | Send a notification: `{ userId, type, data, priority }`. Priority `low`/`normal`/`high`. Returns `202`. |
| GET/PUT | `/api/users/:id/preferences` | Per-user preferences: `{ channels: ["sse","email","webhook"], digestLowPriority: bool, mutedTypes: [] }`. |
| GET | `/api/users/:id/notifications` | Inbox + `unreadCount`. |
| POST | `/api/notifications/:id/read` | Mark one notification read (`{ userId }` in body). |
| POST | `/api/digest/send` | Flush a user's batched low-priority items as one digest notification. |
| GET | `/api/delivery-log` | Delivery log (latest 100) + dead-letter queue. |
| GET | `/health` | Health + queue/dead-letter counts. |

## Templates

`welcome`, `order-shipped`, `alert`, `reminder` — see `TEMPLATES` in
`src/server.js`. Unknown types fall back to `data.message`.

## Delivery model

1. `POST /api/notify` enqueues a job (in-memory queue).
2. The worker delivers to each enabled channel: SSE (live, or stored as
   unread if the user is offline), email (stub — wire Nodemailer), webhook
   (stub — wire a real POST).
3. Failures retry up to 3 times, then land in the **dead-letter** list
   (visible in `/api/delivery-log`).

## Digest mode

Enable `digestLowPriority: true` in a user's preferences and their
low-priority notifications are batched instead of sent immediately.
`POST /api/digest/send` (or a daily cron in production) delivers one summary
notification containing every batched item.

## Example

```bash
curl -N "localhost:3004/events?userId=alice" &
curl -X POST localhost:3004/api/notify -H 'Content-Type: application/json' \
  -d '{"userId":"alice","type":"order-shipped","data":{"orderId":"ORD-42","tracking":"TRK-1"}}'
```
