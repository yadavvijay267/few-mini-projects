# Architecture — Real-Time Analytics Pipeline

## Components

1. **Event generator** (`EventGenerator` in `src/pipeline.py`): emits
   events `{event_id, ts, type, page, user_id, amount}`. Types are
   `page_view`, `click`, `order`. Timestamps are event time (when the
   thing happened), which may lag wall-clock time.
2. **Stream processor** (`StreamProcessor`): keeps tumbling 60-second
   windows keyed by window start. For each window it tracks event
   counts by type, revenue (sum of `amount` on orders), and page counts.
   State lives in memory (`dict` of window -> aggregates).
3. **Dashboard server** (`src/server.py`): standard-library HTTP server
   serving `src/dashboard.html` and an `/events` SSE endpoint that
   pushes a snapshot of the current windows every second.
4. **Dead-letter log** (`dead_letter.jsonl`): events that fail
   validation (missing fields, negative amounts, unknown types) are
   written here instead of crashing the pipeline.

## Late-event policy (documented)

- A window is "closed" once wall-clock time passes its end + a **5
  second allowed lateness** grace period.
- An event arriving for a closed window is counted as **late**: it is
  logged (not silently dropped) and excluded from the aggregate, so
  published numbers never change after the fact.
- An event arriving for an open window is merged normally, even if its
  event time is in the past — this is the normal case for delayed
  delivery.

## Production path

In production this design maps directly onto Kafka/Redpanda: the
generator becomes a Kafka producer, windows become Kafka Streams /
Flink tumbling windows with the same allowed-lateness setting, and the
dead-letter log becomes a dead-letter topic. The in-memory version here
keeps the same semantics so the concepts transfer.
