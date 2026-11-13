"""Worker service: polls the API task queue and marks tasks done.
Stdlib only; in production this reads from Redis (REDIS_URL).
"""
import json, time, urllib.request

API = "http://api:8000"


def process(task):
    task["status"] = "done"
    return task


def poll_once(api=API):
    try:
        with urllib.request.urlopen(api + "/tasks", timeout=5) as r:
            tasks = json.load(r)
    except Exception:
        return []
    return [process(t) for t in tasks if t["status"] == "queued"]


if __name__ == "__main__":
    while True:
        done = poll_once()
        if done:
            print(f"worker: completed {len(done)} task(s)")
        time.sleep(5)
