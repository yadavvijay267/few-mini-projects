"""Mini streaming pipeline: event generator -> in-memory windowed
processor -> aggregates. Late events and bad events are handled
explicitly (see docs/ARCHITECTURE.md).
"""
import argparse, json, random, sys, time
from collections import Counter, defaultdict
from datetime import datetime, timezone

PAGES = ["/", "/products", "/pricing", "/checkout", "/blog", "/about"]
WINDOW_SECONDS = 60
ALLOWED_LATENESS_SECONDS = 5


def window_start(ts):
    return int(ts // WINDOW_SECONDS) * WINDOW_SECONDS


class EventGenerator:
    """Simulated clicks/orders. `late_probability` injects delayed events."""

    def __init__(self, seed=42, late_probability=0.05):
        self.rng = random.Random(seed)
        self.late_probability = late_probability
        self.n = 0

    def next_event(self, now=None):
        now = now or time.time()
        self.n += 1
        kind = self.rng.choices(["page_view", "click", "order"], weights=[70, 20, 10])[0]
        ts = now
        if self.rng.random() < self.late_probability:
            ts = now - self.rng.randint(10, 400)  # delayed delivery
        event = {"event_id": self.n, "ts": ts, "type": kind,
                 "page": self.rng.choice(PAGES), "user_id": self.rng.randint(1, 500)}
        if kind == "order":
            event["amount"] = round(self.rng.uniform(5, 200), 2)
        return event


def validate(event):
    if not isinstance(event, dict):
        return "event is not an object"
    for field in ("event_id", "ts", "type", "page"):
        if field not in event:
            return f"missing field: {field}"
    if event["type"] not in ("page_view", "click", "order"):
        return f"unknown type: {event['type']}"
    if event["type"] == "order" and event.get("amount", 0) < 0:
        return "negative order amount"
    return None


class StreamProcessor:
    def __init__(self, dead_letter_path=None):
        self.windows = defaultdict(lambda: {"counts": Counter(), "revenue": 0.0, "pages": Counter()})
        self.late_events = []
        self.dead_letter_path = dead_letter_path
        self.dead_letter_count = 0

    def _dead_letter(self, event, reason):
        self.dead_letter_count += 1
        if self.dead_letter_path:
            with open(self.dead_letter_path, "a", encoding="utf-8") as f:
                f.write(json.dumps({"event": event, "reason": reason}) + "\n")

    def process(self, event, now=None):
        now = now or time.time()
        error = validate(event)
        if error:
            self._dead_letter(event, error)
            return "dead_letter"
        start = window_start(event["ts"])
        if now > start + WINDOW_SECONDS + ALLOWED_LATENESS_SECONDS:
            self.late_events.append(event)
            return "late"
        window = self.windows[start]
        window["counts"][event["type"]] += 1
        window["counts"]["total"] += 1
        window["pages"][event["page"]] += 1
        if event["type"] == "order":
            window["revenue"] += event.get("amount", 0.0)
        return "ok"

    def snapshot(self, now=None):
        now = now or time.time()
        out = []
        for start in sorted(self.windows):
            w = self.windows[start]
            out.append({
                "window_start": datetime.fromtimestamp(start, tz=timezone.utc).isoformat(),
                "closed": now > start + WINDOW_SECONDS + ALLOWED_LATENESS_SECONDS,
                "events": w["counts"]["total"],
                "page_views": w["counts"]["page_view"],
                "clicks": w["counts"]["click"],
                "orders": w["counts"]["order"],
                "revenue": round(w["revenue"], 2),
                "top_page": w["pages"].most_common(1)[0][0] if w["pages"] else None,
            })
        return {"windows": out, "late_events": len(self.late_events),
                "dead_letter": self.dead_letter_count}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run the mini streaming pipeline demo (event generator -> windowed aggregates).")
    parser.add_argument("--seconds", type=int, default=30, help="How long to run the demo.")
    parser.add_argument("--rate", type=float, default=5.0, help="Events per second.")
    parser.add_argument("--demo", action="store_true", help="Run the demo (same as default mode).")
    parser.add_argument("--dead-letter", default="dead_letter.jsonl", help="Dead-letter log path.")
    args = parser.parse_args(argv)
    gen = EventGenerator()
    proc = StreamProcessor(dead_letter_path=args.dead_letter)
    interval = 1.0 / args.rate
    end = time.time() + args.seconds
    print(f"Generating ~{args.rate}/s for {args.seconds}s ...")
    try:
        while time.time() < end:
            proc.process(gen.next_event())
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nStopped.")
    snap = proc.snapshot()
    for w in snap["windows"]:
        print(f"{w['window_start']}  events={w['events']} views={w['page_views']} "
              f"clicks={w['clicks']} orders={w['orders']} revenue=${w['revenue']:.2f} "
              f"top={w['top_page']} closed={w['closed']}")
    print(f"Late events: {snap['late_events']} | Dead-letter: {snap['dead_letter']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
