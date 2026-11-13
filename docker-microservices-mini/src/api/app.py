"""Task API service (stdlib only). In-memory store; swap the store for
PostgreSQL (DATABASE_URL) without changing the routes.
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

TASKS = []
NEXT_ID = [1]


def create_task(title):
    task = {"id": NEXT_ID[0], "title": title, "status": "queued"}
    NEXT_ID[0] += 1
    TASKS.append(task)
    return task


def list_tasks():
    return list(TASKS)


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"status": "ok"})
        elif self.path == "/tasks":
            self._json(200, list_tasks())
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/tasks":
            return self._json(404, {"error": "not found"})
        n = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(n) or b"{}")
        if not data.get("title"):
            return self._json(400, {"error": "title is required"})
        self._json(201, create_task(data["title"]))

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print("API on http://0.0.0.0:8000")
    HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
